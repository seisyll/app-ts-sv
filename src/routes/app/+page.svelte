<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell'
	import ImagesIcon from '@lucide/svelte/icons/images'
	import UserPlusIcon from '@lucide/svelte/icons/user-plus'
	import UsersIcon from '@lucide/svelte/icons/users'
	import { goto } from '$app/navigation'
	import { navigating } from '$app/state'
	import { LifecycleRail, MonthPicker, StatBreakdown, StatCards, TrendChart, UnitGrid, type StatCard } from '$lib/components/dashboard'
	import { formatBytes } from '$lib/media'
	import { monthFromKey, monthLabel } from '$lib/months'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	const UNKNOWN = '—'
	const dashboard = $derived( data.dashboard )
	const month = $derived( monthFromKey( dashboard.month ) )
	const people = $derived( dashboard.people )
	const media = $derived( dashboard.media )
	const thisMonth = $derived( dashboard.signups?.at( -1 )?.count )
	const lastMonth = $derived( dashboard.signups?.at( -2 )?.count )

	// Each card only when its figure exists in this build and workspace; a failed read is a dash.
	const cards = $derived( [
		...( people !== undefined ? [ { label: m.dash_people(), value: people ? people.active + people.invited + people.banned : UNKNOWN, icon: UsersIcon, hint: people ? m.dash_people_hint( { admins: people.admins } ) : undefined } ] : [] ),
		{ label: m.dash_signups( { month: monthLabel( month, { month: 'long' } ) } ), value: thisMonth ?? UNKNOWN, icon: UserPlusIcon, hint: lastMonth === undefined ? undefined : m.dash_signups_hint( { count: lastMonth } ) },
		...( media !== undefined ? [ { label: m.dash_files(), value: media ? media.images + media.documents : UNKNOWN, icon: ImagesIcon, hint: media ? m.dash_files_hint( { size: formatBytes( media.bytes ) } ) : undefined } ] : [] ),
		...( dashboard.unread !== undefined ? [ { label: m.dash_unread(), value: dashboard.unread ?? UNKNOWN, icon: BellIcon } ] : [] )
	] satisfies StatCard[] )

	const trend = $derived( ( dashboard.signups ?? [] ).map( ( row ) => ( { label: monthLabel( monthFromKey( row.month ), { month: 'short' } ), signups: row.count } ) ) )

	// A stop opens the users table filtered to it ( the table keeps its query in the URL ).
	const toUsers = ( key : string | null ) => goto( key ? `/app/users?status=${ key }` : '/app/users' )
	const loading = $derived( navigating.to?.url.pathname === '/app' )
</script>

<svelte:head>
	<title>{m.app_nav_home()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">{m.app_welcome( { name: data.user.name } )}</h1>
		<p class="text-sm text-muted-foreground">{m.app_welcome_desc( { tenant: data.tenant.name, role: data.user.role } )}</p>
	</div>
	<MonthPicker {month} {loading} onchange={( next ) => goto( `?month=${ next.key }`, { replaceState: true, noScroll: true, keepFocus: true } )} />
</div>

<StatCards {cards} columns={cards.length === 4 ? 4 : cards.length === 3 ? 3 : 2} />

{#if people !== undefined}
	<LifecycleRail
		title={m.dash_people()}
		stops={[ { key: 'invited', label: m.users_status_invited(), value: people?.invited ?? 0, color: 'var(--chart-3)' }, { key: 'active', label: m.users_status_active(), value: people?.active ?? 0, color: 'var(--chart-1)' } ]}
		exits={[ { key: 'banned', label: m.users_status_banned(), value: people?.banned ?? 0, color: 'var(--destructive)' } ]}
		onselect={toUsers}
		unavailable={people === null}
	/>
{/if}

<div class="grid gap-6 lg:grid-cols-2">
	<TrendChart title={m.dash_trend()} description={m.dash_trend_desc()} series={[ { key: 'signups', label: m.dash_trend_series(), color: 'var(--chart-1)' } ]} data={trend} empty={m.dash_trend_empty()} />

	{#if people !== undefined}
		<UnitGrid
			title={m.dash_roles()}
			totalHint={m.dash_roles_hint()}
			parts={[ { key: 'admin', label: m.users_role_admin(), value: people?.admins ?? 0, color: 'var(--chart-1)' }, { key: 'member', label: m.users_role_member(), value: people?.members ?? 0, color: 'var(--chart-2)' } ]}
			unavailable={people === null}
		/>
	{/if}
</div>

{#if media !== undefined}
	<StatBreakdown
		title={m.dash_files()}
		totalHint={media ? m.dash_files_hint( { size: formatBytes( media.bytes ) } ) : undefined}
		segments={[ { key: 'image', label: m.media_images(), value: media?.images ?? 0, color: 'var(--chart-1)' }, { key: 'document', label: m.media_documents(), value: media?.documents ?? 0, color: 'var(--chart-2)' } ]}
		rate={{ label: m.media_images(), of: 'image' }}
		unavailable={media === null}
	/>
{/if}
