import type { Handle } from '@sveltejs/kit'
import { paraglideMiddleware } from '$lib/paraglide/server'
// Localised valibot messages for server-side validation ( see src/lib/validation.ts ).
import '$lib/validation'

// Resolves the request locale ( cookie → baseLocale ) so `m.*()` and `getLocale()`
// work in loads, actions and +server.ts handlers, and stamps <html lang>.
export const handle : Handle = ( { event, resolve } ) => paraglideMiddleware( event.request, ( { request, locale } ) => {
	event.request = request

	return resolve( event, {
		transformPageChunk: ( { html } ) => html.replace( '%paraglide.lang%', locale )
	} )
} )
