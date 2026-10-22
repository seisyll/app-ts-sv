import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createInitialModeExpression } from 'mode-watcher'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { SVELTE_EVENT_CAPTURE } from '#config/kit.js'
import Capture from './test/fixtures/EventCapture.svelte'

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

	it( 'allows the one inline handler Svelte’s server render writes, by its hash', () => {
		const handlers = new Set( [ ...render( Capture ).body.matchAll( /\son(?:load|error)="([^"]*)"/g ) ].map( ( match ) => match[ 1 ] ) )

		expect( [ ...handlers ] ).toHaveLength( 1 )
		expect( `sha256-${ createHash( 'sha256' ).update( [ ...handlers ][ 0 ] ).digest( 'base64' ) }` ).toBe( SVELTE_EVENT_CAPTURE )
	} )
} )
