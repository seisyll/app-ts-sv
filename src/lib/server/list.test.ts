import { describe, expect, it } from 'vitest'
import type { PageQuery } from '$lib/components/data-table'
import { listArgs, startOfDay, type ListSpec } from './list'

const query = ( overrides : Partial<PageQuery> = {} ) : PageQuery => ( { skip: 20, take: 10, search: '', searchBy: 'all', filters: {}, ...overrides } )

const spec : ListSpec = {
	search     : [ 'name', 'email' ],
	facets     : { role: ( values ) => ( { role: { in: values } } ) },
	sort       : [ 'name', 'createdAt' ],
	defaultSort: { createdAt: 'desc' },
	date       : 'createdAt'
}

describe( 'listArgs', () => {
	it( 'pages, and falls back to the default sort', () => {
		expect( listArgs( query(), spec ) ).toEqual( { where: {}, orderBy: { createdAt: 'desc' }, skip: 20, take: 10 } )
	} )

	it( 'searches every allowed field, or the one searchBy names', () => {
		expect( listArgs( query( { search: 'ada' } ), spec ).where ).toEqual( { AND: [ { OR: [
			{ name: { contains: 'ada', mode: 'insensitive' } },
			{ email: { contains: 'ada', mode: 'insensitive' } }
		] } ] } )
		expect( listArgs( query( { search: 'ada', searchBy: 'email' } ), spec ).where ).toEqual( { AND: [ { OR: [ { email: { contains: 'ada', mode: 'insensitive' } } ] } ] } )
		// A field outside the allow-list widens to all, never reaches Prisma.
		expect( JSON.stringify( listArgs( query( { search: 'x', searchBy: 'password' } ), spec ) ) ).not.toContain( 'password' )
	} )

	it( 'applies known facets and ignores the rest', () => {
		expect( listArgs( query( { filters: { role: [ 'admin' ], secret: [ 'x' ] } } ), spec ).where ).toEqual( { AND: [ { role: { in: [ 'admin' ] } } ] } )
	} )

	it( 'sorts only by allowed columns', () => {
		expect( listArgs( query( { sort: 'name', dir: 'desc' } ), spec ).orderBy ).toEqual( { name: 'desc' } )
		expect( listArgs( query( { sort: 'password', dir: 'asc' } ), spec ).orderBy ).toEqual( { createdAt: 'desc' } )
	} )

	it( 'turns a day range into [ start of first day, start of the day after last )', () => {
		expect( listArgs( query( { startDate: '2026-03-01', endDate: '2026-03-31' } ), spec ).where ).toEqual( { AND: [ { createdAt: {
			gte: new Date( '2026-03-01T00:00:00Z' ),
			lt : new Date( '2026-04-01T00:00:00Z' )
		} } ] } )
	} )
} )

describe( 'startOfDay', () => {
	it( 'is midnight in the given zone', () => {
		expect( startOfDay( '2026-03-01', 'UTC' ).toISOString() ).toBe( '2026-03-01T00:00:00.000Z' )
		expect( startOfDay( '2026-03-01', 'Asia/Jakarta' ).toISOString() ).toBe( '2026-02-28T17:00:00.000Z' )
		expect( startOfDay( '2026-03-01', 'America/New_York' ).toISOString() ).toBe( '2026-03-01T05:00:00.000Z' )
	} )
} )
