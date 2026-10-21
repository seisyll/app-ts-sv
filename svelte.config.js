import adapter from '@sveltejs/adapter-node'

/* ―― » The public site's theme, one per build: `$theme` points at src/lib/themes/<theme>,
        so routes import the active theme only and the others never reach the bundle. The
        client config picks it ( config/clients ); vite.config.ts passes it as APP_THEME and
        has already checked it exists. Tools that read only this file ( svelte-check ) get
        the default, which is enough for types: every theme has the same contract. */
const THEMES_DIR = 'src/lib/themes'
const theme = process.env.APP_THEME || 'aurora'

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
		csrf: { trustedOrigins: [ 'https://appleid.apple.com' ] }
	}
}

export default config
