import { describe, expect, it, vi } from 'vitest'
import { createHttp, HttpError } from './http'

const jsonResponse = ( body : unknown, status = 200 ) => new Response( JSON.stringify( body ), { status } )

// A fetch mock that records the call and answers with `respond()`.
const fetchMock = ( respond : () => Response | Promise<Response> = () => jsonResponse( {} ) ) =>
	vi.fn( async( _input : RequestInfo | URL, _init ?: RequestInit ) => respond() )

const callOf = ( fetch : ReturnType<typeof fetchMock> ) => {
	const [ url, init ] = fetch.mock.calls[ 0 ]

	return { url: String( url ), init: init!, headers: new Headers( init!.headers ) }
}

describe( 'createHttp', () => {
	it( 'adds params ( skipping empty, repeating arrays ) and asks for JSON', async() => {
		const fetch = fetchMock( () => jsonResponse( { ok: 1 } ) )
		const http = createHttp( { fetch } )

		expect( await http.get( '/api/x?a=1', { params: { b: 2, c: [ 'x', 'y' ], skip: undefined, none: null } } ) ).toEqual( { ok: 1 } )

		const { url, headers } = callOf( fetch )

		expect( url ).toBe( '/api/x?a=1&b=2&c=x&c=y' )
		expect( headers.get( 'accept' ) ).toBe( 'application/json' )
	} )

	it( 'sends objects as JSON and FormData untouched', async() => {
		const fetch = fetchMock()
		const http = createHttp( { fetch } )

		await http.post( '/api/x', { name: 'Ada' } )
		expect( callOf( fetch ).init.body ).toBe( '{"name":"Ada"}' )
		expect( callOf( fetch ).headers.get( 'content-type' ) ).toBe( 'application/json' )

		const form = new FormData()

		fetch.mockClear()
		await http.post( '/api/x', form )
		expect( callOf( fetch ).init.body ).toBe( form )
		expect( callOf( fetch ).headers.has( 'content-type' ) ).toBe( false )
	} )

	it( 'prefixes the base URL, but not absolute URLs, and lets per-call headers win', async() => {
		const fetch = fetchMock()
		const http = createHttp( { fetch, baseUrl: 'https://api.test', headers: { 'x-app': 'a' } } )

		await http.get( '/users', { headers: { 'x-app': 'b' } } )
		expect( callOf( fetch ).url ).toBe( 'https://api.test/users' )
		expect( callOf( fetch ).headers.get( 'x-app' ) ).toBe( 'b' )

		fetch.mockClear()
		await http.get( 'https://other.test/x' )
		expect( callOf( fetch ).url ).toBe( 'https://other.test/x' )
	} )

	it( 'returns undefined for an empty body', async() => {
		const http = createHttp( { fetch: fetchMock( () => new Response( null, { status: 204 } ) ) } )

		expect( await http.delete( '/api/x' ) ).toBeUndefined()
	} )

	it( 'throws HttpError with the body on non-2xx, exposing message and field errors', async() => {
		const http = createHttp( { fetch: fetchMock( () => jsonResponse( { message: 'Check the form', errors: { email: [ 'Taken' ] } }, 400 ) ) } )
		const error = await http.post<never>( '/api/x', {} ).catch( ( caught ) => caught as HttpError )

		expect( error ).toBeInstanceOf( HttpError )
		expect( error ).toMatchObject( { kind: 'http', status: 400, unreachable: false } )
		expect( error.messageOr( 'Fallback' ) ).toBe( 'Check the form' )
		expect( error.fieldErrors ).toEqual( { email: [ 'Taken' ] } )
	} )

	it( 'falls back when the error body has no usable message', async() => {
		const http = createHttp( { fetch: fetchMock( () => new Response( '<html>Bad gateway</html>', { status: 502 } ) ) } )
		const error = await http.get<never>( '/api/x' ).catch( ( caught ) => caught as HttpError )

		expect( error.messageOr( 'Fallback' ) ).toBe( 'Fallback' )
		expect( error.fieldErrors ).toBeUndefined()
	} )

	it( 'classifies a connection failure as network, unreachable', async() => {
		const http = createHttp( { fetch: fetchMock( () => {
			throw new TypeError( 'Failed to fetch' )
		} ) } )

		await expect( http.get( '/api/x' ) ).rejects.toMatchObject( { kind: 'network', status: 0, unreachable: true } )
	} )

	it( 'times out', async() => {
		const hanging = vi.fn( ( _input : RequestInfo | URL, init ?: RequestInit ) => new Promise<Response>( ( _resolve, reject ) => {
			init?.signal?.addEventListener( 'abort', () => reject( init.signal!.reason ) )
		} ) )
		const http = createHttp( { fetch: hanging } )

		await expect( http.get( '/api/slow', { timeout: 20 } ) ).rejects.toMatchObject( { kind: 'timeout' } )
	} )
} )
