<script lang="ts" generics="TData, TStats = undefined">
	import { untrack, type Snippet } from 'svelte'
	import { browser } from '$app/environment'
	import { page } from '$app/state'
	import {
		getCoreRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type Column,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type RowSelectionState,
		type SortingState,
		type Table as TableType,
		type VisibilityState
	} from '@tanstack/table-core'
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import ChevronsLeftIcon from '@lucide/svelte/icons/chevrons-left'
	import ChevronsRightIcon from '@lucide/svelte/icons/chevrons-right'
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import Settings2Icon from '@lucide/svelte/icons/settings-2'
	import XIcon from '@lucide/svelte/icons/x'
	import { Badge } from '$lib/components/ui/badge'
	import { Button } from '$lib/components/ui/button'
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import { Label } from '$lib/components/ui/label'
	import * as Select from '$lib/components/ui/select'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as Table from '$lib/components/ui/table'
	import { m } from '$lib/paraglide/messages'
	import type { BulkAction } from './bulk'
	import DataTableBulkBar from './DataTableBulkBar.svelte'
	import DataTableDateRangeFilter from './DataTableDateRangeFilter.svelte'
	import DataTableFacetedFilter from './DataTableFacetedFilter.svelte'
	import DataTableSearch from './DataTableSearch.svelte'
	import { PAGE_SIZE_DEFAULT, type TableQuery } from './query'
	import type { ExportFormat, TableSource } from './table-source.svelte'
	import type { DateRangeConfig, FacetedFilterConfig, SearchConfig, SegmentOption } from './types'

	/* ―― » The one table shell: owns all TanStack wiring ( paging, sorting, filtering,
	        visibility, selection ); a page supplies `columns` and either
	          • `data`   — a fixed array, everything done in memory, or
	          • `source` — a TableSource: SERVER mode, one page at a time, every page /
	                       sort / filter / search change reported as a TableQuery.
	        Sorting and filtering move with paging: sorting ten of forty thousand rows and
	        calling it sorted is worse than not offering the control.
	        A column with a plain string `header` gets a sort button for free; opt out with
	        `enableSorting: false`. `meta.title` names a column in the Columns menu. */
	let {
		source,
		data,
		columns,
		getRowId,
		pageSize = PAGE_SIZE_DEFAULT,
		pageSizeOptions = [ 10, 20, 30, 50 ],
		initialColumnVisibility = {},
		visibilityKey,
		search,
		filters = [],
		dateRange,
		segments = [],
		segment = $bindable( '' ),
		instance = $bindable(),
		enableSelection = false,
		bulkActions = [],
		exportTitle,
		exportFormats = [ 'csv', 'xlsx' ],
		emptyMessage = m.table_empty(),
		toolbarActions,
		onQuery,
		rowCount,
		loading
	} : {
		source ?                  : TableSource<TData, TStats>
		data ?                    : TData[]
		columns                   : ColumnDef<TData>[]
		// Stable row identity; defaults to `row.id`, then the index.
		getRowId ?                : ( row : TData, index : number ) => string
		pageSize ?                : number
		pageSizeOptions ?         : number[]
		initialColumnVisibility ? : VisibilityState
		// localStorage key for column choices; defaults to the route, null disables.
		visibilityKey ?           : string | null
		search ?                  : SearchConfig
		filters ?                 : FacetedFilterConfig[]
		dateRange ?               : DateRangeConfig
		segments ?                : SegmentOption[]
		segment ?                 : string
		// The TanStack table, for controls outside the toolbar ( e.g. a chart that filters ).
		instance ?                : TableType<TData>
		enableSelection ?         : boolean
		bulkActions ?             : BulkAction<TData>[]
		// Shows the Export menu ( server mode ): every row matching the current query.
		exportTitle ?             : string
		exportFormats ?           : ExportFormat[]
		emptyMessage ?            : string
		// Extra toolbar buttons ( e.g. "New customer" ).
		toolbarActions ?          : Snippet
		// Server mode without a TableSource: receive the query yourself.
		onQuery ?                 : ( query : TableQuery ) => void
		rowCount ?                : number
		loading ?                 : boolean
	} = $props()

	const id = $props.id()

	// These seed state the table then owns, so only the initial props are read.
	// svelte-ignore state_referenced_locally
	let pagination = $state<PaginationState>( { pageIndex: 0, pageSize } )
	let sorting = $state<SortingState>( [] )
	let columnFilters = $state<ColumnFiltersState>( [] )
	let rowSelection = $state<RowSelectionState>( {} )
	// svelte-ignore state_referenced_locally
	let columnVisibility = $state<VisibilityState>( initialColumnVisibility )
	let searchValue = $state( '' )
	let searchColumn = $state( 'all' )

	// One object, so changing only the scope still re-filters: TanStack memoises the
	// filtered rows on the global filter's identity.
	const globalFilter = $derived( { value: searchValue, column: searchColumn } )

	// How the table was wired, not something that changes mid-life.
	// svelte-ignore state_referenced_locally
	const serverMode = source !== undefined || onQuery !== undefined
	// svelte-ignore state_referenced_locally
	const report = onQuery ?? source?.apply

	// Cancel a pending keystroke / in-flight page when the table goes away.
	$effect( () => () => source?.destroy() )

	const rows = $derived( data ?? source?.rows ?? [] )
	const total = $derived( rowCount ?? source?.total ?? 0 )
	const busy = $derived( loading ?? source?.loading ?? false )
	const failed = $derived( source?.error ?? '' )

	function defaultRowId( row : TData, index : number ) : string {
		const rowId = ( row as { id ?: unknown } )?.id

		return rowId === undefined || rowId === null ? String( index ) : String( rowId )
	}

	function emitQuery( immediate : boolean ) : void {
		if ( !report )
			return

		// New query, new rows: a selection made on the old page would act on rows not shown.
		rowSelection = {}

		const facets : Record<string, string[]> = {}
		let startDate : string | undefined
		let endDate : string | undefined

		for ( const filter of columnFilters ) {
			if ( !Array.isArray( filter.value ) || filter.value.length === 0 )
				continue

			// The date filter is a [ from, to ] pair on a column; it travels as its own params.
			if ( dateRange && filter.id === dateRange.columnId ) {
				[ startDate, endDate ] = filter.value.map( String )

				continue
			}

			facets[ filter.id ] = filter.value.map( String )
		}

		report( {
			pageIndex: pagination.pageIndex,
			pageSize : pagination.pageSize,
			search   : searchValue,
			searchBy : searchColumn,
			sort     : sorting[ 0 ]?.id,
			dir      : sorting[ 0 ] ? ( sorting[ 0 ].desc ? 'desc' : 'asc' ) : undefined,
			filters  : facets,
			startDate,
			endDate,
			immediate
		} )
	}

	// Narrowing returns to page 1 — page 4 of a one-page result would read as "no results".
	function firstPage() : void {
		if ( pagination.pageIndex !== 0 )
			pagination = { ...pagination, pageIndex: 0 }
	}

	const table : TableType<TData> = createSvelteTable( {
		get columns() {
			return columns
		},
		get data() {
			return rows
		},
		state: {
			get pagination() {
				return pagination
			},
			get sorting() {
				return sorting
			},
			get columnVisibility() {
				return columnVisibility
			},
			get rowSelection() {
				return rowSelection
			},
			get columnFilters() {
				return columnFilters
			},
			get globalFilter() {
				return globalFilter
			}
		},
		getRowId          : ( row, index ) => ( getRowId ?? defaultRowId )( row, index ),
		enableRowSelection: () => enableSelection,
		autoResetPageIndex: false,
		manualPagination  : serverMode,
		manualSorting     : serverMode,
		manualFiltering   : serverMode,
		get rowCount() {
			return serverMode ? total : undefined
		},
		// In-memory search: 'all' = the picker's columns ( or every column ), else just one.
		globalFilterFn: ( row, columnId, filter : { value : string, column : string } ) => {
			const query = filter.value.trim().toLowerCase()

			if ( !query )
				return true

			const inScope = filter.column === 'all'
				? search?.columns?.some( ( option ) => option.value === columnId ) ?? true
				: columnId === filter.column

			return inScope && String( row.getValue( columnId ) ?? '' ).toLowerCase().includes( query )
		},
		getCoreRowModel       : getCoreRowModel(),
		getPaginationRowModel : getPaginationRowModel(),
		getSortedRowModel     : getSortedRowModel(),
		getFacetedRowModel    : getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFilteredRowModel   : getFilteredRowModel(),
		onPaginationChange    : ( updater ) => {
			const next = typeof updater === 'function' ? updater( pagination ) : updater

			// A new page size re-slices from the top; staying on page 4 would skip rows.
			pagination = next.pageSize === pagination.pageSize ? next : { ...next, pageIndex: 0 }
			emitQuery( true )
		},
		onSortingChange: ( updater ) => {
			sorting = typeof updater === 'function' ? updater( sorting ) : updater
			firstPage()
			emitQuery( true )
		},
		onColumnFiltersChange: ( updater ) => {
			columnFilters = typeof updater === 'function' ? updater( columnFilters ) : updater
			firstPage()
			emitQuery( true )
		},
		onColumnVisibilityChange: ( updater ) => {
			columnVisibility = typeof updater === 'function' ? updater( columnVisibility ) : updater
		},
		onRowSelectionChange: ( updater ) => {
			rowSelection = typeof updater === 'function' ? updater( rowSelection ) : updater
		},
		onGlobalFilterChange: ( updater ) => {
			const next = typeof updater === 'function' ? updater( globalFilter ) : updater

			searchValue = next?.value ?? ''
			searchColumn = next?.column ?? 'all'
		}
	} )

	// Read by the parent through bind:instance.
	instance = table

	function setSearch( value : string ) : void {
		searchValue = value
		firstPage()
		// Typing: the source debounces it, so a word is one request, not five.
		emitQuery( false )
	}

	function setSearchColumn( column : string ) : void {
		searchColumn = column
		firstPage()
		emitQuery( true )
	}

	function resetFilters() : void {
		// Assigned directly ( not resetColumnFilters + reset search ) so it is ONE query.
		columnFilters = []
		searchValue = ''
		searchColumn = 'all'
		firstPage()
		emitQuery( true )
	}

	// ―― » Column choices survive reloads, per route ( or per `visibilityKey` ).
	const storageKey = $derived( visibilityKey === null ? null : `table-visibility:${ visibilityKey ?? page.url.pathname }` )
	let visibilityLoaded = $state( false )

	$effect( () => {
		const key = storageKey

		if ( !browser || key === null || visibilityLoaded )
			return

		try {
			const saved = localStorage.getItem( key )

			if ( saved )
				columnVisibility = JSON.parse( saved ) as VisibilityState
		} catch {
			// Corrupt or blocked storage: keep the configured default.
		}

		visibilityLoaded = true
	} )

	$effect( () => {
		const key = storageKey
		const value = JSON.stringify( columnVisibility )

		if ( browser && key !== null && visibilityLoaded ) {
			try {
				localStorage.setItem( key, value )
			} catch {
				// Storage full or blocked: the choice just won't persist.
			}
		}
	} )

	// Back to page 1 when the active segment swaps the rows ( not on mount ). Untracked:
	// setPageIndex re-enters onPaginationChange, which reads and writes `pagination`.
	let lastSegment : string | null = null

	$effect( () => {
		const current = segment

		untrack( () => {
			if ( lastSegment !== null && lastSegment !== current )
				table.setPageIndex( 0 )

			lastSegment = current
		} )
	} )

	const filteredCount = $derived( serverMode ? total : table.getFilteredRowModel().rows.length )
	const pageCount = $derived( Math.max( 1, table.getPageCount() ) )

	// In memory, data that shrinks under the table must not strand it past the last page.
	// ( Server mode: the page IS the query, and `total` is briefly stale mid-request. )
	$effect( () => {
		const last = pageCount - 1

		if ( !serverMode )
			untrack( () => {
				if ( pagination.pageIndex > last )
					pagination = { ...pagination, pageIndex: last }
			} )
	} )

	const isFiltered = $derived( columnFilters.length > 0 || searchValue.length > 0 )
	// Only data columns can be hidden from the menu; action / select columns stay put.
	const hideable = $derived( table.getAllColumns().filter( ( column ) => column.getCanHide() && column.accessorFn !== undefined ) )
	const hasToolbar = $derived( !!( search || filters.length || dateRange || exportTitle || toolbarActions || segments.length || hideable.length ) )

	function columnLabel( column : Column<TData, unknown> ) : string {
		const { meta, header } = column.columnDef

		return meta?.title ?? ( typeof header === 'string' && header ? header : column.id )
	}

	const exportLabels : Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel (.xlsx)', json: 'JSON' }
</script>

<div class="flex w-full flex-col gap-4">
	{#if hasToolbar}
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
					{#if search}
						<DataTableSearch
							columns={search.columns}
							placeholder={search.placeholder}
							value={searchValue}
							column={searchColumn}
							onvalue={setSearch}
							oncolumn={setSearchColumn}
							class="w-full sm:w-72"
						/>
					{/if}

					{#each filters as filter ( filter.columnId )}
						{@const column = table.getAllFlatColumns().find( ( candidate ) => candidate.id === filter.columnId )}
						{#if column}
							<DataTableFacetedFilter {column} title={filter.title} options={filter.options} />
						{/if}
					{/each}

					{#if dateRange}
						<DataTableDateRangeFilter {table} columnId={dateRange.columnId} />
					{/if}

					{#if isFiltered}
						<Button variant="ghost" size="sm" class="h-8" onclick={resetFilters}>
							{m.table_reset()}
							<XIcon data-icon="inline-end" />
						</Button>
					{/if}
				</div>

				<div class="flex w-full items-center justify-end gap-2 sm:ms-auto sm:w-auto">
					{#if exportTitle && source}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child( { props } )}
									<Button {...props} variant="outline" size="sm">
										<DownloadIcon />
										<!-- Label kept for screen readers when the icon stands alone. -->
										<span class="sr-only lg:not-sr-only">{m.table_export()}</span>
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									{#each exportFormats as format ( format )}
										<DropdownMenu.Item>
											{#snippet child( { props } )}
												<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an endpoint file download, not a route -->
												<a {...props} href={source.exportUrl( format )} download>{exportLabels[ format ]}</a>
											{/snippet}
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}

					{#if hideable.length}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child( { props } )}
									<Button {...props} variant="outline" size="sm">
										<Settings2Icon />
										<span class="sr-only lg:not-sr-only">{m.table_columns()}</span>
										<ChevronDownIcon />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-56">
								<DropdownMenu.Group>
									{#each hideable as column ( column.id )}
										<DropdownMenu.CheckboxItem
											checked={column.getIsVisible()}
											onCheckedChange={( value ) => column.toggleVisibility( !!value )}
										>
											{columnLabel( column )}
										</DropdownMenu.CheckboxItem>
									{/each}
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}

					{@render toolbarActions?.()}
				</div>
			</div>

			{#if segments.length}
				<div class="flex flex-wrap items-center gap-2">
					{#each segments as option ( option.value )}
						<Button
							variant={segment === option.value ? 'default' : 'outline'}
							size="sm"
							aria-pressed={segment === option.value}
							onclick={() => ( segment = option.value )}
						>
							{option.label}
							{#if option.count !== undefined}
								<Badge variant="secondary" class="pointer-events-none rounded-full px-2">{option.count}</Badge>
							{/if}
						</Button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- A failed read is said even while old rows are still shown: stale is not the same as current. -->
	{#if failed}
		<div
			data-slot="data-table-error"
			role="alert"
			class="border-destructive/40 bg-destructive/10 text-destructive flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2.5 text-sm"
		>
			<span>{failed}</span>
			{#if rows.length}
				<span class="text-destructive/80">{m.table_stale()}</span>
			{/if}
			<Button variant="outline" size="xs" class="ms-auto" onclick={() => source?.refresh()}>{m.table_retry()}</Button>
		</div>
	{/if}

	<!-- Loading dims the current page instead of blanking it: the user keeps their place. -->
	<div data-slot="data-table-shell" class="border-border bg-card relative overflow-x-auto rounded-lg border" aria-busy={busy}>
		{#if busy}
			<div class="border-border bg-background/90 text-muted-foreground pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
				<Spinner class="size-3.5" />
				{m.table_loading()}
			</div>
		{/if}
		<Table.Root class={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup ( headerGroup.id )}
					<Table.Row class="bg-muted/40 hover:bg-muted/40">
						{#each headerGroup.headers as header ( header.id )}
							{@const sorted = header.column.getIsSorted()}
							{@const title = header.column.columnDef.header}
							<Table.Head
								scope="col"
								colspan={header.colSpan}
								aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
								class="text-muted-foreground h-11 px-4 text-[11px] font-semibold tracking-wider uppercase"
							>
								{#if !header.isPlaceholder}
									{#if typeof title === 'string' && header.column.getCanSort()}
										<button
											type="button"
											class="hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold tracking-wider uppercase outline-none focus-visible:ring-2"
											onclick={header.column.getToggleSortingHandler()}
										>
											{title}
											{#if sorted === 'asc'}
												<ArrowUpIcon class="size-3.5" />
											{:else if sorted === 'desc'}
												<ArrowDownIcon class="size-3.5" />
											{:else}
												<ChevronsUpDownIcon class="size-3.5 opacity-50" />
											{/if}
										</button>
									{:else}
										<FlexRender content={title} context={header.getContext()} />
									{/if}
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row ( row.id )}
					<Table.Row class="border-border" data-state={row.getIsSelected() ? 'selected' : undefined}>
						{#each row.getVisibleCells() as cell ( cell.id )}
							<Table.Cell class="px-4 py-2.5">
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell data-slot="table-empty" colspan={table.getVisibleLeafColumns().length} class="text-muted-foreground h-24 text-center text-sm">
							{failed ? m.table_failed_empty() : emptyMessage}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-muted-foreground text-sm tabular-nums">
			{#if enableSelection}
				{m.table_selected( { selected: table.getFilteredSelectedRowModel().rows.length, count: filteredCount } )}
			{:else}
				{m.table_total( { count: filteredCount } )}
			{/if}
		</p>

		<div class="flex flex-wrap items-center gap-4 sm:gap-6">
			<div class="hidden items-center gap-2 lg:flex">
				<Label for="{id}-page-size" class="text-sm font-medium">{m.table_rows_per_page()}</Label>
				<Select.Root type="single" value={`${ pagination.pageSize }`} onValueChange={( value ) => table.setPageSize( Number( value ) )}>
					<Select.Trigger size="sm" class="w-20" id="{id}-page-size">{pagination.pageSize}</Select.Trigger>
					<Select.Content side="top">
						{#each pageSizeOptions as size ( size )}
							<Select.Item value={`${ size }`}>{size}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<p class="text-sm font-medium tabular-nums">{m.table_page_of( { page: pagination.pageIndex + 1, count: pageCount } )}</p>

			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon-sm" class="hidden lg:flex" onclick={() => table.setPageIndex( 0 )} disabled={!table.getCanPreviousPage()} aria-label={m.table_first_page()}>
					<ChevronsLeftIcon />
				</Button>
				<Button variant="outline" size="icon-sm" onclick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={m.table_previous_page()}>
					<ChevronLeftIcon />
				</Button>
				<Button variant="outline" size="icon-sm" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={m.table_next_page()}>
					<ChevronRightIcon />
				</Button>
				<Button variant="outline" size="icon-sm" class="hidden lg:flex" onclick={() => table.setPageIndex( table.getPageCount() - 1 )} disabled={!table.getCanNextPage()} aria-label={m.table_last_page()}>
					<ChevronsRightIcon />
				</Button>
			</div>
		</div>
	</div>

	{#if bulkActions.length}
		<DataTableBulkBar {table} actions={bulkActions} onsettled={() => source?.refresh()} />
	{/if}
</div>
