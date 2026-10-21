import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig( {
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin( {
			project : './project.inlang',
			outdir  : './src/lib/paraglide',
			// Cookie first ( set by the locale switcher ), then the configured default.
			// Add 'preferredLanguage' before 'baseLocale' to honour the browser language.
			strategy: [ 'cookie', 'baseLocale' ]
		} )
	],
	optimizeDeps: {
		// Per-icon deep imports: pre-bundling them makes Vite re-optimize ( and reload,
		// eating the click ) the first time any page imports a new icon.
		exclude: [ '@lucide/svelte' ]
	},
	test: {
		// Node-only for now; browser ( component ) and storybook projects come later.
		include    : [ 'src/**/*.test.ts' ],
		environment: 'node'
	}
} )
