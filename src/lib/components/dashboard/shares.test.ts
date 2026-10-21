import { describe, expect, it } from 'vitest'
import { shares } from './shares'

describe( 'shares', () => {
	it( 'adds up to 100, giving the leftover points to the largest remainders', () => {
		expect( shares( [ 1, 1, 1 ] ) ).toEqual( [ 34, 33, 33 ] )
		expect( shares( [ 2, 1 ] ) ).toEqual( [ 67, 33 ] )
		// A sliver can round to nothing: the legend still prints its count.
		expect( shares( [ 995, 3, 2 ] ) ).toEqual( [ 100, 0, 0 ] )
	} )

	it( 'is all zeros for nothing', () => {
		expect( shares( [ 0, 0 ] ) ).toEqual( [ 0, 0 ] )
		expect( shares( [] ) ).toEqual( [] )
	} )
} )
