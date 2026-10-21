import { describe, expect, it } from 'vitest'
import { superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { appearancePageSchema } from './schema'

describe( 'the appearance page form', () => {
	it( 'reads an empty media field as null and an id as itself', async() => {
		const post = ( logo : string ) => {
			const data = new FormData()

			data.set( 'logo', logo )
			data.set( 'favicon', '' )
			data.set( 'palette', 'neutral' )
			data.set( 'style', 'vega' )
			data.set( 'radius', 'medium' )

			return superValidate( data, valibot( appearancePageSchema ) )
		}
		const id = '01a15e4a-0f6a-769d-8c0f-e539532eebc3'

		expect( ( await post( '' ) ).data ).toMatchObject( { logo: null, favicon: null } )
		expect( ( await post( id ) ) ).toMatchObject( { valid: true, data: { logo: id, favicon: null } } )
		expect( ( await post( 'nope' ) ).valid ).toBe( false )
	} )
} )
