import { dev } from '$app/env'
import { error, json } from '@sveltejs/kit'
import { calendarDay, parsePageQuery, type Paged } from '#lib/components/data-table/index.js'
import { CUSTOMERS, type Customer } from '../../../demo-data'
import type { RequestHandler } from './$types'

// Mock list endpoint for the playground's server-mode table: the real paging contract
// ( parsePageQuery → Paged ), served from a fixed array instead of a database.
// Extra knobs: ?delay=ms ( default 400 ), ?fail=1, ?export=csv.

// Allow-lists: parsePageQuery shapes the input, the endpoint decides what's exposed.
const SEARCHABLE = [ 'name', 'email' ] as const
const SORTABLE = [ 'name', 'email', 'plan', 'status', 'mrr', 'createdAt' ] as const
const FACETS = [ 'plan', 'status' ] as const

type Stats = { mrr : number }

const isOneOf = <T extends string>( list : readonly T[], value : string | undefined ) : value is T => list.includes( value as T )

// Spreadsheet apps execute cells starting with = + - @; prefix them so they stay text.
const csvCell = ( value : unknown ) => {
	const text = String( value ).replace( /^[=+\-@]/, '\'$&' )

	return /[",\n]/.test( text ) ? `"${ text.replace( /"/g, '""' ) }"` : text
}

export const GET : RequestHandler = async( { url } ) => {
	if ( !dev )
		error( 404 )

	await new Promise( ( resolve ) => setTimeout( resolve, Number( url.searchParams.get( 'delay' ) ?? 400 ) ) )

	if ( url.searchParams.get( 'fail' ) === '1' )
		return json( { message: 'Mock API failure ( toggled in the playground ).' }, { status: 503 } )

	const query = parsePageQuery( url.searchParams )
	let rows = CUSTOMERS

	if ( query.search ) {
		const needle = query.search.toLowerCase()
		const fields = isOneOf( SEARCHABLE, query.searchBy ) ? [ query.searchBy ] : SEARCHABLE

		rows = rows.filter( ( row ) => fields.some( ( field ) => row[ field ].toLowerCase().includes( needle ) ) )
	}

	for ( const [ column, values ] of Object.entries( query.filters ) ) {
		if ( isOneOf( FACETS, column ) )
			rows = rows.filter( ( row ) => values.includes( row[ column ] ) )
	}

	if ( query.startDate && query.endDate ) {
		const [ from, to ] = [ query.startDate, query.endDate ]

		rows = rows.filter( ( row ) => {
			const day = calendarDay( new Date( row.createdAt ) )

			return day >= from && day <= to
		} )
	}

	if ( isOneOf( SORTABLE, query.sort ) ) {
		const key = query.sort
		const sign = query.dir === 'desc' ? -1 : 1

		rows = rows.toSorted( ( a, b ) => ( a[ key ] < b[ key ] ? -1 : a[ key ] > b[ key ] ? 1 : 0 ) * sign )
	}

	if ( url.searchParams.get( 'export' ) === 'csv' ) {
		const header = [ 'id', 'name', 'email', 'plan', 'status', 'mrr', 'createdAt' ] as const
		const csv = [ header.join( ',' ), ...rows.map( ( row ) => header.map( ( key ) => csvCell( row[ key ] ) ).join( ',' ) ) ].join( '\n' )

		return new Response( `\ufeff${ csv }`, {
			headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="customers.csv"' }
		} )
	}

	return json( {
		rows : rows.slice( query.skip, query.skip + query.take ),
		total: rows.length,
		stats: { mrr: rows.reduce( ( sum, row ) => sum + row.mrr, 0 ) }
	} satisfies Paged<Customer, Stats> )
}
