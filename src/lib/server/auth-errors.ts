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

	// 403: banned / unverified — better-auth's own message says which.
	return error.message || m.http_failed()
}

export const isAuthError = ( error : unknown, code : string ) : boolean => error instanceof APIError && error.body?.code === code
