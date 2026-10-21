import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig, type ViteUserConfig as UserConfig } from 'vitest/config'

/* ―― » Production builds replace every module under src/routes/(dev)/ with a 404 stub, so
        the playground's code and demo data never ship ( a runtime 404 alone still bundled
        them ). Dev and tests are untouched.
        ponytail: one hard-coded folder; becomes per-module route stubbing with the
        extension / module registry. */
function stripDevRoutes() : Plugin {
	let building = false

	return {
		name   : 'strip-dev-routes',
		enforce: 'pre',
		configResolved( config ) {
			building = config.command === 'build'
		},
		load( id ) {
			const file = id.split( '?' )[ 0 ].replaceAll( '\\', '/' )

			if ( !building || !file.includes( '/src/routes/(dev)/' ) )
				return

			if ( file.endsWith( '.svelte' ) )
				return ''

			if ( /\/\+server\.[jt]s$/.test( file ) )
				return 'export const fallback = () => new Response( "Not found", { status: 404 } )'

			if ( /\/\+(page|layout)(\.server)?\.[jt]s$/.test( file ) )
				return 'import { error } from "@sveltejs/kit"; export const load = () => error( 404 )'

			return 'export {}'
		}
	}
}

const config : UserConfig = {
	plugins: [
		stripDevRoutes(),
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
	// Not source: agent skills ( Windows can't rename a folder the watcher holds open, which
	// breaks `skilld install` ) and uploaded media ( every upload would wake the watcher ).
	server: {
		watch: { ignored: [ '**/.skills/**', '**/.claude/**', '**/uploads/**' ] }
	},
	optimizeDeps: {
		// Plain-JS deps declared up front, so the first visit to a page that uses them
		// doesn't trigger a re-optimize + reload that swallows the click. Never list Svelte
		// component libs ( bits-ui … ): a pre-bundle inlines a second Svelte runtime.
		include: [ '@tanstack/table-core', '@internationalized/date', 'clsx', 'tailwind-merge', 'tailwind-variants', 'better-auth/plugins/access', 'better-auth/plugins/admin/access',
			'@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-text-align', '@tiptap/extension-typography', '@tiptap/extensions', '@tiptap/static-renderer/pm/html-string' ],
		// Per-icon deep imports: pre-bundling them re-optimizes on every new icon.
		exclude: [ '@lucide/svelte' ]
	},
	test: {
		/* ―― » Two projects, picked by file name:
		          *.test.ts         → `server`: Node, fast — logic, stores, loaders, endpoints
		          *.svelte.test.ts  → `client`: real Chromium — components, DOM, focus, motion
		        See "Testing" in README.md. */
		projects: [
			{
				extends: true,
				test   : {
					name       : 'server',
					environment: 'node',
					include    : [ 'src/**/*.test.ts' ],
					exclude    : [ 'src/**/*.svelte.test.ts' ],
					setupFiles : [ './src/lib/test/setup.ts' ]
				}
			},
			{
				extends: true,
				test   : {
					name   : 'client',
					include: [ 'src/**/*.svelte.test.ts' ],
					browser: {
						enabled  : true,
						headless : true,
						// Desktop by default; a test can switch with page.viewport( w, h ).
						viewport : { width: 1280, height: 800 },
						provider : playwright(),
						instances: [ { browser: 'chromium' } ]
					},
					setupFiles: [ './vitest-setup-client.ts', './src/lib/test/setup.ts' ]
				}
			}
		],
		coverage: {
			provider: 'v8',
			reporter: [ 'text-summary', 'html' ],
			include : [ 'src/**/*.{ts,svelte}' ],
			exclude : [
				'src/**/*.test.ts',
				'src/**/index.ts',
				'src/**/*.d.ts',
				'src/lib/test/**',
				'src/lib/paraglide/**',
				// Vendored shadcn-svelte primitives: upstream's to test.
				'src/lib/components/ui/**',
				// The playground is a demo, not product code.
				'src/routes/(dev)/**'
			]
		}
	}
}

export default defineConfig( ( { mode } ) => {
	// .env into process.env for dev and tests ( server code reads process.env so scripts can
	// share it ). Real environment variables win. Production never reads .env: the host
	// provides the environment.
	Object.assign( process.env, { ...loadEnv( mode, process.cwd(), '' ), ...process.env } )

	return config
} )
