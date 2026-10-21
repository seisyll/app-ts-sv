import writeExcelFile from 'write-excel-file/node'
import type { PageQuery } from '$lib/components/data-table'
import { date } from '$lib/format'

/* ―― » One way out for every list ( billing-app's export.ts ). A list endpoint answers
        `?export=csv|xlsx|json` with the WHOLE filtered set — the search, facets and sort the
        person is looking at, not the ten rows on screen. The endpoint gives its rows and a
        column list; everything about the file is here. `json` isn't a download: it is the
        print page's table ( /app/print ), which the browser saves as a PDF.

          const format = exportFormat( event.url )
          if ( format ) return exportResponse( format, title, COLUMNS, ( await listX( exportAll( query ) ) ).rows, { filters } ) */

export type ExportFormat = 'csv' | 'xlsx' | 'json'

// What an export may read, in place of the paged ceiling ( PAGE_SIZE_MAX ): a whole register,
// still bounded.
export const EXPORT_MAX = 50_000

export type ExportValue = string | number | Date | null | undefined

export type ExportColumn<T> = { header : string, value : ( row : T ) => ExportValue }

// What the print page shows above the table: the filters that were on.
export type PrintTable = { title : string, headers : string[], rows : string[][], filters : string[] }

const FORMATS : readonly ExportFormat[] = [ 'csv', 'xlsx', 'json' ]

// The format asked for, or null: the ordinary paged answer, unknown values included.
export function exportFormat( url : URL ) : ExportFormat | null {
	const asked = url.searchParams.get( 'export' ) ?? ''

	return ( FORMATS as readonly string[] ).includes( asked ) ? asked as ExportFormat : null
}

// The query with the page taken off: every matching row, up to the ceiling.
export const exportAll = ( query : PageQuery ) : PageQuery => ( { ...query, skip: 0, take: EXPORT_MAX } )

// For the screen and the print page: dates in the person's language and APP.timeZone.
const shown = ( value : ExportValue ) => ( value instanceof Date ? date( value, { dateStyle: 'medium' } ) : value === null || value === undefined ? '' : String( value ) )

/* ―― » A CSV cell. Quoted when it holds a comma, quote or line break ( RFC 4180 ); and a cell a
        spreadsheet would run as a formula ( = + - @, or a tab / CR before one ) gets a leading
        quote, so a name like "=HYPERLINK(…)" opens as text. */
function csvCell( value : ExportValue ) : string {
	const raw = value instanceof Date ? value.toISOString().slice( 0, 10 ) : shown( value )
	const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test( raw ) ? `'${ raw }` : raw

	return /[",\r\n]/.test( safe ) ? `"${ safe.replaceAll( '"', '""' ) }"` : safe
}

// "Users" → users-2026-10-21: what it is, and when.
const fileName = ( title : string ) => `${ title.toLowerCase().replace( /[^\p{L}\p{N}]+/gu, '-' ).replace( /^-|-$/g, '' ) || 'export' }-${ new Date().toISOString().slice( 0, 10 ) }`

// The UTF-8 byte-order mark: without it Excel opens a CSV in the machine's code page and every
// accented name arrives as mojibake.
const BOM = '﻿'

export async function exportResponse<T>( format : ExportFormat, title : string, columns : ExportColumn<T>[], rows : T[], { filters = [] } : { filters ?: string[] } = {} ) : Promise<Response> {
	const headers = columns.map( ( column ) => column.header )

	if ( format === 'json' )
		return Response.json( { title, headers, rows: rows.map( ( row ) => columns.map( ( column ) => shown( column.value( row ) ) ) ), filters } satisfies PrintTable )

	const disposition = ( extension : string ) => `attachment; filename="${ encodeURIComponent( fileName( title ) ) }.${ extension }"`

	if ( format === 'csv' ) {
		const lines = [ headers.map( csvCell ), ...rows.map( ( row ) => columns.map( ( column ) => csvCell( column.value( row ) ) ) ) ].map( ( cells ) => cells.join( ',' ) )

		return new Response( `${ BOM }${ lines.join( '\r\n' ) }\r\n`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': disposition( 'csv' ) } } )
	}

	// Numbers stay numbers and dates dates, so a column sums and sorts in the spreadsheet. A
	// string is never a formula here: the writer stores it as text.
	const cell = ( value : ExportValue ) => ( value instanceof Date
		? { value, type: Date, format: 'yyyy-mm-dd' }
		: typeof value === 'number' ? { value, type: Number } : { value: shown( value ), type: String } )
	const buffer = await writeExcelFile( [
		headers.map( ( header ) => ( { value: header, fontWeight: 'bold' as const } ) ),
		...rows.map( ( row ) => columns.map( ( column ) => cell( column.value( row ) ) ) )
	] ).toBuffer()

	return new Response( new Uint8Array( buffer ), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': disposition( 'xlsx' ) } } )
}

/* ―― » The filters a query had, as lines for the print page: "Search: ada", "Role: Admin,
        Member", "Created: 2026-10-01 – 2026-10-21". `facets` names each facet column and its
        values; an unknown column or value is left as it came. */
export function describeQuery( query : PageQuery, labels : { search ?: string, date ?: string, facets ?: Record<string, { title : string, options ?: Record<string, string> }> } ) : string[] {
	const lines : string[] = []

	if ( query.search && labels.search )
		lines.push( `${ labels.search }: ${ query.search }` )

	for ( const [ column, values ] of Object.entries( query.filters ) ) {
		const facet = labels.facets?.[ column ]

		if ( facet && values.length )
			lines.push( `${ facet.title }: ${ values.map( ( value ) => facet.options?.[ value ] ?? value ).join( ', ' ) }` )
	}

	if ( labels.date && ( query.startDate || query.endDate ) )
		lines.push( `${ labels.date }: ${ query.startDate ?? '…' } – ${ query.endDate ?? '…' }` )

	return lines
}
