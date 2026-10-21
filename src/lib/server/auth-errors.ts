import { error } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { m } from '$lib/paraglide/messages'

// What to tell the user when better-auth refuses ( wrong password, banned, throttled ).
// Credential failures stay vague on purpose: "wrong email or password", never which.
export function authErrorMessage( error : unknown ) : string {
	if ( !( error instanceof APIError ) )
		return m.http_failed()

	if ( error.statusCode === 401 )
		return m.auth_invalid_credentials()

	if ( error.statusCode === 429 )
		return m.auth_too_many()

	// A fresh link is already on its way ( emailVerification.sendOnSignIn ).
	if ( error.body?.code === 'EMAIL_NOT_VERIFIED' )
		return m.auth_verify_first()

	// 403: banned — better-auth's own message says so.
	return error.message || m.http_failed()
}

export const isAuthError = ( error : unknown, code : string ) : boolean => error instanceof APIError && error.body?.code === code

// In an endpoint: a better-auth refusal becomes the same HTTP status with its message;
// anything else is rethrown untouched. Use as `.catch( rethrowAuthError )`.
export function rethrowAuthError( caught : unknown ) : never {
	if ( caught instanceof APIError )
		error( caught.statusCode, { message: caught.message || m.http_failed() } )

	throw caught
}
