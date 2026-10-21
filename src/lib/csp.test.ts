import { readFileSync } from 'node:fs'
import { createInitialModeExpression } from 'mode-watcher'
import { describe, expect, it } from 'vitest'

/* ―― » The content security policy allows no inline script without SvelteKit's nonce, so
        mode-watcher's pre-paint snippet is our copy in app.html ( a component can't reach
        the nonce, and a hash of mode-watcher's own differs between dev and the build ). It
        only works while it reads the key and sets the class <ModeWatcher /> uses. */
describe( 'content security policy', () => {
	it( 'keeps app.html\'s dark-mode snippet in step with mode-watcher', () => {
		const html = readFileSync( 'src/app.html', 'utf8' )
		const layout = readFileSync( 'src/routes/+layout.svelte', 'utf8' )
		const theirs = createInitialModeExpression()

		expect( html ).toContain( '<script nonce="%sveltekit.nonce%">' )
		expect( layout ).toContain( '<ModeWatcher disableHeadScriptInjection />' )
		expect( theirs ).toContain( 'modeStorageKey = "mode-watcher-mode"' )
		expect( theirs ).toContain( 'darkClassNames = ["dark"]' )
		expect( html ).toContain( 'localStorage.getItem( \'mode-watcher-mode\' )' )
	} )
} )
