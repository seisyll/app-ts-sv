import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { paraglideMiddleware } from '$lib/paraglide/server'
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

export const handle = sequence( handleLocale, handleTenant )
