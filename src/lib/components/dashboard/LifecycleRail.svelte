<script lang="ts" module>
	// One status on the journey, or one way off it. `color` is a theme token, never a raw colour.
	export type RailStop = { key : string, label : string, value : number, color : string }
</script>

<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
	import * as Card from '$lib/components/ui/card'
	import { m } from '$lib/paraglide/messages'
	import Figure from './Figure.svelte'
	import { shares } from './shares'

	/* ―― » A population drawn as the journey it is ( billing-app's LifecycleRail ): the stops on
	        one rail in their order, the ways off it branching from the end, so where the queue
	        is and how many left read at a glance. Each stop prints its count and share, with a
	        hairline that fills to it. With `onselect` every stop is a filter ( again, or the
	        whole: everything ); `active` is what the view is filtered to, read back from it.
	        `unavailable`: the read failed — dashes, an empty rail. */
	let { title, stops, exits = [], exitsLabel = m.dash_exits(), active = [], onselect, unavailable = false } : {
		title          : string
		stops          : RailStop[]
		exits ?        : RailStop[]
		exitsLabel ?   : string
		active ?       : string[]
		onselect ?     : ( key : string | null ) => void
		unavailable ?  : boolean
	} = $props()

	const UNKNOWN = '—'

	const all = $derived( [ ...stops, ...exits ] )
	const total = $derived( all.reduce( ( sum, stop ) => sum + stop.value, 0 ) )
	const percent = $derived( shares( all.map( ( stop ) => stop.value ) ) )
	const shareOf = ( key : string ) => percent[ all.findIndex( ( stop ) => stop.key === key ) ] ?? 0
	const isOn = ( key : string ) => active.includes( key )
	const pick = ( key : string ) => onselect?.( active.length === 1 && isOn( key ) ? null : key )
	const button = 'grid w-full min-w-0 content-start gap-1.5 rounded-[calc(var(--radius)*0.75)] px-2.5 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring'
	const state = ( key : string ) => `${ isOn( key ) ? 'bg-accent ring-1 ring-border' : onselect ? 'hover:bg-accent/50' : '' } ${ onselect ? 'cursor-pointer' : 'cursor-default' }`
</script>

{#snippet body( stop : RailStop, large : boolean )}
	<span class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
		<span class="size-2 shrink-0 rounded-full ring-1 ring-foreground/10 ring-inset" style="background: {stop.color}" aria-hidden="true"></span>{stop.label}
	</span>
	<span class="flex items-baseline gap-2">
		<Figure value={unavailable ? UNKNOWN : stop.value} class="{large ? 'text-2xl' : 'text-lg'} leading-none font-bold tracking-tight" />
		{#if !unavailable}<span class="text-xs text-muted-foreground tabular-nums">{shareOf( stop.key )}%</span>{/if}
	</span>
	<span class="relative mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
		{#if !unavailable}
			<span class="absolute inset-y-0 start-0 rounded-full motion-safe:transition-[width] motion-safe:duration-700" style="width: {shareOf( stop.key )}%; background: {stop.color}"></span>
		{/if}
	</span>
{/snippet}

<Card.Root class="py-0">
	<Card.Content class="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-stretch lg:gap-0">
		<button
			type="button"
			class="grid content-center justify-items-start gap-1 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring lg:pe-8 {onselect ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'}"
			aria-pressed={onselect ? active.length === 0 : undefined}
			disabled={!onselect}
			onclick={() => onselect?.( null )}
		>
			<span class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
			<Figure value={unavailable ? UNKNOWN : total} class="text-3xl leading-none font-bold tracking-tight" />
			<span class="text-xs text-muted-foreground">{active.length === 0 ? m.dash_all() : m.dash_show_all()}</span>
		</button>

		<ol class="grid grid-cols-2 items-center gap-2 max-lg:border-t max-lg:pt-4 sm:grid-cols-3 lg:flex lg:border-s lg:ps-6">
			{#each stops as stop, index ( stop.key )}
				<li class="flex min-w-0 items-stretch gap-2 lg:flex-1">
					<button type="button" class="{button} {state( stop.key )}" aria-pressed={onselect ? isOn( stop.key ) : undefined} disabled={!onselect} onclick={() => pick( stop.key )}>
						{@render body( stop, true )}
					</button>
					{#if index < stops.length - 1}
						<ArrowRightIcon class="hidden size-4 shrink-0 self-center text-muted-foreground/60 lg:block rtl:rotate-180" aria-hidden="true" />
					{/if}
				</li>
			{/each}
		</ol>

		{#if exits.length}
			<div class="grid content-center gap-1 max-lg:border-t max-lg:pt-4 lg:ms-2 lg:border-s lg:ps-4">
				<span class="px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">{exitsLabel}</span>
				<ul class="grid grid-cols-2 gap-2 lg:w-64">
					{#each exits as stop ( stop.key )}
						<li>
							<button type="button" class="{button} {state( stop.key )}" aria-pressed={onselect ? isOn( stop.key ) : undefined} disabled={!onselect} onclick={() => pick( stop.key )}>
								{@render body( stop, false )}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
