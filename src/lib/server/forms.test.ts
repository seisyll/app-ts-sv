import { describe, expect, it } from 'vitest'
import { isActionFailure, isHttpError } from '@sveltejs/kit'
import * as v from 'valibot'
import { readJson, validateForm } from './forms'

const schema = v.object( {
	name : v.pipe( v.string(), v.trim(), v.nonEmpty() ),
	email: v.pipe( v.string(), v.email() )
} )

const jsonRequest = ( body : string ) => new Request( 'http://localhost/api/x', { method: 'POST', body, headers: { 'content-type': 'application/json' } } )
const formRequest = ( fields : Record<string, string> ) => new Request( 'http://localhost/x', { method: 'POST', body: new URLSearchParams( fields ) } )

describe( 'readJson', () => {
	it( 'returns the parsed output', async() => {
		await expect( readJson( jsonRequest( '{"name":"  Ada ","email":"ada@example.test"}' ), schema ) ).resolves.toEqual( { name: 'Ada', email: 'ada@example.test' } )
	} )

	it( 'throws 400 with per-field messages for an invalid body', async() => {
		const thrown = await readJson( jsonRequest( '{"name":"","email":"x"}' ), schema ).catch( ( caught ) => caught )

		expect( isHttpError( thrown, 400 ) ).toBe( true )
		expect( thrown.body ).toEqual( {
			status : 400,
			message: 'Please fix the highlighted fields.',
			errors : { name: [ 'Required' ], email: [ 'Enter a valid email address' ] }
		} )
	} )

	it( 'treats malformed JSON as an invalid body, not a crash', async() => {
		const thrown = await readJson( jsonRequest( '{not json' ), schema ).catch( ( caught ) => caught )

		expect( isHttpError( thrown, 400 ) ).toBe( true )
		expect( thrown.body.errors ).toEqual( { _errors: [ 'Required' ] } )
	} )
} )

describe( 'validateForm', () => {
	it( 'fails with the form when invalid, without calling onValid', async() => {
		let called = false
		const result = await validateForm( formRequest( { name: '', email: 'x' } ), schema, () => {
			called = true
		} )

		expect( isActionFailure( result ) ).toBe( true )
		expect( called ).toBe( false )
	} )

	it( 'hands the valid form to onValid, or returns it', async() => {
		const saved = await validateForm( formRequest( { name: 'Ada', email: 'ada@example.test' } ), schema, ( form ) => form.data.name )
		const plain = await validateForm( formRequest( { name: 'Ada', email: 'ada@example.test' } ), schema )

		expect( saved ).toBe( 'Ada' )
		expect( plain ).toMatchObject( { form: { valid: true, data: { name: 'Ada' } } } )
	} )
} )
