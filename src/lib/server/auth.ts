import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin as adminPlugin } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { APP } from '#lib/config.js'
import { ac, DEFAULT_ROLE, roles } from '#lib/permissions.js'
import { log } from '#lib/server/log.js'
import { SOCIAL_LABELS, type SocialProvider } from '#lib/social.js'
import { audit, type AuditEntry } from '#lib/server/audit.js'
import { currentTenant, db, tenantTransaction } from '#lib/server/db/index.js'
import type { PrismaClient } from '#lib/server/db/generated/client.js'
import { sendMail } from '#lib/server/mail/gate.js'
import { notify } from '#lib/server/notifications/gate.js'
import { afterAuth, beforeAuth, CLIENT_IP } from '#lib/server/sign-in-guard.js'
import { recordSignIn } from '#lib/server/sign-ins.js'
import { socialProviders } from '#lib/server/social.js'
import { appUrl } from '#lib/server/url.js'

/* ―― » better-auth on the tenant-scoped database: users, sessions and accounts are rows
        of the request's tenant, so a session from one tenant does not exist in another
        and the same email can sign up separately in each.

        Email + password, scrypt hashing ( better-auth's default ), roles from
        #lib/permissions via the admin plugin. Sign-up is OFF unless AUTH_SIGNUP=true —
        the fundraiser app shipped with it on and any visitor became a user. With it on,
        a new account must verify its email before it can sign in. Reset, verification and
        invite links go out through the workspace's mail ( #lib/server/mail ).

        Env: BETTER_AUTH_SECRET ( ≥ 32 chars ), BETTER_AUTH_URL ( single tenancy ),
        AUTH_SIGNUP. Shared tenancy derives the base URL from each request's host; unknown
        hosts never get this far ( tenant resolution 404s them on the first query ). */

type UserUpdate = { where : Record<string, unknown> }

/* ―― » better-auth's schema calls user.email unique, so some writes go `where: { email }`
        ( verifying an email does ). Here it is unique per TENANT, which Prisma only accepts
        spelled out as the compound key — so that one shape is rewritten, everything else
        passes through. */
function emailPerTenant<C extends object>( client : C ) : C {
	return new Proxy( client, {
		get: ( target, key, receiver ) => {
			const value = Reflect.get( target, key, receiver )

			if ( key !== 'user' )
				return value

			const users = value as { update : ( args : UserUpdate ) => Promise<unknown> }

			return new Proxy( users, {
				get: ( model, method, modelReceiver ) => ( method === 'update'
					? async( args : UserUpdate ) => {
						const { email, ...rest } = args.where

						return users.update( typeof email === 'string' && !( 'id' in rest ) && !( 'tenantId_email' in rest )
							? { ...args, where: { ...rest, tenantId_email: { tenantId: ( await currentTenant() ).id, email } } }
							: args )
					}
					: Reflect.get( model, method, modelReceiver ) )
			} )
		}
	} )
}

// better-auth's adapter wants a Prisma client. Give it the tenant-scoped one, with
// $transaction opening a tenant transaction — the scoped client can't nest one itself.
const authDb = new Proxy( emailPerTenant( db ), {
	get: ( target, key, receiver ) => ( key === '$transaction'
		? ( fn : Parameters<typeof tenantTransaction>[0] ) => tenantTransaction( ( tx ) => fn( emailPerTenant( tx ) ) )
		: Reflect.get( target, key, receiver ) )
} ) as unknown as PrismaClient

export const signUpEnabled = () => process.env.AUTH_SIGNUP === 'true'

function secret() : string {
	const value = process.env.BETTER_AUTH_SECRET ?? ''

	if ( value.length < 32 )
		throw new Error( 'BETTER_AUTH_SECRET must be at least 32 characters ( bunx @better-auth/cli secret, or openssl rand -base64 32 ).' )

	return value
}

// The trail for what happens at a provider's callback, where no handler of ours runs. Outside
// a request ( tests, scripts ) there is nothing to record.
async function auditCallback( entry : AuditEntry ) : Promise<void> {
	let event

	try {
		event = getRequestEvent()
	} catch {
		return
	}

	await audit( event, entry )
}

// One reset email per account per minute, however often the form is sent, so it can't be
// used to flood someone's inbox. ( The token better-auth just stored counts as one. )
async function sendResetEmail( user : { id : string, email : string, name : string }, token : string ) : Promise<void> {
	const recent = await db.verification.count( { where: { value: user.id, identifier: { startsWith: 'reset-password:' }, createdAt: { gt: new Date( Date.now() - 60_000 ) } } } )

	if ( recent <= 1 )
		await sendMail( { to: user, template: 'password.reset', values: { link: appUrl( `/reset-password?token=${ token }` ) } } )
}

// `cookies: false` for code that runs outside a SvelteKit request ( tests, scripts ).
export function createAuth( { cookies = true } : { cookies ?: boolean } = {} ) {
	const shared = process.env.TENANCY === 'shared'
	const social = socialProviders()

	return betterAuth( {
		appName : APP.name,
		secret  : secret(),
		baseURL : shared ? { allowedHosts: [ '*' ], protocol: 'auto' } : process.env.BETTER_AUTH_URL,
		database: prismaAdapter( authDb, { provider: 'postgresql' } ),
		// The uploaded avatar ( src/lib/server/avatars.ts ) rides on the session's user, so
		// pages show it without a query of their own. Never set through better-auth.
		user    : { additionalFields: { avatarId: { type: 'string', required: false, input: false } } },
		emailAndPassword: {
			enabled                      : true,
			disableSignUp                : !signUpEnabled(),
			minPasswordLength            : 10,
			// Only self-made accounts can be unverified: the seed's admin is verified, an admin
			// vouches for the people they add, and an invite is accepted through its email.
			// Without the mail module there's no way to verify, so nobody has to.
			requireEmailVerification     : signUpEnabled() && MODULES.mail,
			revokeSessionsOnPasswordReset: true,
			// Our own page, not better-auth's redirect: it says up front when a link has expired.
			// Never throws: the answer must not depend on whether the email has an account.
			sendResetPassword            : MODULES.mail ? ( { user, token } ) => sendResetEmail( user, token ).catch( ( caught ) => log.error( { err: caught, scope: 'auth' }, 'reset email failed' ) ) : undefined,
			// Opening the link proves the address as well as an email verification would.
			onPasswordReset              : async( { user } ) => {
				if ( !user.emailVerified )
					await db.user.update( { where: { id: user.id }, data: { emailVerified: true } } )
			}
		},
		// Google / Apple when their credentials are set ( src/lib/server/social.ts ). They may
		// create accounts even with sign-up off; an account with the same email is linked.
		socialProviders: social,
		account        : { accountLinking: { enabled: true, trustedProviders: Object.keys( social ) } },
		// Apple posts its answer back from its own origin.
		trustedOrigins : 'apple' in social ? [ 'https://appleid.apple.com' ] : [],
		databaseHooks  : {
			user: {
				create: {
					// A new person through a provider: the admins hear, as with sign-up.
					after: async( user, context ) => {
						if ( !context?.path?.startsWith( '/callback/' ) )
							return

						await notify( { type: 'user.joined', params: { name: user.name, email: user.email }, to: { roles: [ 'admin' ] } } )
						await auditCallback( { action: 'user.signup', actor: { id: user.id, name: user.name }, target: { id: user.id, label: `${ user.name } <${ user.email }>` } } )
					}
				}
			},
			session: {
				create: {
					// A sign-in through a provider, for the sign-in log ( password ones are the guard's ).
					after: async( session, context ) => {
						const provider = context?.path?.startsWith( '/callback/' ) ? ( context.params as { id ?: string } | undefined )?.id : undefined

						if ( provider !== 'google' && provider !== 'apple' )
							return

						const user = await db.user.findUnique( { where: { id: session.userId }, select: { email: true } } )

						await recordSignIn( { email: user?.email ?? '', userId: session.userId, outcome: 'success', method: provider, ip: session.ipAddress, userAgent: session.userAgent } )
					}
				}
			},
			account: {
				create: {
					// A provider connected, on sign-in or from the profile page.
					after: async( account, context ) => {
						if ( account.providerId === 'credential' || !context?.path?.startsWith( '/callback/' ) )
							return

						const user = await db.user.findUnique( { where: { id: account.userId }, select: { id: true, name: true } } )

						if ( user )
							await auditCallback( { action: 'account.link', actor: user, target: { label: SOCIAL_LABELS[ account.providerId as SocialProvider ] ?? account.providerId } } )
					}
				}
			}
		},
		emailVerification: MODULES.mail ? {
			sendOnSignUp               : true,
			// A sign-in refused for an unverified email sends a fresh link.
			sendOnSignIn               : true,
			autoSignInAfterVerification: true,
			sendVerificationEmail      : ( { user, url } ) => sendMail( { to: user, template: 'email.verify', values: { link: url } } )
				.catch( ( caught ) => log.error( { err: caught, scope: 'auth' }, 'verification email failed' ) )
		} : undefined,
		advanced: {
			// Ids come from the database ( uuidv7() ).
			database : { generateId: false },
			// The visitor's address as SvelteKit sees it ( event.getClientAddress(): set
			// ADDRESS_HEADER / XFF_DEPTH behind a proxy ), put there by this server only
			// ( hooks.server.ts, authHeaders ) — for the rate limiter, the sign-in throttle
			// and each session's recorded address.
			ipAddress: { ipAddressHeaders: [ CLIENT_IP ] }
		},
		// Sign-in throttle and captcha ( src/lib/server/sign-in-guard.ts ). Hooks run for the
		// form actions' auth.api calls as well as /api/auth/*.
		hooks: { before: beforeAuth, after: afterAuth },
		// Per-IP budgets on /api/auth/*, stored per tenant. On in production only ( better-auth's
		// default ). Form actions call auth.api directly and skip it: the sign-in guard covers them.
		rateLimit: {
			storage    : 'database',
			customRules: {
				'/sign-in/email'          : { window: 60, max: 10 },
				'/sign-up/email'          : { window: 60, max: 5 },
				'/change-password'        : { window: 60, max: 5 },
				// Each of these sends an email.
				'/request-password-reset' : { window: 60, max: 3 },
				'/send-verification-email': { window: 60, max: 3 }
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
