import { describe, expect, it, vi } from 'vitest'
import { load } from './+page.server'

// The print page reads one list of this app, through the visitor's own fetch, and nothing else.
describe( 'print page', () => {
	const run = ( src : string, answer = new Response( JSON.stringify( { title: 'T', headers: [], rows: [], filters: [] } ) ) ) => {
		const fetch = vi.fn( async() => answer )
		const url = new URL( `http://localhost/app/print?src=${ encodeURIComponent( src ) }` )
		const result = ( load as unknown as ( event : object ) => Promise<unknown> )( { url, fetch } )

		return { fetch, result: result.then( ( value ) => value, ( caught ) => caught as { status : number } ) }
	}

	it( 'reads an /api/ list as JSON through event.fetch', async() => {
		const { fetch, result } = run( '/api/users?f.role=admin&export=csv' )

		expect( await result ).toMatchObject( { table: { title: 'T' }, autoPrint: true } )
		expect( fetch ).toHaveBeenCalledWith( '/api/users?f.role=admin&export=json' )
	} )

	it( 'refuses anything that isn\'t one of this app\'s lists', async() => {
		for ( const src of [ 'https://evil.test/api/x', '//evil.test/api/x', '/api/../app', '/api/auth/list-sessions', '/app/users', '' ] )
			expect( ( await run( src ).result as { status : number } ).status, src ).toBe( 400 )
	} )

	it( 'passes on the endpoint\'s refusal', async() => {
		const { result } = run( '/api/users', new Response( '{}', { status: 403 } ) )

		expect( ( await result as { status : number } ).status ).toBe( 403 )
	} )
} )
