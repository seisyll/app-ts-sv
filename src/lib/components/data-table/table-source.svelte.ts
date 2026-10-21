import { debounce } from '$lib/debounce'
import { errorMessage, http } from '$lib/http'
import { m } from '$lib/paraglide/messages'
import { PAGE_SIZE_DEFAULT, toPageQuery, toSearchParams, type Paged, type TableQuery } from './query'

export type TableSourceOptions<T, S> = {
	// List endpoint, e.g. '/api/customers'. Answers `Paged<T, S>` as JSON.
	path            : string
	// First page, from the page's load — the table paints it on the server render and the
	// browser does not re-fetch it.
	initial         : Paged<T, S>
	// Params that define the screen, not the user's query ( e.g. status=unpaid ).
	fixed ?         : Record<string, string>
	pageSize ?      : number
	// Error text when the endpoint answers without a { message }.
	errorMessage ?  : string
	fetch ?         : typeof fetch
}

// What the Export menu offers. PDF is the print page ( /app/print ) reading the rows as JSON.
export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

const DEBOUNCE_MS = 300

/* ―― » The browser half of server-side paging: the current page of rows, the total behind
        it, whole-set stats, and loading / error state. Create ONE PER TABLE, in the page
        component, from the load's first page:

          const source = new TableSource( { path: '/api/customers', initial: data.customers } )
          <DataTable {source} {columns} />

        Per component, not module scope, so concurrent server renders can't share rows and
        the first paint already has them. A route whose params change while the component
        stays mounted should `{#key}` the table on them. After a mutation, `refresh()`
        re-runs the current query so the user keeps their page, search and filters. */
export class TableSource<T, S = undefined> {
	rows = $state<T[]>( [] )
	total = $state( 0 )
	stats = $state<S | undefined>()
	loading = $state( false )
	// Why the last read failed. The previous rows stay on screen; the table says so.
	error = $state( '' )

	readonly #path : string
	readonly #fixed : Record<string, string>
	readonly #errorMessage : string
	readonly #fetch : typeof fetch
	#query : TableQuery
	// Drops out-of-order answers: a slow page 1 must not land after a fast page 2.
	#requestId = 0
	#debounced

	constructor( options : TableSourceOptions<T, S> ) {
		this.rows = options.initial.rows
		this.total = options.initial.total
		this.stats = options.initial.stats
		this.error = options.initial.error ?? ''
		this.#path = options.path
		this.#fixed = options.fixed ?? {}
		this.#errorMessage = options.errorMessage ?? m.table_load_failed()
		this.#fetch = options.fetch ?? ( ( ...args ) => fetch( ...args ) )
		this.#query = {
			pageIndex: 0,
			pageSize : options.pageSize ?? PAGE_SIZE_DEFAULT,
			search   : '',
			searchBy : 'all',
			filters  : {},
			immediate: true
		}
		this.#debounced = debounce( DEBOUNCE_MS, ( query : TableQuery ) => void this.#load( query ) )
	}

	get query() : TableQuery {
		return this.#query
	}

	// Called by <DataTable> on every page / sort / filter / search change.
	apply = ( query : TableQuery ) : void => {
		this.#query = query

		if ( query.immediate ) {
			// A click supersedes whatever typing had queued.
			this.#debounced.cancel()
			void this.#load( query )

			return
		}

		this.#debounced( query )
	}

	refresh = () : Promise<void> => this.#load( this.#query )

	// The query the first page was loaded with, when it isn't the default ( <DataTable syncUrl>
	// reads it from the address bar, as the page's load did ). No request.
	seed = ( query : TableQuery ) : void => {
		this.#query = query
	}

	// Stop everything: a pending keystroke, an in-flight answer, the loading flag.
	destroy = () : void => {
		this.#debounced.cancel()
		this.#requestId++
		this.loading = false
	}

	// The current query as a file: every matching row ( paging dropped ), same filters.
	exportUrl = ( format : ExportFormat ) : string => ( format === 'pdf'
		? `/app/print?src=${ encodeURIComponent( this.#url( this.#query, false, { export: 'json' } ) ) }`
		: this.#url( this.#query, false, { export: format } ) )

	#url( query : TableQuery, paged : boolean, extra : Record<string, string> = {} ) : string {
		const params = toSearchParams( toPageQuery( query, paged ) )

		for ( const [ key, value ] of Object.entries( { ...this.#fixed, ...extra } ) )
			params.set( key, value )

		return `${ this.#path }?${ params }`
	}

	async #load( query : TableQuery ) : Promise<void> {
		const id = ++this.#requestId
		const current = () => id === this.#requestId

		this.loading = true

		try {
			const page = await http.get<Paged<T, S>>( this.#url( query, true ), { fetch: this.#fetch } )

			if ( !current() )
				return

			this.error = ''
			this.rows = page.rows
			this.total = page.total
			this.stats = page.stats
		} catch ( error ) {
			if ( current() )
				this.error = errorMessage( error, this.#errorMessage )
		} finally {
			if ( current() )
				this.loading = false
		}
	}
}
