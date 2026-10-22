// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// `errors`: per-field messages from a validation failure ( readJson ).
		interface Error {
			message  : string
			errors ? : Record<string, string[]>
		}
		interface Locals {
			// This request's tenant, looked up on first call ( see hooks.server.ts ).
			tenant  : () => Promise<import( '#lib/server/db/index.js' ).TenantRef>
			// The signed-in session or null, looked up on first call. Prefer the guards.
			session : () => Promise<import( '#lib/server/auth.js' ).Session | null>
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
