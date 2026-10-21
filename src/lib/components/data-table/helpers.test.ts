import { describe, expect, it, vi } from 'vitest'
import type { Row } from '@tanstack/table-core'
import { runBulk } from './bulk'
import { escapeHtml } from './cells'
import { calendarDay, dateRangeFilter, facetedFilter, facetOptions } from './columns'

vi.mock( 'svelte-sonner', () => ( { toast: { promise: vi.fn() } } ) )

const rowWith = ( value : unknown ) => ( { getValue: () => value } ) as unknown as Row<unknown>

describe( 'facetOptions', () => {
	it( 'uses the value as label unless mapped', () => {
		expect( facetOptions( [ 'pro', 'free' ], { pro: 'Pro plan' } ) ).toEqual( [
			{ value: 'pro', label: 'Pro plan' },
			{ value: 'free', label: 'free' }
		] )
	} )
} )

describe( 'facetedFilter', () => {
	it( 'passes everything when nothing is selected, else only selected values', () => {
		expect( facetedFilter( rowWith( 'active' ), 'status', undefined ) ).toBe( true )
		expect( facetedFilter( rowWith( 'active' ), 'status', [] ) ).toBe( true )
		expect( facetedFilter( rowWith( 'active' ), 'status', [ 'active', 'trial' ] ) ).toBe( true )
		expect( facetedFilter( rowWith( 'churned' ), 'status', [ 'active' ] ) ).toBe( false )
	} )
} )

describe( 'dateRangeFilter', () => {
	// APP.timeZone is UTC in the template config.
	it( 'is inclusive on both ends', () => {
		const range = [ '2026-03-01', '2026-03-31' ]

		expect( dateRangeFilter( rowWith( '2026-03-01T00:00:00Z' ), 'at', range ) ).toBe( true )
		expect( dateRangeFilter( rowWith( '2026-03-31T23:59:59Z' ), 'at', range ) ).toBe( true )
		expect( dateRangeFilter( rowWith( '2026-04-01T00:00:00Z' ), 'at', range ) ).toBe( false )
		expect( dateRangeFilter( rowWith( new Date( '2026-02-28T23:59:59Z' ) ), 'at', range ) ).toBe( false )
	} )

	it( 'passes rows when there is no complete range or no readable date', () => {
		expect( dateRangeFilter( rowWith( '2026-03-05' ), 'at', [ '2026-03-01' ] ) ).toBe( true )
		expect( dateRangeFilter( rowWith( 'not a date' ), 'at', [ '2026-03-01', '2026-03-02' ] ) ).toBe( true )
	} )

	it( 'reads the calendar day in the configured zone', () => {
		expect( calendarDay( new Date( '2026-03-01T23:30:00Z' ) ) ).toBe( '2026-03-01' )
	} )
} )

describe( 'runBulk', () => {
	const copy = { loading: 'Working', success: ( ok : number ) => `${ ok } done`, error: 'Failed' }

	it( 'attempts every row even when one throws synchronously, and never rejects', async() => {
		const seen : number[] = []

		await expect( runBulk( [ 1, 2, 3 ], ( item ) => {
			seen.push( item )
			if ( item === 1 )
				throw new Error( 'sync' )
		}, copy ) ).resolves.toBeUndefined()

		expect( seen ).toEqual( [ 1, 2, 3 ] )
	} )

	it( 'resolves even when every row fails', async() => {
		await expect( runBulk( [ 1 ], () => Promise.reject( new Error( 'x' ) ), copy ) ).resolves.toBeUndefined()
	} )
} )

describe( 'escapeHtml', () => {
	it( 'neutralises markup', () => {
		expect( escapeHtml( `<img src=x onerror="alert('x')">&` ) ).toBe( '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;' )
	} )
} )
