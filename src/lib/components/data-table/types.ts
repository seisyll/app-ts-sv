import type { Component } from 'svelte'

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
