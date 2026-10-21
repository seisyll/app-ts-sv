import { describe, expect, it } from 'vitest'
import { fromUrlParams, parsePageQuery, toPageQuery, toSearchParams, toUrlParams, type TableQuery } from './query'

const base : TableQuery = {
	pageIndex: 2,
	pageSize : 20,
	search   : 'ada lovelace',
	searchBy : 'name',
	sort     : 'createdAt',
	dir      : 'desc',
	filters  : { status: [ 'active', 'trial' ], plan: [ 'pro' ] },
	startDate: '2026-01-01',
	endDate  : '2026-01-31',
	immediate: true
}

describe( 'toPageQuery', () => {
	it( 'turns a page index into skip/take, or drops paging for an export', () => {
		expect( toPageQuery( base ) ).toMatchObject( { skip: 40, take: 20 } )
		expect( toPageQuery( base, false ) ).toMatchObject( { skip: 0, take: 20 } )
	} )

	it( 'only carries a direction alongside a sort', () => {
		expect( toPageQuery( { ...base, sort: undefined } ).dir ).toBeUndefined()
		expect( toPageQuery( { ...base, dir: undefined } ).dir ).toBe( 'asc' )
	} )
} )

describe( 'toSearchParams / parsePageQuery', () => {
	it( 'round-trips a full query', () => {
		const query = toPageQuery( base )

		expect( parsePageQuery( toSearchParams( query ) ) ).toEqual( query )
	} )

	it( 'leaves defaults out of the URL and repeats a facet key per value', () => {
		const params = toSearchParams( toPageQuery( { ...base, search: '', searchBy: 'all', sort: undefined, startDate: undefined, endDate: undefined } ) )

		expect( [ ...params.keys() ] ).toEqual( [ 'skip', 'take', 'f.status', 'f.status', 'f.plan' ] )
	} )

	it( 'clamps and shape-checks hostile input', () => {
		const parsed = parsePageQuery( new URLSearchParams( 'skip=-5&take=99999&dir=sideways&sort=name&startDate=yesterday&f.=x&search=%20%20hi%20' ) )

		expect( parsed ).toMatchObject( {
			skip     : 0,
			take     : 100,
			sort     : 'name',
			dir      : 'asc',
			search   : 'hi',
			startDate: undefined,
			filters  : {}
		} )
	} )

	it( 'falls back to defaults for a bare request', () => {
		expect( parsePageQuery( new URLSearchParams() ) ).toEqual( {
			skip     : 0,
			take     : 10,
			search   : '',
			searchBy : 'all',
			sort     : undefined,
			dir      : undefined,
			filters  : {},
			startDate: undefined,
			endDate  : undefined
		} )
	} )
} )

describe( 'toUrlParams / fromUrlParams', () => {
	it( 'round-trips a full query in human words', () => {
		const params = toUrlParams( base )

		expect( String( params ) ).toBe( 'page=3&size=20&sort=createdAt&dir=desc&q=ada+lovelace&in=name&from=2026-01-01&to=2026-01-31&status=active&status=trial&plan=pro' )
		expect( fromUrlParams( params ) ).toEqual( base )
	} )

	it( 'leaves defaults out, against the table page size', () => {
		const query = { ...base, pageIndex: 0, search: '', searchBy: 'name', sort: undefined, startDate: undefined, endDate: undefined, filters: {} }

		expect( String( toUrlParams( query, { pageSize: 20 } ) ) ).toBe( '' )
		expect( fromUrlParams( new URLSearchParams(), { pageSize: 20 } ) ).toMatchObject( { pageIndex: 0, pageSize: 20, searchBy: 'all', filters: {} } )
	} )

	it( 'clamps and shape-checks hostile input', () => {
		const parsed = fromUrlParams( new URLSearchParams( 'page=-3&size=5000&dir=up&sort=name&from=2026-02-31&to=soon&q=%20x%20&role=' ) )

		expect( parsed ).toMatchObject( { pageIndex: 0, pageSize: 100, sort: 'name', dir: 'asc', search: 'x', startDate: undefined, endDate: undefined, filters: { role: [] } } )
	} )

	it( 'feeds a load through toPageQuery', () => {
		expect( toPageQuery( fromUrlParams( new URLSearchParams( 'page=2&role=admin' ) ) ) ).toMatchObject( { skip: 10, take: 10, filters: { role: [ 'admin' ] } } )
	} )
} )
