import { describe, expect, it } from 'vitest'
import type { PageQuery } from '#lib/components/data-table/index.js'
import { describeQuery, exportAll, exportFormat, exportResponse, type ExportColumn } from './export'

type Row = { name : string, amount : number, joined : Date }

const rows : Row[] = [
	{ name: 'Ada "the first" Lovelace, née Byron', amount: 1234.5, joined: new Date( '2026-10-01T12:00:00Z' ) },
	{ name: '=HYPERLINK("http://x")', amount: -3, joined: new Date( '2026-10-02T12:00:00Z' ) }
]
const columns : ExportColumn<Row>[] = [
	{ header: 'Name', value: ( row ) => row.name },
	{ header: 'Amount', value: ( row ) => row.amount },
	{ header: 'Joined', value: ( row ) => row.joined }
]

describe( 'exportFormat / exportAll', () => {
	it( 'knows csv, xlsx and json, and nothing else', () => {
		expect( exportFormat( new URL( 'http://x/?export=xlsx' ) ) ).toBe( 'xlsx' )
		expect( exportFormat( new URL( 'http://x/?export=pdf' ) ) ).toBeNull()
		expect( exportFormat( new URL( 'http://x/' ) ) ).toBeNull()
	} )

	it( 'takes the page off the query, up to the ceiling', () => {
		expect( exportAll( { skip: 40, take: 20, search: 'a', searchBy: 'all', filters: {} } ) ).toMatchObject( { skip: 0, take: 50_000, search: 'a' } )
	} )
} )

describe( 'exportResponse', () => {
	it( 'writes CSV that Excel reads: BOM, CRLF, quoting, and no formulas', async() => {
		const response = await exportResponse( 'csv', 'Team members', columns, rows )
		const bytes = new Uint8Array( await response.arrayBuffer() )

		expect( response.headers.get( 'content-disposition' ) ).toMatch( /^attachment; filename="team-members-\d{4}-\d{2}-\d{2}\.csv"$/ )
		// The BOM, read as bytes: text() would drop it.
		expect( [ ...bytes.slice( 0, 3 ) ] ).toEqual( [ 0xef, 0xbb, 0xbf ] )
		expect( new TextDecoder().decode( bytes ).split( '\r\n' ) ).toEqual( [
			'Name,Amount,Joined',
			'"Ada ""the first"" Lovelace, née Byron",1234.5,2026-10-01',
			'"\'=HYPERLINK(""http://x"")",-3,2026-10-02',
			''
		] )
	} )

	it( 'writes an .xlsx workbook', async() => {
		const response = await exportResponse( 'xlsx', 'Team', columns, rows )
		const bytes = new Uint8Array( await response.arrayBuffer() )

		expect( response.headers.get( 'content-type' ) ).toContain( 'spreadsheetml' )
		// A zip archive.
		expect( [ ...bytes.slice( 0, 2 ) ] ).toEqual( [ 0x50, 0x4b ] )
	} )

	it( 'answers the print page\'s table as JSON, with the filters', async() => {
		const table = await ( await exportResponse( 'json', 'Team', columns, rows, { filters: [ 'Role: Admin' ] } ) ).json()

		expect( table ).toMatchObject( { title: 'Team', headers: [ 'Name', 'Amount', 'Joined' ], filters: [ 'Role: Admin' ] } )
		expect( table.rows[ 0 ] ).toEqual( [ rows[ 0 ].name, '1234.5', 'Oct 1, 2026' ] )
	} )
} )

describe( 'describeQuery', () => {
	it( 'names the filters that were on, in words', () => {
		const query : PageQuery = { skip: 0, take: 10, search: 'ada', searchBy: 'all', filters: { role: [ 'admin', 'owner' ], unknown: [ 'x' ] }, startDate: '2026-10-01', endDate: '2026-10-21' }

		expect( describeQuery( query, { search: 'Search', date: 'Created', facets: { role: { title: 'Role', options: { admin: 'Admin' } } } } ) ).toEqual( [
			'Search: ada',
			'Role: Admin, owner',
			'Created: 2026-10-01 – 2026-10-21'
		] )
	} )
} )
