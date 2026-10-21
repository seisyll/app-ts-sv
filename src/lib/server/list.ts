import { APP } from '$lib/config'
import type { PageQuery } from '$lib/components/data-table'

/* ―― » A list endpoint's query → Prisma args ( the server half of <DataTable> + TableSource;
        billing-app's page.ts helpers, folded into one call ). Everything the browser can ask
        for is allow-listed here: unknown search fields, facets and sort columns are ignored.

          const args = listArgs( parsePageQuery( url.searchParams ), USERS )
          const [ rows, total ] = await Promise.all( [ db.user.findMany( args ), db.user.count( { where: args.where } ) ] ) */
export type ListSpec = {
	// Columns `search` looks in; `searchBy` may narrow it to one of them.
	search ?      : readonly string[]
	// Facet column id → the Prisma condition for its selected values.
	facets ?      : Record<string, ( values : string[] ) => object>
	// Sortable columns, and the order when the query names none ( or a disallowed one ).
	sort ?        : readonly string[]
	defaultSort ? : Record<string, 'asc' | 'desc'>
	// Column that startDate / endDate filter ( calendar days in APP.timeZone, inclusive ).
	date ?        : string
}

// Minutes `timeZone` is ahead of UTC at `date`.
function offsetMinutes( date : Date, timeZone : string ) : number {
	const parts = Object.fromEntries( new Intl.DateTimeFormat( 'en-US', {
		timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
	} ).formatToParts( date ).map( ( part ) => [ part.type, Number( part.value ) ] ) )

	return ( Date.UTC( parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second ) - date.getTime() ) / 60_000
}

// The instant a calendar day ( YYYY-MM-DD ) starts in `timeZone`.
// ponytail: offset taken at UTC midnight, so a DST-change day can be an hour off.
export function startOfDay( day : string, timeZone : string = APP.timeZone ) : Date {
	const utcMidnight = new Date( `${ day }T00:00:00Z` )

	return new Date( utcMidnight.getTime() - offsetMinutes( utcMidnight, timeZone ) * 60_000 )
}

const nextDay = ( day : string ) => new Date( Date.parse( `${ day }T00:00:00Z` ) + 86_400_000 ).toISOString().slice( 0, 10 )

export function listArgs( query : PageQuery, spec : ListSpec ) {
	const and : object[] = []

	if ( query.search && spec.search?.length ) {
		const fields = spec.search.includes( query.searchBy ) ? [ query.searchBy ] : spec.search

		and.push( { OR: fields.map( ( field ) => ( { [ field ]: { contains: query.search, mode: 'insensitive' } } ) ) } )
	}

	for ( const [ id, values ] of Object.entries( query.filters ) ) {
		const facet = spec.facets?.[ id ]

		if ( facet && values.length )
			and.push( facet( values ) )
	}

	if ( spec.date && ( query.startDate || query.endDate ) ) {
		and.push( { [ spec.date ]: {
			...( query.startDate ? { gte: startOfDay( query.startDate ) } : {} ),
			...( query.endDate ? { lt: startOfDay( nextDay( query.endDate ) ) } : {} )
		} } )
	}

	const orderBy = query.sort && spec.sort?.includes( query.sort ) ? { [ query.sort ]: query.dir ?? 'asc' } : spec.defaultSort

	return { where: and.length ? { AND: and } : {}, orderBy, skip: query.skip, take: query.take }
}
