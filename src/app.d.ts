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
			tenant : () => Promise<import( '$lib/server/db' ).TenantRef>
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
