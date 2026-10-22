import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	metaHelper,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures
} from '@tanstack/svelte-table'

/* ―― » What every <DataTable> can do: TanStack registers features explicitly, and what isn't
        here isn't bundled. Sorting's 'auto' finds only the functions registered: these are
        the ones it picks for dates, text with numbers in it, and text. `meta.title` names a
        column in the Columns menu when its header isn't a string. */
export const features = tableFeatures( {
	columnFilteringFeature,
	globalFilteringFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	filteredRowModel : createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel   : createSortedRowModel(),
	sortFns          : { datetime: sortFn_datetime, alphanumeric: sortFn_alphanumeric, text: sortFn_text },
	columnMeta       : metaHelper<{ title ?: string }>()
} )

export type DataTableFeatures = typeof features
