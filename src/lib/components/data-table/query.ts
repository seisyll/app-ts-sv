// The paging contract between <DataTable> ( browser ) and a list endpoint ( server ).
// Isomorphic: TableSource serializes with `toSearchParams`, an endpoint reads the same
// params back with `parsePageQuery`.

// What the table reports whenever the user changes anything.
export type TableQuery = {
	pageIndex   : number
	pageSize    : number
	search      : string
	// 'all' or one column id.
	searchBy    : string
	sort ?      : string
	dir ?       : 'asc' | 'desc'
	// Faceted filters: column id → selected values.
	filters     : Record<string, string[]>
	// Calendar days, YYYY-MM-DD, inclusive.
	startDate ? : string
	endDate ?   : string
	// Typing debounces; a click ( page, sort, filter ) fires at once.
	immediate   : boolean
}

// One page of a list endpoint's answer. `stats` is whole-set data for cards above the table.
export type Paged<T, S = undefined> = {
	rows    : T[]
	total   : number
	stats ? : S
	// Set by a load that degraded to an empty page, so the table can say why.
	error ? : string
}

export type PageQuery = {
	skip        : number
	take        : number
	search      : string
	searchBy    : string
	sort ?      : string
	dir ?       : 'asc' | 'desc'
	filters     : Record<string, string[]>
	startDate ? : string
	endDate ?   : string
}

export const PAGE_SIZE_DEFAULT = 10
export const PAGE_SIZE_MAX = 100

const DAY = /^\d{4}-\d{2}-\d{2}$/
const FILTER_PREFIX = 'f.'

export function toPageQuery( query : TableQuery, paged = true ) : PageQuery {
	return {
		skip     : paged ? query.pageIndex * query.pageSize : 0,
		take     : query.pageSize,
		search   : query.search,
		searchBy : query.searchBy,
		sort     : query.sort,
		dir      : query.sort ? query.dir ?? 'asc' : undefined,
		filters  : query.filters,
		startDate: query.startDate,
		endDate  : query.endDate
	}
}

// Defaults are left out so URLs stay short; a facet repeats its key per value.
export function toSearchParams( query : PageQuery ) : URLSearchParams {
	const params = new URLSearchParams( { skip: String( query.skip ), take: String( query.take ) } )

	if ( query.search )
		params.set( 'search', query.search )

	if ( query.searchBy && query.searchBy !== 'all' )
		params.set( 'searchBy', query.searchBy )

	if ( query.sort ) {
		params.set( 'sort', query.sort )
		params.set( 'dir', query.dir ?? 'asc' )
	}

	if ( query.startDate )
		params.set( 'startDate', query.startDate )

	if ( query.endDate )
		params.set( 'endDate', query.endDate )

	for ( const [ column, values ] of Object.entries( query.filters ) )
		for ( const value of values )
			params.append( `${ FILTER_PREFIX }${ column }`, value )

	return params
}

/* ―― » Server side: read a list request back, clamped and shape-checked. This is a trust
        boundary — the result is well-formed, NOT safe: the endpoint must still allow-list
        `sort`, `searchBy` and filter column ids against what it actually exposes. */
export function parsePageQuery( params : URLSearchParams, { maxTake = PAGE_SIZE_MAX, defaultTake = PAGE_SIZE_DEFAULT } = {} ) : PageQuery {
	const int = ( key : string, fallback : number ) => {
		const value = Number.parseInt( params.get( key ) ?? '', 10 )

		return Number.isFinite( value ) ? value : fallback
	}
	const day = ( key : string ) => {
		const value = params.get( key ) ?? ''

		return DAY.test( value ) ? value : undefined
	}
	const filters : Record<string, string[]> = {}

	for ( const key of new Set( params.keys() ) ) {
		if ( key.startsWith( FILTER_PREFIX ) && key.length > FILTER_PREFIX.length )
			filters[ key.slice( FILTER_PREFIX.length ) ] = params.getAll( key )
	}

	const sort = params.get( 'sort' ) || undefined

	return {
		skip     : Math.max( 0, int( 'skip', 0 ) ),
		take     : Math.min( maxTake, Math.max( 1, int( 'take', defaultTake ) ) ),
		search   : ( params.get( 'search' ) ?? '' ).trim(),
		searchBy : params.get( 'searchBy' ) || 'all',
		sort,
		dir      : sort ? ( params.get( 'dir' ) === 'desc' ? 'desc' : 'asc' ) : undefined,
		filters,
		startDate: day( 'startDate' ),
		endDate  : day( 'endDate' )
	}
}
