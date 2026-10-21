<script lang="ts">
	import { toast } from 'svelte-sonner'
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
	import TrashIcon from '@lucide/svelte/icons/trash-2'
	import * as Card from '$lib/components/ui/card'
	import * as Field from '$lib/components/ui/field'
	import { Switch } from '$lib/components/ui/switch'
	import { DataTable, runBulk, TableSource, type BulkAction } from '$lib/components/data-table'
	import { money } from '$lib/format'
	import { m } from '$lib/paraglide/messages'
	import { CUSTOMERS, type Customer } from '../../demo-data'
	import { customerColumns, customerFilters, customerSearch } from './columns'
	import { statusLabel } from './labels'

	let { data } = $props()

	const filters = customerFilters()
	const search = customerSearch()
	const dateRange = { columnId: 'createdAt' }

	// ── In memory: the whole array, filtered / sorted / paged in the browser.
	let customers = $state( CUSTOMERS.slice() )
	let segment = $state( 'all' )

	const memoryColumns = customerColumns( { select: true } )
	const segmentRows = $derived( segment === 'all' ? customers : customers.filter( ( customer ) => customer.status === segment ) )
	const countOf = ( status : Customer['status'] ) => customers.filter( ( customer ) => customer.status === status ).length
	const segments = $derived( [
		{ value: 'all', label: m.demo_table_all(), count: customers.length },
		{ value: 'trial', label: statusLabel( 'trial' ), count: countOf( 'trial' ) },
		{ value: 'churned', label: statusLabel( 'churned' ), count: countOf( 'churned' ) }
	] )

	const bulkActions : BulkAction<Customer>[] = [
		{
			id   : 'activate',
			label: m.demo_table_activate(),
			icon : CircleCheckIcon,
			run  : ( rows ) => runBulk( rows, ( row ) => {
				customers = customers.map( ( customer ) => ( customer.id === row.id ? { ...customer, status: 'active' } : customer ) )
			}, {
				loading: m.demo_table_working(),
				success: ( count ) => m.demo_table_activated( { count } ),
				error  : m.demo_table_bulk_failed()
			} )
		},
		{
			id     : 'delete',
			label  : m.demo_table_delete(),
			icon   : TrashIcon,
			variant: 'destructive',
			confirm: { title: m.demo_table_delete_title(), actionLabel: m.demo_table_delete() },
			run    : ( rows ) => {
				const ids = new Set( rows.map( ( row ) => row.id ) )

				customers = customers.filter( ( customer ) => !ids.has( customer.id ) )
				toast.success( m.demo_table_deleted( { count: rows.length } ) )
			}
		}
	]

	// ── Server mode: one page at a time from the mock endpoint.
	let slow = $state( false )
	let failing = $state( false )

	const serverColumns = customerColumns()

	// The load's first page seeds the source once; later pages come from the endpoint.
	// svelte-ignore state_referenced_locally
	const source = new TableSource<Customer, { mrr : number }>( {
		path   : '/api/hello/customers',
		initial: data.customers,
		// Demo knobs ride on each request through the injectable fetch.
		fetch  : ( input, init ) => {
			const url = new URL( String( input ), location.origin )

			url.searchParams.set( 'delay', slow ? '1500' : '400' )

			if ( failing )
				url.searchParams.set( 'fail', '1' )

			return fetch( url, init )
		}
	} )
</script>

<svelte:head>
	<title>DataTable · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">DataTable</h1>
	<p class="text-muted-foreground text-sm">{m.demo_table_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_table_memory_title()}</Card.Title>
		<Card.Description>{m.demo_table_memory_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<DataTable
			data={segmentRows}
			columns={memoryColumns}
			{search}
			{filters}
			{dateRange}
			{segments}
			bind:segment
			enableSelection
			{bulkActions}
			visibilityKey="demo-memory"
		/>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_table_server_title()}</Card.Title>
		<Card.Description>{m.demo_table_server_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<Field.Field orientation="horizontal" class="w-auto">
				<Switch id="demo-slow" bind:checked={slow} />
				<Field.Label for="demo-slow">{m.demo_table_slow()}</Field.Label>
			</Field.Field>
			<Field.Field orientation="horizontal" class="w-auto">
				<Switch id="demo-failing" bind:checked={failing} />
				<Field.Label for="demo-failing">{m.demo_table_failing()}</Field.Label>
			</Field.Field>
			<p class="text-muted-foreground ms-auto text-sm">
				{m.demo_table_mrr_total()} <span class="text-foreground font-medium tabular-nums">{money( source.stats?.mrr ?? 0 )}</span>
			</p>
		</div>

		<DataTable
			{source}
			columns={serverColumns}
			{search}
			{filters}
			{dateRange}
			exportTitle={m.demo_table_server_title()}
			exportFormats={[ 'csv' ]}
			visibilityKey="demo-server"
			syncUrl
		/>
	</Card.Content>
</Card.Root>
