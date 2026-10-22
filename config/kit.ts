import adapter from '@sveltejs/adapter-node'
import type { Config } from '@sveltejs/kit/vite'
import type { ResolvedClient } from './resolve.ts'

type Sources = NonNullable<NonNullable<NonNullable<Config[ 'csp' ]>[ 'directives' ]>[ 'connect-src' ]>

// Runes mode for the project, except for libraries. Can go in Svelte 6. eslint.config.js reads it too.
export const compilerOptions : Config[ 'compilerOptions' ] = {
	runes: ( { filename } ) => filename.split( /[/\\]/ ).includes( 'node_modules' ) ? undefined : true
}

// Svelte's server render puts onload / onerror="this.__e=event" on elements that listen for
// those events, so one that fires before hydration isn't lost ( an avatar's image ). Allowed
// by its hash alone — 'unsafe-hashes' admits no other inline handler; src/lib/csp.test.ts
// checks the hash.
export const SVELTE_EVENT_CAPTURE : Sources[ number ] = 'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I='

/* ―― » SvelteKit's options for one client's build ( vite.config.ts ). The content security
        policy ( README, Security ): only this app's own scripts — each page's inline ones carry
        a per-request nonce SvelteKit adds — plus the third parties a module in this build
        talks to. Styles allow inline: Svelte's transitions and the components' style
        attributes need it, and a stylesheet can't run code. Any https image: rich text may
        show one. Violations are reported to /csp. */
export function kitOptions( client : ResolvedClient, { dev = false } = {} ) : Config {
	// The captcha providers' script, widget frame and verification calls ( #lib/captcha.ts ).
	const captcha : Sources = client.modules.captcha ? [ 'https://challenges.cloudflare.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://recaptcha.google.com', 'https://js.hcaptcha.com', 'https://*.hcaptcha.com', 'https://hcaptcha.com' ] : []
	// Sign-in forms post here and are sent on to the provider, and Apple posts its answer back.
	const social : Sources = client.modules.social ? [ 'https://accounts.google.com', 'https://appleid.apple.com' ] : []
	// impeccable's live mode loads its picker from this helper; `vite dev` only, never a build.
	const impeccable : Sources = dev ? [ 'http://localhost:8400' ] : []

	return {
		compilerOptions,
		adapter: adapter(),
		// Sign in with Apple posts its answer from Apple's origin ( src/lib/server/social.ts ).
		csrf   : { trustedOrigins: client.modules.social ? [ 'https://appleid.apple.com' ] : [] },
		csp    : {
			mode      : 'auto',
			directives: {
				'default-src'    : [ 'self' ],
				'script-src'     : [ 'self', 'unsafe-hashes', SVELTE_EVENT_CAPTURE, ...captcha, ...impeccable ],
				'style-src'      : [ 'self', 'unsafe-inline' ],
				'img-src'        : [ 'self', 'data:', 'blob:', 'https:' ],
				'font-src'       : [ 'self', 'data:' ],
				'connect-src'    : [ 'self', ...captcha, ...impeccable ],
				'frame-src'      : [ 'self', ...captcha ],
				'form-action'    : [ 'self', ...social ],
				'frame-ancestors': [ 'none' ],
				'base-uri'       : [ 'self' ],
				'object-src'     : [ 'none' ],
				'report-uri'     : [ '/csp' ]
			}
		}
	}
}
