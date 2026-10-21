import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { building, dev } from '$app/environment'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { appearanceClassOf } from '$lib/server/appearance'
import { auth, type Session } from '$lib/server/auth'
import { checkEnv } from '$lib/server/env'
import { log, withLog } from '$lib/server/log'
import { requireUser } from '$lib/server/guards'
import { runWithTenant, type TenantRef } from '$lib/server/db'
import { handleModules } from '$lib/server/modules'
import { CLIENT_IP } from '$lib/server/sign-in-guard'
import { resolveTenant } from '$lib/server/tenant'
// Localised valibot messages for server-side validation ( see src/lib/validation.ts ).
import '$lib/validation'

// Resolves the request locale ( cookie → baseLocale ) so `m.*()` and `getLocale()`
// work in loads, actions and +server.ts handlers, and stamps <html lang>.
const handleLocale : Handle = ( { event, resolve } ) => paraglideMiddleware( event.request, ( { request, locale } ) => {
	event.request = request

	return resolve( event, {
		transformPageChunk: ( { html } ) => html.replace( '%paraglide.lang%', locale )
	} )
} )

// Paints <html> with the appearance classes from the cookie ( see $lib/server/appearance ).
// Read at transform time, after the loads, so a cookie the /app layout healed this request
// is the one painted.
const handleAppearance : Handle = ( { event, resolve } ) => resolve( event, {
	transformPageChunk: ( { html } ) => html.replace( '%app.appearance%', appearanceClassOf( event.cookies ) )
} )

// A broken deployment says so before anyone visits ( src/lib/server/env.ts ).
export const init : ServerInit = () => {
	if ( !building )
		checkEnv()
}

/* ―― » Only real server faults reach the log ( the fundraiser app's handleError ): a 5xx, with
        the request that caused it and the stack. 404s — scanners try every host for
        WordPress — and other 4xx are the visitor's business, not ours. What the visitor
        sees is unchanged. */
export const handleError : HandleServerError = ( { error, status, message } ) => {
	// The request's method, path and id are on the line already ( handleLog ).
	if ( status >= 500 )
		log.error( { err: error, status }, 'server fault' )

	return { message }
}

/* ―― » Each request in its own log context ( src/lib/server/log.ts ): an id — the proxy's, if
        it sent a sane one, else new — that every line logged while answering carries, and is
        returned as X-Request-ID so a report can name it. One line when it's answered: debug,
        or in production a warning when it took over a second ( in dev, compiling a page on
        first visit would set it off every time ). */
const REQUEST_ID = /^[\w-]{8,64}$/

const handleLog : Handle = ( { event, resolve } ) => {
	const sent = event.request.headers.get( 'x-request-id' ) ?? ''
	const id = REQUEST_ID.test( sent ) ? sent : crypto.randomUUID()
	const started = performance.now()

	return withLog( { req: id, method: event.request.method, path: event.url.pathname, host: event.url.host }, async() => {
		const response = await resolve( event )
		const ms = Math.round( performance.now() - started )

		if ( !dev && ms > 1_000 )
			log.warn( { status: response.status, ms }, 'slow request' )
		else
			log.debug( { status: response.status, ms }, 'request' )

		try {
			response.headers.set( 'x-request-id', id )
		} catch {
			// Immutable headers: the id stays in the log.
		}

		return response
	} )
}

/* ―― » Headers every response carries ( the content security policy is SvelteKit's, from
        svelte.config.js, and X-Robots-Tag is below ):
          · nosniff — an upload served as image/webp stays one;
          · the referrer leaves the site as its origin only, never a page's path or query;
          · no camera, microphone, location or payment, which nothing here asks for;
          · HSTS over HTTPS in production: browsers stop trying plain HTTP for a year. Never
            in dev, where it would pin http://localhost. No preload — that is each project's
            decision, and hard to undo. */
const HEADERS = {
	'x-content-type-options': 'nosniff',
	'referrer-policy'       : 'strict-origin-when-cross-origin',
	'permissions-policy'    : 'camera=(), microphone=(), geolocation=(), payment=()'
}

const handleHeaders : Handle = async( { event, resolve } ) => {
	const response = await resolve( event )

	try {
		for ( const [ name, value ] of Object.entries( HEADERS ) )
			response.headers.set( name, value )

		if ( !dev && event.url.protocol === 'https:' )
			response.headers.set( 'strict-transport-security', 'max-age=31536000; includeSubDomains' )

		// Search engines index the public site and nothing else — never /app, the API or the
		// sign-in pages; nothing at all where SEO_INDEX=false ( a staging copy ).
		if ( process.env.SEO_INDEX === 'false' || !event.route.id?.startsWith( '/(site)' ) )
			response.headers.set( 'x-robots-tag', 'noindex' )
	} catch {
		// Immutable headers ( a response passed through from fetch ): leave them as they are.
	}

	return response
}

// Puts the request's tenant in scope for `db`. Looked up on first use and then reused, so
// a request that never touches the database ( the playground ) never needs one.
const handleTenant : Handle = ( { event, resolve } ) => {
	let pending : Promise<TenantRef> | undefined
	const tenant = () => ( pending ??= resolveTenant( event.url ) )

	event.locals.tenant = tenant

	return runWithTenant( tenant, () => resolve( event ) )
}

// The signed-in session, looked up on first use. Requests to /api/auth/* go to better-auth.
// Both run inside the tenant scope above: auth data is the tenant's.
const handleAuth : Handle = ( { event, resolve } ) => {
	let pending : Promise<Session | null> | undefined

	event.locals.session = () => ( pending ??= auth().api.getSession( { headers: event.request.headers } ) )

	if ( event.url.pathname.startsWith( '/api/auth/' ) ) {
		// The visitor's address for better-auth's limiter and the sign-in guard: ours, never a
		// header the client sent ( see CLIENT_IP ).
		event.request.headers.set( CLIENT_IP, event.getClientAddress() )

		return svelteKitHandler( { event, resolve, auth: auth(), building } )
	}

	return resolve( event )
}

// Everything under /app needs a signed-in user. Guarded HERE, not in +layout.server.ts:
// server loads run in parallel, so a layout check doesn't protect a page's own load or
// its actions. Permission checks stay per page ( requirePermission ).
const handleAppGuard : Handle = async( { event, resolve } ) => {
	if ( event.url.pathname === '/app' || event.url.pathname.startsWith( '/app/' ) )
		await requireUser( event )

	return resolve( event )
}

export const handle = sequence( handleLog, handleHeaders, handleLocale, handleAppearance, handleTenant, handleModules, handleAuth, handleAppGuard )
