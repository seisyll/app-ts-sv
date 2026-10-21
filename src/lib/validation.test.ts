import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { blankOr, fieldErrors, integerish, numberish } from './validation'

const messagesOf = ( schema : v.GenericSchema, input : unknown ) => {
	const result = v.safeParse( schema, input )

	return result.success ? [] : result.issues.map( ( issue ) => issue.message )
}

describe( 'localised valibot messages', () => {
	it( 'says a missing or empty value is required', () => {
		expect( messagesOf( v.object( { name: v.string() } ), {} ) ).toEqual( [ 'Required' ] )
		expect( messagesOf( v.pipe( v.string(), v.nonEmpty() ), '' ) ).toEqual( [ 'Required' ] )
	} )

	it( 'names the limit, for text and for lists', () => {
		expect( messagesOf( v.pipe( v.string(), v.minLength( 3 ) ), 'ab' ) ).toEqual( [ 'At least 3 characters' ] )
		expect( messagesOf( v.pipe( v.string(), v.maxLength( 2 ) ), 'abc' ) ).toEqual( [ 'At most 2 characters' ] )
		expect( messagesOf( v.pipe( v.array( v.string() ), v.minLength( 2 ) ), [ 'a' ] ) ).toEqual( [ 'Choose at least 2' ] )
		expect( messagesOf( v.pipe( v.number(), v.minValue( 1 ) ), 0 ) ).toEqual( [ 'Must be at least 1' ] )
		expect( messagesOf( v.pipe( v.number(), v.maxValue( 10 ) ), 11 ) ).toEqual( [ 'Must be at most 10' ] )
	} )

	it( 'covers formats and falls back to a generic message', () => {
		expect( messagesOf( v.pipe( v.string(), v.email() ), 'nope' ) ).toEqual( [ 'Enter a valid email address' ] )
		expect( messagesOf( v.pipe( v.string(), v.url() ), 'nope' ) ).toEqual( [ 'Enter a valid URL' ] )
		expect( messagesOf( v.pipe( v.number(), v.integer() ), 1.5 ) ).toEqual( [ 'Must be a whole number' ] )
		expect( messagesOf( v.picklist( [ 'a', 'b' ] ), 'c' ) ).toEqual( [ 'Invalid value' ] )
	} )

	it( 'keeps a message the schema sets itself', () => {
		expect( messagesOf( v.pipe( v.string(), v.minLength( 8, 'Too short for a password' ) ), 'x' ) ).toEqual( [ 'Too short for a password' ] )
	} )
} )

describe( 'fieldErrors', () => {
	it( 'groups messages by dot path, root issues under _errors', () => {
		const schema = v.object( { email: v.pipe( v.string(), v.email() ), address: v.object( { city: v.pipe( v.string(), v.nonEmpty() ) } ) } )
		const result = v.safeParse( schema, { email: 'x', address: { city: '' } } )
		const root = v.safeParse( schema, 'not an object' )

		expect( result.success || fieldErrors( result.issues ) ).toEqual( {
			email         : [ 'Enter a valid email address' ],
			'address.city': [ 'Required' ]
		} )
		expect( root.success || fieldErrors( root.issues ) ).toEqual( { _errors: [ 'Invalid value' ] } )
	} )
} )

describe( 'numbers that arrive as text', () => {
	const parse = ( schema : v.GenericSchema, input : unknown ) => {
		const result = v.safeParse( schema, input )

		return result.success ? result.output : result.issues.map( ( issue ) => issue.message )
	}

	it( 'takes a number or a string holding one, and nothing Number() would wave through', () => {
		expect( [ 12, '12', ' 1.5 ', '-3' ].map( ( input ) => parse( numberish(), input ) ) ).toEqual( [ 12, 12, 1.5, -3 ] )
		expect( [ true, null, '', ' ', '12abc', [], NaN, Infinity ].map( ( input ) => parse( numberish( 'Not a number' ), input ) ) ).toEqual( Array( 8 ).fill( [ 'Not a number' ] ) )
		expect( parse( numberish(), undefined ) ).toEqual( [ 'Required' ] )
	} )

	it( 'insists on whole numbers, and range checks chain after', () => {
		expect( parse( integerish(), '7' ) ).toBe( 7 )
		expect( parse( integerish(), '7.5' ) ).toEqual( [ 'Must be a whole number' ] )
		expect( parse( v.pipe( integerish(), v.minValue( 0 ) ), '-1' ) ).toEqual( [ 'Must be at least 0' ] )
	} )

	it( 'reads a cleared box as left out, but not a null', () => {
		const schema = v.object( { stock: blankOr( v.pipe( integerish(), v.minValue( 0 ) ) ) } )

		expect( parse( schema, { stock: '' } ) ).toEqual( { stock: undefined } )
		expect( parse( schema, {} ) ).toEqual( {} )
		expect( parse( schema, { stock: '4' } ) ).toEqual( { stock: 4 } )
		expect( parse( schema, { stock: '-4' } ) ).toEqual( [ 'Must be at least 0' ] )
		expect( parse( schema, { stock: null } ) ).not.toEqual( { stock: 0 } )
	} )
} )
