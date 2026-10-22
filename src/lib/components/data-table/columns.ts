import { renderComponent, type ColumnDef, type Row, type RowData } from '@tanstack/svelte-table'
import { APP } from '#lib/config.js'
import { m } from '#lib/paraglide/messages.js'
import DataTableCheckbox from './DataTableCheckbox.svelte'
import type { DataTableFeatures } from './features'

// Faceted-filter options from plain values; `labels` maps stored values to display text.
export function facetOptions( values : readonly string[], labels ?: Record<string, string> ) {
	return values.map( ( value ) => ( { value, label: labels?.[ value ] ?? value } ) )
}

// filterFn for a faceted column: the row's value is one of the selected values.
export function facetedFilter<T extends RowData>( row : Row<DataTableFeatures, T>, columnId : string, value : unknown ) : boolean {
	if ( !Array.isArray( value ) || value.length === 0 )
		return true

	return value.includes( row.getValue( columnId ) )
}

const dayParts = new Intl.DateTimeFormat( 'en-US', { timeZone: APP.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' } )

// A date's calendar day ( YYYY-MM-DD ) in the app's time zone — the zone dates are shown in,
// so the filter agrees with the cells. ( UTC slicing put early-morning rows on the wrong day. )
export function calendarDay( date : Date ) : string {
	const parts = Object.fromEntries( dayParts.formatToParts( date ).map( ( part ) => [ part.type, part.value ] ) )

	return `${ parts.year }-${ parts.month }-${ parts.day }`
}

// filterFn for a date column driven by <DataTableDateRangeFilter>: inclusive [ from, to ] days.
export function dateRangeFilter<T extends RowData>( row : Row<DataTableFeatures, T>, columnId : string, value : unknown ) : boolean {
	if ( !Array.isArray( value ) || value.length !== 2 )
		return true

	const raw = row.getValue( columnId )
	const date = raw instanceof Date ? raw : new Date( String( raw ) )

	if ( Number.isNaN( date.getTime() ) )
		return true

	const day = calendarDay( date )

	return day >= String( value[ 0 ] ) && day <= String( value[ 1 ] )
}

// "#" column numbered by position on screen, continuing across pages ( row.index alone
// restarts at 1 on every page in server mode, and follows the source order in memory ).
export function rowNumberColumn<T extends RowData>( header = '#' ) : ColumnDef<DataTableFeatures, T> {
	return {
		id           : 'rowNumber',
		header,
		enableSorting: false,
		enableHiding : false,
		cell         : ( { row, table } ) => {
			const { pageIndex, pageSize } = table.atoms.pagination.get()
			const position = table.getRowModel().rows.findIndex( ( candidate ) => candidate.id === row.id )

			return pageIndex * pageSize + position + 1
		}
	}
}

// Checkbox column for row selection ( pair with <DataTable enableSelection> ).
export function selectColumn<T extends RowData>() : ColumnDef<DataTableFeatures, T> {
	return {
		id           : 'select',
		enableSorting: false,
		enableHiding : false,
		header       : ( { table } ) => renderComponent( DataTableCheckbox, {
			checked        : table.getIsAllPageRowsSelected(),
			indeterminate  : table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
			onCheckedChange: ( value : boolean ) => table.toggleAllPageRowsSelected( value ),
			'aria-label'   : m.table_select_all()
		} ),
		cell: ( { row } ) => renderComponent( DataTableCheckbox, {
			checked        : row.getIsSelected(),
			onCheckedChange: ( value : boolean ) => row.toggleSelected( value ),
			'aria-label'   : m.table_select_row()
		} )
	}
}
