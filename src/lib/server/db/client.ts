import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from './generated/client'

/* ―― » The database, tenant-isolated by Postgres row-level security ( ported from
        billing-app ). The app connects as app_rls — never the owner, never a superuser —
        so every policy applies. Each request runs inside a tenant scope ( hooks.server.ts );
        `db` sets that tenant as the first statement of each query's transaction, and the
        policies show only that tenant's rows. Outside a scope, `db` throws.

          db.user.findMany()                      // this request's tenant only
          tenantTransaction( async( tx ) => … )   // several statements, one transaction
          runWithTenant( tenant, () => … )        // scripts, jobs: pick the tenant

        Read env through process.env, not $env: seed scripts import this outside SvelteKit. */

// Test knob: the PGlite harness pins one connection so its SET ROLE covers every query.
const poolMax = process.env.DATABASE_POOL_MAX ? Number( process.env.DATABASE_POOL_MAX ) : undefined

const adapter = new PrismaPg( {
	connectionString: process.env.DATABASE_URL,
	...( poolMax ? { max: poolMax, idleTimeoutMillis: 0 } : {} )
} )

// Unscoped: control-plane reads ( tenants ) and the RLS checks. Tenant data goes through `db`.
export const prisma = new PrismaClient( { adapter } )

export type TenantRef = { id : string, slug : string, name : string }

// The current scope's tenant. A resolver, so a request that never touches the database
// never looks its tenant up ( the dev playground runs with no database at all ).
const scope = new AsyncLocalStorage<() => Promise<TenantRef>>()

// Run `fn` with `tenant` in scope. Awaited INSIDE: a Prisma query is lazy, and one handed
// back un-awaited would run after the scope closed.
export function runWithTenant<T>( tenant : TenantRef | ( () => Promise<TenantRef> ), fn : () => T ) : Promise<Awaited<T>> {
	const resolve = typeof tenant === 'function' ? tenant : () => Promise.resolve( tenant )

	return scope.run( resolve, async() : Promise<Awaited<T>> => await fn() )
}

export async function currentTenant() : Promise<TenantRef> {
	const resolve = scope.getStore()

	if ( !resolve )
		throw new Error( 'No tenant in scope. Requests get one from hooks.server.ts; elsewhere wrap the work in runWithTenant().' )

	return resolve()
}

// Transaction-local ( `true` ): can't leak to the next transaction on a pooled connection.
const setTenant = ( client : Pick<Prisma.TransactionClient, '$executeRaw'>, tenantId : string ) =>
	client.$executeRaw`SELECT set_config( 'app.current_tenant', ${ tenantId }, true )`

// Every model operation becomes [ set tenant, query ] in one transaction. Not for raw SQL or
// interactive transactions — use tenantTransaction() for those.
// ponytail: one BEGIN/COMMIT per query; batch with tenantTransaction() on hot paths.
export const db = prisma.$extends( {
	query: {
		$allModels: {
			async $allOperations( { model, args, query } ) {
				if ( model === 'Tenant' )
					return query( args )

				const { id } = await currentTenant()
				const [ , result ] = await prisma.$transaction( [ setTenant( prisma, id ), query( args ) ] )

				return result
			}
		}
	}
} )

// Several statements in one transaction, scoped to the current tenant.
export async function tenantTransaction<T>(
	fn : ( tx : Prisma.TransactionClient ) => Promise<T>,
	options ?: { timeout ?: number, maxWait ?: number }
) : Promise<T> {
	const { id } = await currentTenant()

	return prisma.$transaction( async( tx ) => {
		await setTenant( tx, id )

		return fn( tx )
	}, options )
}

// A superuser or BYPASSRLS role silently ignores every policy. Refuse to run as one.
export async function assertRlsRole() : Promise<void> {
	const [ role ] = await prisma.$queryRaw<{ rolsuper : boolean, rolbypassrls : boolean }[]>`
		SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`

	if ( !role || role.rolsuper || role.rolbypassrls )
		throw new Error( 'Unsafe database role: the app must connect as app_rls ( not a superuser, no BYPASSRLS ), or row-level security is off. Check DATABASE_URL.' )
}
