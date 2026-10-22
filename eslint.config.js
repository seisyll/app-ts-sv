import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from 'typescript-eslint'
import { compilerOptions } from './config/kit.ts'

/* ―― » The house style ( CLAUDE.md ), as this template writes it — not a style to convert it
        to — plus the recommended correctness rules of typescript-eslint and eslint-plugin-svelte.
        `bun run lint` checks, `bun run lint:fix` repairs what can be repaired.

        Style, in short: tabs; no semicolons; single quotes; spaces inside parentheses,
        brackets, braces and template placeholders; a single-statement `if` body on the next
        line, without braces. Aligned colons stay a convention: no rule can check them here. A rule switched off below
        says why: most say where the template's own style is finer than the rule can express. */
export default defineConfig(
	includeIgnoreFile( fileURLToPath( new URL( './.gitignore', import.meta.url ) ) ),
	{
		// Vendored ( shadcn-svelte's own style, synced by `bun run sync:ui`; the agent skills ) or generated.
		ignores: [
			'src/lib/components/ui/**',
			'src/lib/hooks/is-mobile.svelte.ts',
			'src/lib/paraglide/**',
			'src/lib/server/db/generated/**',
			'.claude/**',
			'.skills/**',
			'graphify-out/**'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules          : {
			// TypeScript checks names; this rule can't see its globals ( typescript-eslint's advice ).
			'no-undef'                            : 'off',
			// `_` marks a parameter kept for its position: ( _, index ) => …
			'@typescript-eslint/no-unused-vars'   : [ 'error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' } ],
			// Resolving every href through $app/paths: the app is served from /, not a sub-path.
			'svelte/no-navigation-without-resolve': 'off',
			// svelte-check reports the compiler's warnings, and is the judge of which svelte-ignore
			// comments are still needed; this rule disagrees with it about state_referenced_locally.
			'svelte/no-unused-svelte-ignore'      : 'off',
			// Flags every Map, Set and URLSearchParams in a component, the many that are deliberately
			// not reactive ( a module-level cache, a URL built and thrown away ) included.
			'svelte/prefer-svelte-reactivity'     : 'off',
			// {' '} keeps a space at the edge of a block, where a bare space wouldn't survive.
			'svelte/no-useless-mustaches'         : 'off'
		}
	},
	{
		files          : [ '**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js' ],
		languageOptions: { parserOptions: { projectService: true, extraFileExtensions: [ '.svelte' ], parser: ts.parser, svelteConfig: { compilerOptions } } },
		rules          : {
			// A $bindable() prop's default is "assigned" and then assigned again: not useless.
			'no-useless-assignment': 'off'
		}
	},
	{
		plugins: { '@stylistic': stylistic },
		rules  : {
			'@stylistic/indent'                          : [ 'error', 'tab', { SwitchCase: 1 } ],
			'@stylistic/semi'                            : [ 'error', 'never' ],
			'@stylistic/quotes'                          : [ 'error', 'single', { avoidEscape: true, allowTemplateLiterals: 'avoidEscape' } ],
			'@stylistic/linebreak-style'                 : [ 'error', 'unix' ],
			'@stylistic/eol-last'                        : [ 'error', 'always' ],
			'@stylistic/no-trailing-spaces'              : 'error',
			'@stylistic/space-in-parens'                 : [ 'error', 'always' ],
			'@stylistic/array-bracket-spacing'           : [ 'error', 'always' ],
			'@stylistic/object-curly-spacing'            : [ 'error', 'always' ],
			'@stylistic/template-curly-spacing'          : [ 'error', 'always' ],
			// Colons are aligned by hand, in object literals and type literals alike — and type
			// literals write `key ?   : Type`, a space before the `?`, which neither key-spacing
			// nor type-annotation-spacing can describe ( nor be told to skip ).
			'@stylistic/key-spacing'                     : 'off',
			'@stylistic/type-annotation-spacing'         : 'off',
			// Values index with spaces ( `rows[ index ]` ), types without ( `Props['size']` ); the
			// rule can't tell them apart.
			'@stylistic/computed-property-spacing'       : 'off',
			'@stylistic/comma-dangle'                    : [ 'error', 'never' ],
			'@stylistic/comma-spacing'                   : 'error',
			'@stylistic/arrow-parens'                    : [ 'error', 'always' ],
			'@stylistic/arrow-spacing'                   : 'error',
			'@stylistic/keyword-spacing'                 : 'error',
			'@stylistic/space-infix-ops'                 : 'error',
			'@stylistic/space-before-blocks'             : 'error',
			'@stylistic/space-before-function-paren'     : [ 'error', { anonymous: 'never', named: 'never', asyncArrow: 'never' } ],
			'@stylistic/brace-style'                     : [ 'error', '1tbs', { allowSingleLine: true } ],
			'@stylistic/nonblock-statement-body-position': [ 'error', 'below' ],
			'@stylistic/no-multiple-empty-lines'         : [ 'error', { max: 1, maxEOF: 0 } ]
		}
	}
)
