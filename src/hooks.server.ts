import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { building } from '$app/environment'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth, type Session } from '$lib/server/auth'
import { requireUser } from '$lib/server/guards'
import { runWithTenant, type TenantRef } from '$lib/server/db'
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

	if ( event.url.pathname.startsWith( '/api/auth/' ) )
		return svelteKitHandler( { event, resolve, auth: auth(), building } )

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

export const handle = sequence( handleLocale, handleTenant, handleAuth, handleAppGuard )
