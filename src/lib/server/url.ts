import { getRequestEvent } from '$app/server'

// Links that leave the app ( emails ) point at the site the request came to — each tenant's
// own host when shared; outside a request ( scripts ), at BETTER_AUTH_URL.
export function appUrl( path = '/' ) : string {
	let origin : string

	try {
		origin = getRequestEvent().url.origin
	} catch {
		origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173'
	}

	return new URL( path, origin ).href
}
