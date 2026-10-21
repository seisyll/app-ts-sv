<script lang="ts" module>
	// One line or set of bars: its key in the data, its name, its colour ( var( --chart-n ),
	// or var( --destructive ) for the one series that must stand out ).
	export type TrendSeries = { key : string, label : string, color : string }
</script>

<script lang="ts">
	import { scaleBand } from 'd3-scale'
	import { AreaChart, BarChart } from 'layerchart'
	import { cubicInOut } from 'svelte/easing'
	import * as Card from '$lib/components/ui/card'
	import * as Chart from '$lib/components/ui/chart'

	/* ―― » A figure over time ( billing-app's login trend chart, generalised ): grouped bars —
	        side by side, never stacked, so two series stay comparable — or an area. `data` is one
	        row per period: `label` for the axis, then a number per series key. Feed it calendar
	        periods ( lastMonths / lastDays in $lib/months ), so a quiet one is a zero, not a gap.
	        Axis labels that would overlap are dropped, keeping the latest. */
	let { title, description, series, data, kind = 'bar', empty } : {
		title          : string
		description ?  : string
		series         : TrendSeries[]
		data           : ( { label : string } & Record<string, number | string> )[]
		kind ?         : 'bar' | 'area'
		// Said instead of the chart when every value is zero.
		empty ?        : string
	} = $props()

	const config = $derived( Object.fromEntries( series.map( ( item ) => [ item.key, { label: item.label, color: item.color } ] ) ) satisfies Chart.ChartConfig )
	const blank = $derived( data.every( ( row ) => series.every( ( item ) => !Number( row[ item.key ] ) ) ) )
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{title}</Card.Title>
		{#if description}<Card.Description>{description}</Card.Description>{/if}
	</Card.Header>
	<Card.Content>
		{#if blank && empty}
			<p class="py-10 text-center text-sm text-muted-foreground">{empty}</p>
		{:else}
			<Chart.Container {config} class="aspect-auto h-56 w-full">
				{#if kind === 'area'}
					<AreaChart {data} x="label" xScale={scaleBand()} {series} axis="x" rule={false} props={{ area: { 'fill-opacity': 0.3, motion: { type: 'tween', duration: 500, easing: cubicInOut } }, xAxis: { tickOcclusion: { padding: 16 } } }}>
						{#snippet tooltip()}<Chart.Tooltip indicator="dot" />{/snippet}
					</AreaChart>
				{:else}
					<BarChart
						{data}
						x="label"
						xScale={scaleBand().padding( 0.4 )}
						x1Scale={scaleBand().paddingInner( 0.2 ).paddingOuter( 0.05 )}
						{series}
						seriesLayout="group"
						axis="x"
						rule={false}
						props={{ bars: { stroke: 'none', radius: 4, rounded: 'all', motion: { type: 'tween', duration: 500, easing: cubicInOut } }, highlight: { area: { fill: 'none' } }, xAxis: { tickOcclusion: { padding: 16 } } }}
					>
						{#snippet tooltip()}<Chart.Tooltip indicator="dot" />{/snippet}
					</BarChart>
				{/if}
			</Chart.Container>
			{#if series.length > 1}
				<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
					{#each series as item ( item.key )}
						<span class="flex items-center gap-1.5 text-xs text-muted-foreground"><span class="size-2.5 rounded-sm" style="background: {item.color}"></span>{item.label}</span>
					{/each}
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
