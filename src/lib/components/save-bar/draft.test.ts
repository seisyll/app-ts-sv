import { describe, expect, it } from 'vitest'
import { Draft } from './draft.svelte'

describe( 'Draft', () => {
	it( 'is clean until the value changes, and clean again when changed back', () => {
		const draft = new Draft( { name: 'Acme', notify: true } )

		expect( draft.dirty ).toBe( false )
		draft.value.name = 'Acme Inc'
		expect( draft.dirty ).toBe( true )
		draft.value.name = 'Acme'
		expect( draft.dirty ).toBe( false )
	} )

	it( 'commit makes the current value the baseline', () => {
		const draft = new Draft( { name: 'Acme' } )

		draft.value.name = 'Acme Inc'
		draft.commit()
		expect( draft.dirty ).toBe( false )
	} )

	it( 'reset restores the last committed value', () => {
		const draft = new Draft( { name: 'Acme', tags: [ 'a' ] } )

		draft.value.name = 'Changed'
		draft.value.tags.push( 'b' )
		draft.reset()
		expect( draft.value ).toEqual( { name: 'Acme', tags: [ 'a' ] } )
		expect( draft.dirty ).toBe( false )
	} )

	it( 'does not mutate the object it was created from', () => {
		const initial = { name: 'Acme' }
		const draft = new Draft( initial )

		draft.value.name = 'Changed'
		expect( initial.name ).toBe( 'Acme' )
	} )
} )
