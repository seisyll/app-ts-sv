import type { ColumnDef } from '@tanstack/table-core'
import { dateRangeFilter, facetedFilter, selectColumn, textCell, type FacetedFilterConfig } from '#lib/components/data-table/index.js'
import { renderComponent } from '#lib/components/ui/data-table/index.js'
import { date } from '#lib/format.js'
import { m } from '#lib/paraglide/messages.js'
import { ROLE_NAMES, roleLabel, type UserRow } from '#lib/users.js'
import StatusBadge from './StatusBadge.svelte'
import UserActions from './UserActions.svelte'
import UserCell from './UserCell.svelte'

type Options = { me : string, onchange : () => void }

const muted = textCell( 'text-muted-foreground' )

// Functions, not constants: headers and labels are built in the request's locale.
export const userColumns = ( { me, onchange } : Options ) : ColumnDef<UserRow>[] => [
	selectColumn<UserRow>(),
	{ accessorKey: 'name', header: m.users_name(), cell: ( { row } ) => renderComponent( UserCell, { user: row.original, you: row.original.id === me } ) },
	{ accessorKey: 'email', header: m.users_email(), cell: ( { row } ) => muted( row.original.email ) },
	{ accessorKey: 'role', header: m.users_role(), filterFn: facetedFilter, cell: ( { row } ) => roleLabel( row.original.role ) },
	{
		id           : 'status',
		accessorFn   : ( row ) => ( row.banned ? 'banned' : row.invited ? 'invited' : 'active' ),
		header       : m.users_status(),
		enableSorting: false,
		filterFn     : facetedFilter,
		cell         : ( { row } ) => renderComponent( StatusBadge, { banned: row.original.banned, invited: row.original.invited } )
	},
	{
		accessorKey: 'createdAt',
		header     : m.users_created(),
		filterFn   : dateRangeFilter,
		cell       : ( { row } ) => date( row.original.createdAt, { dateStyle: 'medium' } )
	},
	{
		id           : 'actions',
		enableSorting: false,
		enableHiding : false,
		header       : '',
		cell         : ( { row } ) => renderComponent( UserActions, { user: row.original, self: row.original.id === me, onchange } )
	}
]

export const userFilters = () : FacetedFilterConfig[] => [
	{ columnId: 'role', title: m.users_role(), options: ROLE_NAMES.map( ( value ) => ( { value, label: roleLabel( value ) } ) ) },
	{ columnId: 'status', title: m.users_status(), options: [ { value: 'active', label: m.users_status_active() }, { value: 'invited', label: m.users_status_invited() }, { value: 'banned', label: m.users_status_banned() } ] }
]

export const userSearch = () => ( {
	columns: [ { value: 'name', label: m.users_name() }, { value: 'email', label: m.users_email() } ]
} )
