import { invalidateAll } from '$app/navigation'
import { toast } from 'svelte-sonner'
import { errorMessage, http, type HttpMethod } from '#lib/http.js'

export type MutateOptions = {
	method ?     : Exclude<HttpMethod, 'GET'>
	// JSON-encoded unless FormData / Blob.
	body ?       : unknown
	// Success toast; omit for a silent success.
	success ?    : string
	// When the endpoint fails without a message of its own.
	fallback ?   : string
	// Forms pass false and show `message` next to the fields instead.
	toastError ? : boolean
	// Runs before the refresh — close dialogs here, before the list re-renders under them.
	onSuccess ?  : () => void
	// Re-run load functions so the page reflects the change.
	refresh ?    : boolean
}

export type MutateResult<T> =
	| { ok : true, data : T }
	| { ok : false, message : string, error : unknown }

// The one browser-side write: request → toast → refresh, with errors never silently dropped.
export async function mutate<T = unknown>( path : string, options : MutateOptions = {} ) : Promise<MutateResult<T>> {
	const { method = 'POST', body, success, fallback, toastError = true, onSuccess, refresh = true } = options

	let data : T

	try {
		data = await http.request<T>( method, path, { body } )
	} catch ( error ) {
		const message = errorMessage( error, fallback )

		if ( toastError )
			toast.error( message )

		return { ok: false, message, error }
	}

	if ( success )
		toast.success( success )

	onSuccess?.()

	if ( refresh )
		await invalidateAll()

	return { ok: true, data }
}
