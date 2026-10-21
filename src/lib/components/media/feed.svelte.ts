import type { Paged } from '$lib/components/data-table'
import { toSearchParams } from '$lib/components/data-table/query'
import { errorMessage, http } from '$lib/http'
import type { MediaKind, MediaRow } from '$lib/media'

/* ―― » One kind of media, a page at a time, appended as people scroll ( "Load more" ) —
        the library page and the picker both read one. Search is debounced by the caller.
        Out-of-order answers are dropped: a slow first page must not land after a newer one. */
export class MediaFeed {
	rows = $state<MediaRow[]>( [] )
	total = $state( 0 )
	loading = $state( false )
	error = $state( '' )
	search = $state( '' )

	readonly kind : MediaKind
	readonly #endpoint : string
	readonly #take : number
	#request = 0

	// `initial`: a first page from the page's load, so the server render already has it.
	constructor( { kind, endpoint = '/api/media', take = 30, initial } : { kind : MediaKind, endpoint ?: string, take ?: number, initial ?: Paged<MediaRow> } ) {
		this.kind = kind
		this.rows = initial?.rows ?? []
		this.total = initial?.total ?? 0
		this.#endpoint = endpoint
		this.#take = take
	}

	get more() : boolean {
		return this.rows.length < this.total
	}

	// From the start ( a new search ), or the next page ( append ).
	load = async( append = false ) : Promise<void> => {
		const request = ++this.#request
		const params = toSearchParams( { skip: append ? this.rows.length : 0, take: this.#take, search: this.search, searchBy: 'all', filters: { kind: [ this.kind ] } } )

		this.loading = true
		this.error = ''

		try {
			const page = await http.get<Paged<MediaRow>>( `${ this.#endpoint }?${ params }` )

			if ( request !== this.#request )
				return

			this.rows = append ? [ ...this.rows, ...page.rows ] : page.rows
			this.total = page.total
		} catch ( caught ) {
			if ( request === this.#request )
				this.error = errorMessage( caught )
		} finally {
			if ( request === this.#request )
				this.loading = false
		}
	}

	// After an upload or a delete, without refetching.
	add( rows : MediaRow[] ) : void {
		const mine = rows.filter( ( row ) => row.kind === this.kind )

		this.rows = [ ...mine, ...this.rows ]
		this.total += mine.length
	}

	replace( row : MediaRow ) : void {
		this.rows = this.rows.map( ( current ) => ( current.id === row.id ? row : current ) )
	}

	remove( id : string ) : void {
		this.rows = this.rows.filter( ( row ) => row.id !== id )
		this.total = Math.max( 0, this.total - 1 )
	}
}
