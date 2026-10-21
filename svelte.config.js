import { readdirSync } from 'node:fs'
import adapter from '@sveltejs/adapter-node'
import { loadEnv } from 'vite'

/* ―― » The public site's theme, one per build: `$theme` points at src/lib/themes/<THEME>,
        so routes import the active theme only and the others never reach the bundle.
        Set THEME in .env or the environment; restart the dev server after changing it. */
const THEMES_DIR = 'src/lib/themes'
const themes = readdirSync( THEMES_DIR, { withFileTypes: true } ).filter( ( entry ) => entry.isDirectory() ).map( ( entry ) => entry.name )
const theme = process.env.THEME || loadEnv( process.env.NODE_ENV ?? 'development', process.cwd(), 'THEME' ).THEME || 'aurora'

if ( !themes.includes( theme ) )
	throw new Error( `THEME=${ theme } is not a folder in ${ THEMES_DIR } ( have: ${ themes.join( ', ' ) } ).` )

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ( { filename } ) => filename.split( /[/\\]/ ).includes( 'node_modules' ) ? undefined : true
	},
	kit: {
		adapter: adapter(),
		alias  : { $theme: `${ THEMES_DIR }/${ theme }` }
	}
}

export default config
