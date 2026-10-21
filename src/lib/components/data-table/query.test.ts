import { describe, expect, it } from 'vitest'
import { parsePageQuery, toPageQuery, toSearchParams, type TableQuery } from './query'

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
