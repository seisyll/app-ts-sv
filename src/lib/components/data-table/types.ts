import type { Component } from 'svelte'
import type { RowData } from '@tanstack/table-core'

declare module '@tanstack/table-core' {
	// `meta.title`: the column's name in the Columns menu when its header isn't a string.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match TanStack's signature
	interface ColumnMeta<TData extends RowData, TValue> {
		title ?: string
	}
}

export type SearchColumnOption = { value : string, label : string }

export type SearchConfig = {
	// Columns offered in the scope picker. Omit for a plain box over every column.
	columns ?     : SearchColumnOption[]
	placeholder ? : string
}

export type FacetedFilterOption = { value : string, label : string, icon ?: Component }

export type FacetedFilterConfig = {
	columnId : string
	title    : string
	options  : FacetedFilterOption[]
}

export type DateRangeConfig = { columnId : string }

// Segmented buttons above the table ( "All" / "Overdue" ). The count is display-only;
// the page filters its own data by the bound `segment`.
export type SegmentOption = { value : string, label : string, count ?: number }
