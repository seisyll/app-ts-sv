import type { RequestEvent } from '@sveltejs/kit'
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api'
import type { CaptchaWidgetConfig } from '$lib/captcha'
import { m } from '$lib/paraglide/messages'
import { activeCaptcha, verifyCaptcha, type ActiveCaptcha } from '$lib/server/captcha'
import { clear, hit, peek, rateLimit, tenantKey } from '$lib/server/redis'

/* ―― » Sign-in protection, in layers ( the fundraiser app's TRUST.md ):
          1. better-auth's per-IP rate limit, on /api/auth/* in production.
          2. This throttle, per ACCOUNT ( the email typed ) and per ADDRESS, counted in Redis
             over a 15-minute window:
               3+ failed sign-ins → each attempt waits longer ( 0.5 s steps, at most 5 s )
               10+               → refused ( 429 ) until the window ends — or, with a
                                   captcha on, a captcha on every attempt instead: a lock
                                   anyone can trigger on anyone's email must not keep the
                                   real owner out
               30+ from one address, whatever the accounts → the same, for that address
             A successful sign-in clears the account's count. No Redis, no throttle.
          3. The workspace's captcha ( src/lib/server/captcha.ts ): on sign-in after
             `triggerAfter` failures ( adaptive ) or always; on sign-up and forgot-password
             whenever it's on, which also get a per-address budget here.
        It runs as better-auth hooks, so it covers both the form actions ( auth.api calls,
        which better-auth's own limiter never sees ) and /api/auth/*. The address comes from
        CLIENT_IP, which only this server sets ( see authHeaders, hooks.server.ts ). */

export const CLIENT_IP = 'x-client-ip'
const CAPTCHA_TOKEN = 'x-captcha-response'

const WINDOW_MS = 15 * 60_000
const DELAY_AFTER = 3
const LOCK_AFTER = 10
const ADDRESS_LOCK_AFTER = 30
const DELAY_STEP_MS = 500
const DELAY_MAX_MS = 5_000

// Per address and minute, for the endpoints that don't sign in ( each may send an email ).
const BUDGET : Record<string, number> = { '/sign-up/email': 5, '/request-password-reset': 3 }

const sleep = ( ms : number ) => new Promise( ( resolve ) => setTimeout( resolve, ms ) )
const normalise = ( email : unknown ) => ( typeof email === 'string' ? email.trim().toLowerCase() : '' )
const accountKey = ( email : string ) => tenantKey( 'sign-in', 'account', email )
const addressKey = ( ip : string ) => tenantKey( 'sign-in', 'address', ip )

const tooMany = ( retryAfterMs : number ) => new APIError( 'TOO_MANY_REQUESTS', {
	message: m.auth_locked( { minutes: Math.max( 1, Math.ceil( retryAfterMs / 60_000 ) ) } ),
	code   : 'SIGN_IN_LOCKED'
}, { 'retry-after': String( Math.ceil( retryAfterMs / 1_000 ) ) } )

// Failed sign-ins so far for this email and this address ( zero without Redis ).
async function failures( email : string, ip : string | null ) {
	const [ account, address ] = await Promise.all( [
		email ? peek( await accountKey( email ) ) : null,
		ip ? peek( await addressKey( ip ) ) : null
	] )

	return { account: account ?? { count: 0, ttlMs: 0 }, address: address ?? { count: 0, ttlMs: 0 } }
}

async function requireCaptcha( captcha : ActiveCaptcha, token : string | null | undefined, ip : string | null ) : Promise<void> {
	if ( !token )
		throw new APIError( 'FORBIDDEN', { message: m.auth_captcha_required(), code: 'CAPTCHA_REQUIRED' } )

	if ( !await verifyCaptcha( captcha, token, ip ) )
		throw new APIError( 'FORBIDDEN', { message: m.auth_captcha_failed(), code: 'CAPTCHA_INVALID' } )
}

export const beforeAuth = createAuthMiddleware( async( ctx ) => {
	const signIn = ctx.path === '/sign-in/email'

	if ( !signIn && !BUDGET[ ctx.path ] )
		return

	const ip = ctx.headers?.get( CLIENT_IP ) ?? null
	const captcha = await activeCaptcha()

	if ( !signIn ) {
		if ( ip ) {
			const { allowed, retryAfterMs } = await rateLimit( await tenantKey( 'auth', ctx.path, ip ), BUDGET[ ctx.path ], 60_000 )

			if ( !allowed )
				throw new APIError( 'TOO_MANY_REQUESTS', { message: m.auth_too_many() }, { 'retry-after': String( Math.ceil( retryAfterMs / 1_000 ) ) } )
		}

		if ( captcha )
			await requireCaptcha( captcha, ctx.headers?.get( CAPTCHA_TOKEN ), ip )

		return
	}

	const { account, address } = await failures( normalise( ( ctx.body as { email ?: unknown } )?.email ), ip )
	const locked = account.count >= LOCK_AFTER || address.count >= ADDRESS_LOCK_AFTER

	if ( locked && !captcha )
		throw tooMany( Math.max( account.count >= LOCK_AFTER ? account.ttlMs : 0, address.count >= ADDRESS_LOCK_AFTER ? address.ttlMs : 0 ) )

	// The captcha first: a missing or wrong answer is told at once, not after the wait.
	if ( captcha && ( locked || captcha.mode === 'always' || Math.max( account.count, address.count ) >= captcha.triggerAfter ) )
		await requireCaptcha( captcha, ctx.headers?.get( CAPTCHA_TOKEN ), ip )

	if ( account.count >= DELAY_AFTER )
		await sleep( Math.min( ( account.count - DELAY_AFTER + 1 ) * DELAY_STEP_MS, DELAY_MAX_MS ) )
} )

// Wrong credentials count against the email and the address; a session clears the email.
// Anything else ( unverified, banned, a captcha refused ) isn't a guess and counts nothing.
export const afterAuth = createAuthMiddleware( async( ctx ) => {
	if ( ctx.path !== '/sign-in/email' )
		return

	const email = normalise( ( ctx.body as { email ?: unknown } )?.email )
	const ip = ctx.headers?.get( CLIENT_IP ) ?? null

	if ( ( ctx.context as { newSession ?: unknown } ).newSession ) {
		if ( email )
			await clear( await accountKey( email ) )
	} else if ( isAPIError( ctx.context.returned ) && ctx.context.returned.statusCode === 401 ) {
		await Promise.all( [
			email && hit( await accountKey( email ), WINDOW_MS ),
			ip && hit( await addressKey( ip ), WINDOW_MS )
		] )
	}
} )

// The headers a form action hands to auth.api: the visitor's address ( set here, never
// taken from the request ) and their captcha answer.
export function authHeaders( event : RequestEvent, captcha ?: string ) : Headers {
	const headers = new Headers( event.request.headers )

	headers.set( CLIENT_IP, event.getClientAddress() )
	headers.delete( CAPTCHA_TOKEN )

	if ( captcha )
		headers.set( CAPTCHA_TOKEN, captcha )

	return headers
}

// The widget for sign-up and forgot-password: shown whenever the captcha is on.
export async function captchaWidget() : Promise<CaptchaWidgetConfig | null> {
	const captcha = await activeCaptcha()

	return captcha && { provider: captcha.provider, siteKey: captcha.siteKey }
}

// The widget for the next sign-in, when it will be asked for: always-mode, or once this
// email or address has failed `triggerAfter` times. The action asks again after a failure.
export async function signInCaptcha( event : RequestEvent, email = '' ) : Promise<CaptchaWidgetConfig | null> {
	const captcha = await activeCaptcha()

	if ( !captcha )
		return null

	const { account, address } = await failures( normalise( email ), event.getClientAddress() )
	const needed = captcha.mode === 'always' || Math.max( account.count, address.count ) >= Math.min( captcha.triggerAfter, LOCK_AFTER )

	return needed ? { provider: captcha.provider, siteKey: captcha.siteKey } : null
}
