<script lang="ts">
	import CreditCardIcon from '@lucide/svelte/icons/credit-card'
	import DicesIcon from '@lucide/svelte/icons/dices'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import UsersIcon from '@lucide/svelte/icons/users'
	import { Figure, LifecycleRail, MonthPicker, StatBreakdown, StatCards, TrendChart, UnitGrid } from '#lib/components/dashboard/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Field from '#lib/components/ui/field/index.js'
	import { Switch } from '#lib/components/ui/switch/index.js'
	import { currentMonth, lastMonths, monthLabel } from '#lib/months.js'
	import { m } from '#lib/paraglide/messages.js'

	// The dashboard pieces on made-up figures. Reroll changes every number ( watch them roll );
	// "Read failed" shows what a page says when the query behind a figure throws.
	const roll = ( max : number ) => Math.round( Math.random() * max )

	let seed = $state( 0 )
	let failed = $state( false )
	let month = $state( currentMonth() )
	let stage = $state<string[]>( [] )
	let tier = $state<string[]>( [] )

	const figures = $derived.by( () => {
		void seed

		return {
			customers: 1200 + roll( 400 ),
			revenue  : 48_000 + roll( 9_000 ),
			churn    : 2 + roll( 6 ),
			overdue  : roll( 30 ),
			trial    : 80 + roll( 60 ),
			active   : 600 + roll( 200 ),
			paused   : 20 + roll( 40 ),
			cancelled: 30 + roll( 40 ),
			months   : lastMonths( 6, month ).map( ( window ) => ( { label: monthLabel( window, { month: 'short' } ), web: 100 + roll( 200 ), mobile: 60 + roll( 140 ) } ) )
		}
	} )
</script>

<svelte:head>
	<title>{m.demo_dash_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold tracking-tight">{m.demo_dash_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.demo_dash_desc()}</p>
	</div>
	<div class="flex flex-wrap items-center gap-4">
		<Field.Field orientation="horizontal" class="w-auto">
			<Switch id="demo-failed" bind:checked={failed} />
			<Field.Label for="demo-failed">{m.demo_dash_failed()}</Field.Label>
		</Field.Field>
		<Button variant="outline" size="sm" onclick={() => seed++}><DicesIcon />{m.demo_dash_reroll()}</Button>
	</div>
</div>

<div class="flex flex-wrap items-center justify-between gap-3">
	<p class="text-sm text-muted-foreground">MonthPicker · Figure: <Figure value={figures.revenue} unit="money" class="font-semibold text-foreground" /></p>
	<MonthPicker bind:month onchange={() => seed++} />
</div>

<StatCards
	unavailable={failed}
	cards={[
		{ label: m.demo_dash_customers(), value: figures.customers, icon: UsersIcon, hint: m.demo_dash_customers_hint() },
		{ label: m.demo_dash_revenue(), value: figures.revenue, unit: 'money', icon: CreditCardIcon },
		{ label: m.demo_dash_churn(), value: figures.churn, unit: 'percent' },
		{ label: m.demo_dash_overdue(), value: figures.overdue, icon: TriangleAlertIcon, tone: 'destructive' }
	]}
/>

<LifecycleRail
	title={m.demo_dash_customers()}
	stops={[ { key: 'trial', label: m.demo_dash_trial(), value: figures.trial, color: 'var(--chart-3)' }, { key: 'active', label: m.demo_dash_active(), value: figures.active, color: 'var(--chart-1)' } ]}
	exits={[ { key: 'paused', label: m.demo_dash_paused(), value: figures.paused, color: 'var(--chart-4)' }, { key: 'cancelled', label: m.demo_dash_cancelled(), value: figures.cancelled, color: 'var(--destructive)' } ]}
	active={stage}
	onselect={( key ) => ( stage = key ? [ key ] : [] )}
	unavailable={failed}
/>

<div class="grid gap-6 lg:grid-cols-2">
	<TrendChart title={m.demo_dash_trend()} description={monthLabel( month )} series={[ { key: 'web', label: m.demo_ui_chart_web(), color: 'var(--chart-1)' }, { key: 'mobile', label: m.demo_ui_chart_mobile(), color: 'var(--chart-2)' } ]} data={figures.months} />
	<TrendChart kind="area" title={m.demo_dash_trend()} description="kind=area" series={[ { key: 'web', label: m.demo_ui_chart_web(), color: 'var(--chart-1)' } ]} data={figures.months} />
</div>

<div class="grid gap-6 lg:grid-cols-2">
	<UnitGrid
		title={m.demo_dash_plans()}
		parts={[ { key: 'free', label: m.demo_dash_free(), value: figures.trial, color: 'var(--chart-2)' }, { key: 'pro', label: m.demo_dash_pro(), value: figures.active, color: 'var(--chart-1)', hint: m.demo_dash_pro_hint() } ]}
		active={tier}
		onselect={( key ) => ( tier = key ? [ key ] : [] )}
		unavailable={failed}
	/>
	<StatBreakdown
		title={m.demo_dash_customers()}
		totalHint={m.demo_dash_customers_hint()}
		segments={[ { key: 'active', label: m.demo_dash_active(), value: figures.active, color: 'var(--chart-1)' }, { key: 'trial', label: m.demo_dash_trial(), value: figures.trial, color: 'var(--chart-3)' }, { key: 'cancelled', label: m.demo_dash_cancelled(), value: figures.cancelled, color: 'var(--destructive)' } ]}
		rate={{ label: m.demo_dash_active(), of: 'active' }}
		unavailable={failed}
	/>
</div>
