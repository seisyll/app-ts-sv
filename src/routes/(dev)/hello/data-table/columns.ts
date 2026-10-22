import { renderComponent, type ColumnDef } from '@tanstack/svelte-table'
import {
	dateRangeFilter,
	facetedFilter,
	rowNumberColumn,
	selectColumn,
	textCell,
	type DataTableFeatures,
	type FacetedFilterConfig
} from '#lib/components/data-table/index.js'
import { date, money } from '#lib/format.js'
import { m } from '#lib/paraglide/messages.js'
import type { Customer } from '../../demo-data'
import { planLabel, statusLabel } from './labels'
import RowActions from './RowActions.svelte'
import StatusBadge from './StatusBadge.svelte'

const muted = textCell( 'text-muted-foreground' )
const strong = textCell( 'font-medium' )

// Functions, not constants: headers and labels must be built in the request's locale.
// Plain string headers get sort buttons from <DataTable> automatically.
export const customerColumns = ( { select = false } = {} ) : ColumnDef<DataTableFeatures, Customer>[] => [
	...( select ? [ selectColumn<Customer>() ] : [] ),
	rowNumberColumn<Customer>(),
	{ accessorKey: 'name', header: m.demo_table_name(), cell: ( { row } ) => strong( row.original.name ) },
	{ accessorKey: 'email', header: m.demo_table_email(), cell: ( { row } ) => muted( row.original.email ) },
	{ accessorKey: 'plan', header: m.demo_table_plan(), filterFn: facetedFilter, cell: ( { row } ) => planLabel( row.original.plan ) },
	{
		accessorKey: 'status',
		header     : m.demo_table_status(),
		filterFn   : facetedFilter,
		cell       : ( { row } ) => renderComponent( StatusBadge, { status: row.original.status } )
	},
	{ accessorKey: 'mrr', header: m.demo_table_mrr(), cell: ( { row } ) => money( row.original.mrr ) },
	{
		accessorKey: 'createdAt',
		header     : m.demo_table_created(),
		filterFn   : dateRangeFilter,
		cell       : ( { row } ) => date( row.original.createdAt, { dateStyle: 'medium' } )
	},
	{
		id           : 'actions',
		enableSorting: false,
		enableHiding : false,
		header       : '',
		cell         : ( { row } ) => renderComponent( RowActions, { customer: row.original } )
	}
]

export const customerFilters = () : FacetedFilterConfig[] => [
	{ columnId: 'plan', title: m.demo_table_plan(), options: ( [ 'free', 'pro', 'team' ] as const ).map( ( value ) => ( { value, label: planLabel( value ) } ) ) },
	{ columnId: 'status', title: m.demo_table_status(), options: ( [ 'active', 'trial', 'churned' ] as const ).map( ( value ) => ( { value, label: statusLabel( value ) } ) ) }
]

export const customerSearch = () => ( {
	columns: [ { value: 'name', label: m.demo_table_name() }, { value: 'email', label: m.demo_table_email() } ]
} )
