import { describe, expect, it } from 'vitest'
import { isSaveShortcut } from './shortcut'

function press( overrides : Partial<KeyboardEvent> = {} ) : KeyboardEvent {
	return {
		key     : 's',
		ctrlKey : false,
		metaKey : false,
		shiftKey: false,
		altKey  : false,
		...overrides
	} as KeyboardEvent
}

describe( 'isSaveShortcut', () => {
	it( 'matches Ctrl+S and Cmd+S, in either case', () => {
		expect( isSaveShortcut( press( { ctrlKey: true } ) ) ).toBe( true )
		expect( isSaveShortcut( press( { metaKey: true } ) ) ).toBe( true )
		expect( isSaveShortcut( press( { key: 'S', ctrlKey: true } ) ) ).toBe( true )
	} )

	it( 'ignores a bare S, so typing in a field never saves', () => {
		expect( isSaveShortcut( press() ) ).toBe( false )
	} )

	it( 'requires exactly one of Ctrl and Cmd', () => {
		expect( isSaveShortcut( press( { ctrlKey: true, metaKey: true } ) ) ).toBe( false )
	} )

	it.each( [ 'shiftKey', 'altKey' ] as const )( 'declines the %s variant', ( modifier ) => {
		expect( isSaveShortcut( press( { ctrlKey: true, [ modifier ]: true } ) ) ).toBe( false )
	} )

	it( 'ignores every other key', () => {
		for ( const key of [ 'a', 'Enter', 'Escape', 'ArrowDown' ] )
			expect( isSaveShortcut( press( { key, ctrlKey: true } ) ) ).toBe( false )
	} )
} )
