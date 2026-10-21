import adapter from '@sveltejs/adapter-node'

/* ―― » The public site's theme, one per build: `$theme` points at src/lib/themes/<theme>,
        so routes import the active theme only and the others never reach the bundle. The
        client config picks it ( config/clients ); vite.config.ts passes it as APP_THEME and
        has already checked it exists. Tools that read only this file ( svelte-check ) get
        the default, which is enough for types: every theme has the same contract. */
const THEMES_DIR = 'src/lib/themes'
const theme = process.env.APP_THEME || 'aurora'

/* ―― » The content security policy ( README, Security ): only this app's own scripts — each
        page's inline ones carry a per-request nonce SvelteKit adds — plus the third parties a
        module in this build talks to. Styles allow inline: Svelte's transitions and the
        components' style attributes need it, and a stylesheet can't run code. Any https
        image: rich text may show one. Violations are reported to /csp.
        APP_MODULES comes from vite.config.ts; tools that read only this file get every
        module, the loosest policy, which is enough for them. */
const built = ( id ) => process.env.APP_MODULES === undefined || process.env.APP_MODULES.split( ',' ).includes( id )
// The captcha providers' script, widget frame and verification calls ( $lib/captcha.ts ).
const CAPTCHA = built( 'captcha' ) ? [ 'https://challenges.cloudflare.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://recaptcha.google.com', 'https://js.hcaptcha.com', 'https://*.hcaptcha.com', 'https://hcaptcha.com' ] : []
// Sign-in forms post here and are sent on to the provider, and Apple posts its answer back.
const SOCIAL = built( 'social' ) ? [ 'https://accounts.google.com', 'https://appleid.apple.com' ] : []

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ( { filename } ) => filename.split( /[/\\]/ ).includes( 'node_modules' ) ? undefined : true
	},
	kit: {
		adapter: adapter(),
		alias  : {
			$theme : `${ THEMES_DIR }/${ theme }`,
			// The module registry and client configs, shared with vite.config.ts.
			$config: 'config'
		},
		// Sign in with Apple posts its answer from Apple's origin ( src/lib/server/social.ts ).
		csrf: { trustedOrigins: built( 'social' ) ? [ 'https://appleid.apple.com' ] : [] },
		csp : {
			mode      : 'auto',
			directives: {
				'default-src'    : [ 'self' ],
				'script-src'     : [ 'self', ...CAPTCHA ],
				'style-src'      : [ 'self', 'unsafe-inline' ],
				'img-src'        : [ 'self', 'data:', 'blob:', 'https:' ],
				'font-src'       : [ 'self', 'data:' ],
				'connect-src'    : [ 'self', ...CAPTCHA ],
				'frame-src'      : [ 'self', ...CAPTCHA ],
				'form-action'    : [ 'self', ...SOCIAL ],
				'frame-ancestors': [ 'none' ],
				'base-uri'       : [ 'self' ],
				'object-src'     : [ 'none' ],
				'report-uri'     : [ '/csp' ]
			}
		}
	}
}

export default config
