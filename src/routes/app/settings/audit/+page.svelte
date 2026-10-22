<script lang="ts">
	import { renderComponent, type ColumnDef } from '@tanstack/svelte-table'
	import { AUDIT_RESOURCES, auditResourceLabel, type AuditRow } from '#lib/audit.js'
	import { AuditEntry } from '#lib/components/audit/index.js'
	import { DataTable, dateRangeFilter, facetedFilter, TableSource, textCell, type DataTableFeatures } from '#lib/components/data-table/index.js'
	import { date } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const source = new TableSource<AuditRow>( { path: '/api/audit', initial: data.entries } )
	const muted = textCell( 'text-muted-foreground tabular-nums whitespace-nowrap' )

	const columns : ColumnDef<DataTableFeatures, AuditRow>[] = [
		{ accessorKey: 'at', header: m.audit_when(), filterFn: dateRangeFilter, cell: ( { row } ) => muted( date( row.original.at ) ) },
		{ accessorKey: 'actorName', header: m.audit_who() },
		{ id: 'what', header: m.audit_what(), enableSorting: false, meta: { title: m.audit_what() }, accessorFn: ( row ) => row.action, cell: ( { row } ) => renderComponent( AuditEntry, { entry: row.original } ) },
		{ id: 'resource', accessorFn: ( row ) => row.action.split( '.' )[ 0 ], filterFn: facetedFilter, enableHiding: false, header: '', cell: () => '' },
		{ accessorKey: 'ip', header: m.audit_ip(), enableSorting: false, cell: ( { row } ) => muted( row.original.ip ?? '' ) }
	]
</script>

<svelte:head>
	<title>{m.audit_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.audit_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.audit_desc()}</p>
</div>

<DataTable
	{source}
	{columns}
	initialColumnVisibility={{ resource: false }}
	search={{ placeholder: m.audit_search() }}
	filters={[ { columnId: 'resource', title: m.audit_area(), options: AUDIT_RESOURCES.map( ( resource ) => ( { value: resource, label: auditResourceLabel( resource ) } ) ) } ]}
	dateRange={{ columnId: 'at' }}
	exportTitle={m.audit_title()}
	syncUrl
/>
