import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { loadEnv } from 'vite'
import { defineConfig, type ViteUserConfig as UserConfig } from 'vitest/config'
import { MODULE_IDS } from './config/modules.ts'
import { loadClient, modules } from './config/vite.ts'

// The plugins come with the client ( see the bottom ); the rest is the same for every build.
const config : UserConfig = {
	// Not source: agent skills ( Windows can't rename a folder the watcher holds open, which
	// breaks `skilld install` ) and uploaded media ( every upload would wake the watcher ).
	// Anchored to this checkout: a git worktree under .claude/worktrees/ is source to its own
	// dev server.
	server: {
		watch: { ignored: [ '.skills', '.claude', 'uploads' ].map( ( dir ) => `${ process.cwd().replaceAll( '\\', '/' ) }/${ dir }/**` ) }
	},
	optimizeDeps: {
		// Plain-JS deps declared up front, so the first visit to a page that uses them
		// doesn't trigger a re-optimize + reload that swallows the click. Never list Svelte
		// component libs ( bits-ui … ): a pre-bundle inlines a second Svelte runtime.
		// The exception, svelte-tiptap: found late, it was bundled apart from the @tiptap/*
		// above, and the first editor page after a cold start met two ProseMirrors ( "Adding
		// different instances of a keyed plugin" ) until reloaded.
		include: [ '@tanstack/table-core', '@internationalized/date', 'clsx', 'tailwind-merge', 'tailwind-variants', 'better-auth/plugins/access', 'better-auth/plugins/admin/access',
			'@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-text-align', '@tiptap/extension-typography', '@tiptap/extensions', '@tiptap/static-renderer/pm/html-string', 'svelte-tiptap', 'd3-scale' ],
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
					setupFiles : [ './src/lib/test/setup.ts' ],
					// Quiet logs: a test that cares spies on `log` ( src/lib/server/log.ts ).
					env        : { LOG_LEVEL: 'silent' }
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

export default defineConfig( async( { mode } ) => {
	// .env into process.env for dev and tests ( server code reads process.env so scripts can
	// share it ). Real environment variables win. Production never reads .env: the host
	// provides the environment.
	Object.assign( process.env, { ...loadEnv( mode, process.cwd(), '' ), ...process.env } )

	// Which client this build is for ( CLIENT → config/clients ): its modules and its theme.
	const client = await loadClient()

	// svelte.config.js points $theme at it, and opens its content security policy only to
	// the third parties this build's modules use; it's read when sveltekit() loads that file.
	process.env.APP_THEME = client.theme
	process.env.APP_MODULES = MODULE_IDS.filter( ( id ) => client.modules[ id ] ).join( ',' )

	return {
		...config,
		plugins: [
			modules( client ),
			tailwindcss(),
			sveltekit(),
			paraglideVitePlugin( {
				project : './project.inlang',
				outdir  : './src/lib/paraglide',
				// Cookie first ( set by the locale switcher ), then the configured default.
				// Add 'preferredLanguage' before 'baseLocale' to honour the browser language —
				// and in package.json's `i18n` script, which compiles the same for svelte-check.
				strategy: [ 'cookie', 'baseLocale' ]
			} )
		]
	}
} )
