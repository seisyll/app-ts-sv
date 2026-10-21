import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TableQuery } from './query'
import { TableSource } from './table-source.svelte'

type Row = { id : string }

const query = ( overrides : Partial<TableQuery> = {} ) : TableQuery => ( {
	pageIndex: 0,
	pageSize : 10,
	search   : '',
	searchBy : 'all',
	filters  : {},
	immediate: true,
	...overrides
} )

const ok = ( rows : Row[], total = rows.length ) => new Response( JSON.stringify( { rows, total } ), { status: 200 } )

// A typed fetch mock answering every call with `respond()`.
const fetchMock = ( respond : () => Response | Promise<Response> = () => ok( [] ) ) =>
	vi.fn( async( _input : RequestInfo | URL, _init ?: RequestInit ) => respond() )

// A fetch whose answers the test releases by hand, to control ordering.
function deferredFetch() {
	const pending : Array<( response : Response ) => void> = []
	const fetch = fetchMock( () => new Promise<Response>( ( resolve ) => pending.push( resolve ) ) )

	return { fetch, answer: ( index : number, response : Response ) => pending[ index ]( response ) }
}

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) )

describe( 'TableSource', () => {
	afterEach( () => vi.useRealTimers() )

	it( 'starts from the initial page, including a degraded one', () => {
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0, error: 'Down' }, fetch: vi.fn() } )

		expect( source.rows ).toEqual( [] )
		expect( source.error ).toBe( 'Down' )
	} )

	it( 'requests the query as URL params, with the fixed params merged in', async() => {
		const fetch = fetchMock( () => ok( [ { id: 'a' } ], 31 ) )
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fixed: { status: 'unpaid' }, fetch } )

		source.apply( query( { pageIndex: 3, search: 'ada', sort: 'name', dir: 'desc', filters: { plan: [ 'pro' ] } } ) )
		await settle()

		const url = new URL( fetch.mock.calls[ 0 ][ 0 ] as string, 'http://localhost' )

		expect( url.pathname ).toBe( '/api/x' )
		expect( Object.fromEntries( url.searchParams ) ).toMatchObject( { skip: '30', take: '10', search: 'ada', sort: 'name', dir: 'desc', 'f.plan': 'pro', status: 'unpaid' } )
		expect( source.rows ).toEqual( [ { id: 'a' } ] )
		expect( source.total ).toBe( 31 )
		expect( source.loading ).toBe( false )
	} )

	it( 'debounces typing but fires a click at once, dropping the queued keystrokes', async() => {
		vi.useFakeTimers()

		const fetch = fetchMock()
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch } )

		source.apply( query( { search: 'a', immediate: false } ) )
		source.apply( query( { search: 'ad', immediate: false } ) )
		expect( fetch ).not.toHaveBeenCalled()

		source.apply( query( { search: 'ad', pageIndex: 1 } ) )
		expect( fetch ).toHaveBeenCalledOnce()

		await vi.advanceTimersByTimeAsync( 1000 )
		expect( fetch ).toHaveBeenCalledOnce()
	} )

	it( 'ignores an older answer that arrives after a newer one', async() => {
		const { fetch, answer } = deferredFetch()
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch } )

		source.apply( query( { pageIndex: 0 } ) )
		source.apply( query( { pageIndex: 1 } ) )
		answer( 1, ok( [ { id: 'page-2' } ] ) )
		await settle()
		answer( 0, ok( [ { id: 'page-1' } ] ) )
		await settle()

		expect( source.rows ).toEqual( [ { id: 'page-2' } ] )
	} )

	it( 'keeps the previous rows on failure and reports the endpoint\'s message', async() => {
		const fetch = fetchMock( () => new Response( JSON.stringify( { message: 'Nope' } ), { status: 500 } ) )
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [ { id: 'a' } ], total: 1 }, fetch } )

		await source.refresh()

		expect( source.rows ).toEqual( [ { id: 'a' } ] )
		expect( source.error ).toBe( 'Nope' )
		expect( source.loading ).toBe( false )
	} )

	it( 'uses its own message when the endpoint gives none, and says so when offline', async() => {
		const silent = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, errorMessage: 'Could not load', fetch: fetchMock( () => new Response( '', { status: 500 } ) ) } )

		await silent.refresh()
		expect( silent.error ).toBe( 'Could not load' )

		const offline = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch: fetchMock( () => {
			throw new TypeError( 'Failed to fetch' )
		} ) } )

		await offline.refresh()
		expect( offline.error ).toMatch( /reach the server/i )
	} )

	it( 'refresh re-runs the current query', async() => {
		const fetch = fetchMock()
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch } )

		source.apply( query( { pageIndex: 4 } ) )
		await settle()
		await source.refresh()

		expect( source.query.pageIndex ).toBe( 4 )
		expect( fetch.mock.calls[ 1 ][ 0 ] ).toContain( 'skip=40' )
	} )

	it( 'destroy drops in-flight work and clears loading', async() => {
		const { fetch, answer } = deferredFetch()
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch } )

		source.apply( query() )
		expect( source.loading ).toBe( true )

		source.destroy()
		expect( source.loading ).toBe( false )

		answer( 0, ok( [ { id: 'late' } ] ) )
		await settle()
		expect( source.rows ).toEqual( [] )
	} )

	it( 'builds an export URL for every matching row', () => {
		const source = new TableSource<Row>( { path: '/api/x', initial: { rows: [], total: 0 }, fetch: vi.fn() } )

		source.apply( { ...query( { pageIndex: 5, search: 'ada' } ), immediate: false } )
		const url = new URL( source.exportUrl( 'csv' ), 'http://localhost' )

		expect( url.searchParams.get( 'skip' ) ).toBe( '0' )
		expect( url.searchParams.get( 'search' ) ).toBe( 'ada' )
		expect( url.searchParams.get( 'export' ) ).toBe( 'csv' )
		source.destroy()
	} )
} )
