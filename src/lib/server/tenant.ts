import { error } from '@sveltejs/kit'
import { assertRlsRole, prisma, type TenantRef } from '$lib/server/db'

/* ―― » Which tenant a request belongs to — the tenancy switch ( TENANCY in .env ):
          single — one tenant, TENANT_SLUG ( default "default" ). Also the per-client
                   deploy: same code, one tenant per database.
          shared — many tenants, picked by host: a tenant's custom `domain`, else
                   <slug>.APP_DOMAIN.
        Either way the data model is the same ( tenant_id + RLS ), so moving from single
        to shared is configuration, not a migration. */

export type Tenancy = 'single' | 'shared'

export const tenancy = () : Tenancy => ( process.env.TENANCY === 'shared' ? 'shared' : 'single' )

// Lowercase host without port or trailing dot; IPv6 literals keep their brackets.
export function normaliseHost( host : string ) : string {
	const lower = host.trim().toLowerCase()
	const bare = lower.startsWith( '[' ) ? lower.slice( 0, lower.indexOf( ']' ) + 1 ) : lower.replace( /:\d+$/, '' )

	return bare.replace( /\.$/, '' )
}

// The single-label subdomain of `appDomain`, or undefined ( "acme.app.test" → "acme" ).
export function subdomainOf( host : string, appDomain : string ) : string | undefined {
	const suffix = `.${ normaliseHost( appDomain ) }`

	if ( !host.endsWith( suffix ) )
		return undefined

	const label = host.slice( 0, -suffix.length )

	return label && !label.includes( '.' ) ? label : undefined
}

const TTL_MS = 60_000
const cache = new Map<string, { tenant : TenantRef, expires : number }>()

// Checked once, before the first query ( retried if the database wasn't up yet ).
let roleCheck : Promise<void> | undefined

function ensureSafeRole() : Promise<void> {
	roleCheck ??= assertRlsRole().catch( ( reason ) => {
		roleCheck = undefined
		throw reason
	} )

	return roleCheck
}

export async function resolveTenant( url : URL ) : Promise<TenantRef> {
	const mode = tenancy()
	const host = normaliseHost( url.host )
	const slug = process.env.TENANT_SLUG || 'default'
	const key = mode === 'single' ? `slug:${ slug }` : `host:${ host }`
	const hit = cache.get( key )

	if ( hit && hit.expires > Date.now() )
		return hit.tenant

	await ensureSafeRole()

	const sub = subdomainOf( host, process.env.APP_DOMAIN || 'localhost' )
	const row = mode === 'single'
		? await prisma.tenant.findUnique( { where: { slug } } )
		: await prisma.tenant.findFirst( { where: { OR: [ { domain: host }, ...( sub ? [ { slug: sub } ] : [] ) ] } } )

	if ( !row || row.status !== 'active' ) {
		// single: a setup problem, say how to fix it. shared: an unknown host is a 404.
		if ( mode === 'single' )
			error( 503, `No active tenant "${ slug }". Run: bun run db:setup` )

		error( 404, 'Not found' )
	}

	const tenant = { id: row.id, slug: row.slug, name: row.name }

	cache.set( key, { tenant, expires: Date.now() + TTL_MS } )

	return tenant
}

// Test seam: forget cached tenants and the role check.
export function resetTenantState() : void {
	cache.clear()
	roleCheck = undefined
}
