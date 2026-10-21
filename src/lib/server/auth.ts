import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin as adminPlugin } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { APP } from '$lib/config'
import { ac, DEFAULT_ROLE, roles } from '$lib/permissions'
import { db, tenantTransaction } from '$lib/server/db'
import type { PrismaClient } from '$lib/server/db/generated/client'

/* ―― » better-auth on the tenant-scoped database: users, sessions and accounts are rows
        of the request's tenant, so a session from one tenant does not exist in another
        and the same email can sign up separately in each.

        Email + password, scrypt hashing ( better-auth's default ), roles from
        $lib/permissions via the admin plugin. Sign-up is OFF unless AUTH_SIGNUP=true —
        the fundraiser app shipped with it on and any visitor became a user.

        Env: BETTER_AUTH_SECRET ( ≥ 32 chars ), BETTER_AUTH_URL ( single tenancy ),
        AUTH_SIGNUP. Shared tenancy derives the base URL from each request's host; unknown
        hosts never get this far ( tenant resolution 404s them on the first query ). */

// better-auth's adapter wants a Prisma client. Give it the tenant-scoped one, with
// $transaction opening a tenant transaction — the scoped client can't nest one itself.
const authDb = new Proxy( db, {
	get: ( target, key, receiver ) => ( key === '$transaction'
		? ( fn : Parameters<typeof tenantTransaction>[0] ) => tenantTransaction( fn )
		: Reflect.get( target, key, receiver ) )
} ) as unknown as PrismaClient

export const signUpEnabled = () => process.env.AUTH_SIGNUP === 'true'

function secret() : string {
	const value = process.env.BETTER_AUTH_SECRET ?? ''

	if ( value.length < 32 )
		throw new Error( 'BETTER_AUTH_SECRET must be at least 32 characters ( bunx @better-auth/cli secret, or openssl rand -base64 32 ).' )

	return value
}

// `cookies: false` for code that runs outside a SvelteKit request ( tests, scripts ).
export function createAuth( { cookies = true } : { cookies ?: boolean } = {} ) {
	const shared = process.env.TENANCY === 'shared'

	return betterAuth( {
		appName : APP.name,
		secret  : secret(),
		baseURL : shared ? { allowedHosts: [ '*' ], protocol: 'auto' } : process.env.BETTER_AUTH_URL,
		database: prismaAdapter( authDb, { provider: 'postgresql' } ),
		emailAndPassword: {
			enabled          : true,
			disableSignUp    : !signUpEnabled(),
			minPasswordLength: 10
		},
		advanced: {
			// Ids come from the database ( uuidv7() ).
			database : { generateId: false },
			// Behind a proxy that OVERWRITES x-forwarded-for ( see the Caddy config ), this
			// is the real client IP for the rate limiter. Otherwise it is spoofable.
			ipAddress: { ipAddressHeaders: [ 'x-forwarded-for' ] }
		},
		// Per-IP budgets, stored per tenant. On in production only ( better-auth's default ).
		rateLimit: {
			storage    : 'database',
			customRules: {
				'/sign-in/email' : { window: 60, max: 10 },
				'/sign-up/email' : { window: 60, max: 5 },
				'/change-password': { window: 60, max: 5 }
			}
		},
		telemetry: { enabled: false },
		plugins  : [
			adminPlugin( { ac, roles, defaultRole: DEFAULT_ROLE, allowImpersonatingAdmins: false } ),
			// Lets form actions sign in / out ( sets cookies on the SvelteKit event ). Last.
			...( cookies ? [ sveltekitCookies( getRequestEvent ) ] : [] )
		]
	} satisfies BetterAuthOptions )
}

let instance : ReturnType<typeof createAuth> | undefined

// Built on first use, so routes that never need auth don't need its env either.
export const auth = () => ( instance ??= createAuth() )

export type Session = NonNullable<Awaited<ReturnType<ReturnType<typeof createAuth>['api']['getSession']>>>
