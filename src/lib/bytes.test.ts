import { describe, expect, it } from 'vitest'
import { parseBytes } from './bytes'

describe( 'parseBytes', () => {
	it( 'reads sizes as people write them, in binary units', () => {
		expect( [ '2048', '500M', '5G', '1.5 GB', ' 10kb ' ].map( parseBytes ) ).toEqual( [ 2048, 500 * 1024 ** 2, 5 * 1024 ** 3, 1.5 * 1024 ** 3, 10 * 1024 ] )
	} )

	it( 'answers null for blank or nonsense', () => {
		expect( [ '', null, undefined, 'lots', '5X', '-1G' ].map( parseBytes ) ).toEqual( Array( 6 ).fill( null ) )
	} )
} )
