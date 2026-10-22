<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core'
	import LogInIcon from '@lucide/svelte/icons/log-in'
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert'
	import WifiIcon from '@lucide/svelte/icons/wifi'
	import { StatCards, TrendChart } from '#lib/components/dashboard/index.js'
	import { DataTable, dateRangeFilter, facetedFilter, TableSource, textCell } from '#lib/components/data-table/index.js'
	import { OutcomeBadge } from '#lib/components/sign-ins/index.js'
	import { renderComponent } from '#lib/components/ui/data-table/index.js'
	import { date } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import { getLocale } from '#lib/paraglide/runtime.js'
	import { deviceLabel, methodLabel, outcomeLabel, SIGN_IN_METHODS, SIGN_IN_OUTCOMES, type SignInRow } from '#lib/sign-ins.js'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const source = new TableSource<SignInRow>( { path: '/api/sign-ins', initial: data.entries } )
	const muted = textCell( 'text-muted-foreground tabular-nums whitespace-nowrap' )

	const columns : ColumnDef<SignInRow>[] = [
		{ accessorKey: 'at', header: m.audit_when(), filterFn: dateRangeFilter, cell: ( { row } ) => muted( date( row.original.at ) ) },
		{ accessorKey: 'email', header: m.auth_email() },
		{ accessorKey: 'outcome', header: m.signins_outcome(), filterFn: facetedFilter, cell: ( { row } ) => renderComponent( OutcomeBadge, { outcome: row.original.outcome } ) },
		{ accessorKey: 'method', header: m.signins_method(), filterFn: facetedFilter, cell: ( { row } ) => methodLabel( row.original.method ) },
		{ accessorKey: 'ip', header: m.audit_ip(), cell: ( { row } ) => muted( row.original.ip ?? '—' ) },
		{ id: 'device', header: m.signins_device(), enableSorting: false, accessorFn: ( row ) => row.userAgent, cell: ( { row } ) => muted( deviceLabel( row.original.userAgent ) ) }
	]

	// Successes and refusals side by side, never stacked: a busy morning and a guessing attack
	// must not draw the same picture ( billing-app's login trend ).
	const day = new Intl.DateTimeFormat( getLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' } )
	const trend = $derived( data.stats.daily.map( ( row ) => ( { label: day.format( new Date( `${ row.day }T00:00:00Z` ) ), success: row.success, failed: row.failed } ) ) )
</script>

<svelte:head>
	<title>{m.signins_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.signins_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.signins_desc()}</p>
</div>

<StatCards
	columns={3}
	cards={[
		{ label: m.signins_ok_24h(), value: data.stats.ok, icon: LogInIcon },
		{ label: m.signins_refused_24h(), value: data.stats.refused, icon: ShieldAlertIcon, tone: data.stats.refused ? 'destructive' : 'default' },
		{ label: m.signins_addresses_24h(), value: data.stats.addresses, icon: WifiIcon, hint: m.signins_addresses_hint() }
	]}
/>

<TrendChart
	title={m.signins_trend()}
	description={m.signins_trend_desc()}
	series={[ { key: 'success', label: m.signins_success(), color: 'var(--chart-1)' }, { key: 'failed', label: m.signins_refused_series(), color: 'var(--destructive)' } ]}
	data={trend}
	empty={m.signins_trend_empty()}
/>

<DataTable
	{source}
	{columns}
	search={{ placeholder: m.signins_search() }}
	filters={[
		{ columnId: 'outcome', title: m.signins_outcome(), options: SIGN_IN_OUTCOMES.map( ( outcome ) => ( { value: outcome, label: outcomeLabel( outcome ) } ) ) },
		{ columnId: 'method', title: m.signins_method(), options: SIGN_IN_METHODS.map( ( method ) => ( { value: method, label: methodLabel( method ) } ) ) }
	]}
	dateRange={{ columnId: 'at' }}
	exportTitle={m.signins_title()}
	syncUrl
/>
