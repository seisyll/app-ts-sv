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

// A real calendar day: the shape alone lets 2026-02-31 through.
const isDay = ( value : string ) => {
	const time = DAY.test( value ) ? Date.parse( `${ value }T00:00:00Z` ) : Number.NaN

	return Number.isFinite( time ) && new Date( time ).toISOString().startsWith( value )
}

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

		return isDay( value ) ? value : undefined
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

/* ―― » The page's own address bar ( <DataTable syncUrl> ), in words a person can read and
        edit — not the endpoint's skip/take:

          /app/users?page=2&size=20&sort=name&dir=desc&q=ada&in=email&from=2026-01-01&to=2026-01-31&role=admin

        Defaults are left out. Every other key is a facet ( column id → values ), so the
        table's filter columns must not be named like the keys below. A load reads the same
        query with `toPageQuery( fromUrlParams( url.searchParams ) )` — a trust boundary like
        `parsePageQuery`: clamped and shape-checked, still allow-listed by the endpoint. */
export const URL_KEYS = [ 'page', 'size', 'sort', 'dir', 'q', 'in', 'from', 'to' ] as const

export function toUrlParams( query : TableQuery, { pageSize = PAGE_SIZE_DEFAULT } = {} ) : URLSearchParams {
	const params = new URLSearchParams()
	const set = ( key : string, value : string | undefined, fallback ?: string ) => {
		if ( value && value !== fallback )
			params.set( key, value )
	}

	set( 'page', String( query.pageIndex + 1 ), '1' )
	set( 'size', String( query.pageSize ), String( pageSize ) )
	set( 'sort', query.sort )
	set( 'dir', query.sort ? query.dir : undefined, 'asc' )
	set( 'q', query.search )
	set( 'in', query.search ? query.searchBy : undefined, 'all' )
	set( 'from', query.startDate )
	set( 'to', query.endDate )

	for ( const [ column, values ] of Object.entries( query.filters ) )
		for ( const value of values )
			params.append( column, value )

	return params
}

export function fromUrlParams( params : URLSearchParams, { pageSize = PAGE_SIZE_DEFAULT } = {} ) : TableQuery {
	const int = ( key : string, fallback : number ) => {
		const value = Number.parseInt( params.get( key ) ?? '', 10 )

		return Number.isFinite( value ) ? value : fallback
	}
	const day = ( key : string ) => {
		const value = params.get( key ) ?? ''

		return isDay( value ) ? value : undefined
	}
	const filters : Record<string, string[]> = {}

	for ( const key of new Set( params.keys() ) ) {
		if ( !( URL_KEYS as readonly string[] ).includes( key ) )
			filters[ key ] = params.getAll( key ).filter( Boolean )
	}

	const sort = params.get( 'sort' ) || undefined

	return {
		pageIndex: Math.max( 1, int( 'page', 1 ) ) - 1,
		pageSize : Math.min( PAGE_SIZE_MAX, Math.max( 1, int( 'size', pageSize ) ) ),
		search   : ( params.get( 'q' ) ?? '' ).trim(),
		searchBy : params.get( 'in' ) || 'all',
		sort,
		dir      : sort ? ( params.get( 'dir' ) === 'desc' ? 'desc' : 'asc' ) : undefined,
		filters,
		startDate: day( 'from' ),
		endDate  : day( 'to' ),
		immediate: true
	}
}
