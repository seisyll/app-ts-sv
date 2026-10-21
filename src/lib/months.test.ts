import { describe, expect, it } from 'vitest'
import { currentMonth, lastMonths, monthFromKey, monthWindow, shiftMonth } from './months'

describe( 'months', () => {
	const now = new Date( '2026-10-21T12:00:00Z' )

	it( 'spans a calendar month in UTC, leap years included', () => {
		expect( monthWindow( 2028, 2 ) ).toEqual( { key: '2028-02', start: new Date( '2028-02-01T00:00:00Z' ), end: new Date( '2028-03-01T00:00:00Z' ) } )
		expect( shiftMonth( monthWindow( 2026, 1 ), -1 ).key ).toBe( '2025-12' )
	} )

	it( 'reads a key from a URL, and refuses junk and months still to come', () => {
		expect( monthFromKey( '2026-03', now ).key ).toBe( '2026-03' )
		expect( monthFromKey( '2026-13', now ).key ).toBe( '2026-10' )
		expect( monthFromKey( '2027-01', now ).key ).toBe( '2026-10' )
		expect( monthFromKey( null, now ) ).toEqual( currentMonth( now ) )
	} )

	it( 'lists the last months, oldest first, gaps and all', () => {
		expect( lastMonths( 3, monthWindow( 2026, 1 ) ).map( ( window ) => window.key ) ).toEqual( [ '2025-11', '2025-12', '2026-01' ] )
	} )
} )
