import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { fieldErrors } from './validation'

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
