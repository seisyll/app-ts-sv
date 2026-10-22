<script lang="ts" module>
	// One part of the whole. `color` is a chart token — var( --chart-n ) — never a raw colour.
	export type BreakdownSegment = { key : string, label : string, value : number, color : string }
</script>

<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { getLocale } from '#lib/paraglide/runtime.js'
	import Figure from './Figure.svelte'
	import { shares } from './shares'

	/* ―― » One whole and its parts in one card ( billing-app's StatBreakdown ): the total and one
	        headline rate as figures, the split as a bar, and every part as text — count and share —
	        so no part is known by its colour alone. Pointing at a part, on the bar or in the
	        legend, lights it in both. `unavailable`: the read failed; dashes and an empty track. */
	let { title, totalHint, segments, rate, unavailable = false } : {
		title          : string
		// One quiet line under the total: what it was counted over.
		totalHint ?    : string
		// The parts, in the bar's order. They sum to the whole.
		segments       : BreakdownSegment[]
		// The ratio the card is about: one part's share, as the second figure.
		rate ?         : { label : string, of : string }
		unavailable ?  : boolean
	} = $props()

	const UNKNOWN = '—'
	const number = new Intl.NumberFormat( getLocale() )

	const total = $derived( segments.reduce( ( sum, segment ) => sum + segment.value, 0 ) )
	const percent = $derived( shares( segments.map( ( segment ) => segment.value ) ) )
	const rated = $derived( rate ? segments.findIndex( ( segment ) => segment.key === rate.of ) : -1 )

	let active = $state<string | null>( null )
	const dim = ( key : string ) => ( active !== null && active !== key ? 'opacity-35' : 'opacity-100' )

	const summary = $derived( unavailable
		? m.dash_unavailable( { title } )
		: `${ title } ${ number.format( total ) }: ${ segments.map( ( segment, index ) => `${ segment.label } ${ number.format( segment.value ) } ( ${ percent[ index ] }% )` ).join( ', ' ) }` )
</script>

<Card.Root class="py-0">
	<Card.Content class="grid grid-cols-2 gap-4 p-4 sm:p-5 lg:grid-cols-[auto_auto_minmax(0,1fr)] lg:items-center lg:gap-0">
		<div class="grid content-start gap-1 lg:pe-8">
			<p class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
			<p class="text-3xl leading-none font-bold tracking-tight tabular-nums">{#if unavailable}{UNKNOWN}{:else}<Figure value={total} />{/if}</p>
			{#if totalHint}<p class="text-xs text-muted-foreground">{totalHint}</p>{/if}
		</div>

		{#if rate && rated !== -1}
			<div class="grid content-start gap-1 border-s ps-4 lg:px-8">
				<p class="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
					<span class="size-2 shrink-0 rounded-full" style="background: {segments[ rated ].color}" aria-hidden="true"></span>{rate.label}
				</p>
				<p class="text-3xl leading-none font-bold tracking-tight tabular-nums">{#if unavailable}{UNKNOWN}{:else}<Figure value={percent[ rated ]} unit="percent" />{/if}</p>
				<p class="text-xs text-muted-foreground tabular-nums">{unavailable ? UNKNOWN : m.dash_rate_of( { part: number.format( segments[ rated ].value ), total: number.format( total ) } )}</p>
			</div>
		{/if}

		<div class="col-span-2 grid min-w-0 gap-3 max-lg:border-t max-lg:pt-4 lg:col-span-1 lg:border-s lg:ps-8">
			<div class="flex h-3 w-full gap-0.5 overflow-hidden rounded-[calc(var(--radius)*0.5)] bg-muted" role="img" aria-label={summary}>
				{#if !unavailable}
					{#each segments as segment, index ( segment.key )}
						{#if segment.value > 0}
							<!-- A hairline edge: some palettes' chart tokens sit close to the card's colour. -->
							<div
								role="presentation"
								class="h-full min-w-1 basis-0 rounded-[calc(var(--radius)*0.35)] ring-1 ring-foreground/10 ring-inset motion-safe:transition-[flex-grow,opacity] motion-safe:duration-500 {dim( segment.key )}"
								style="flex-grow: {segment.value}; background: {segment.color}"
								title="{segment.label}: {number.format( segment.value )} ( {percent[ index ]}% )"
								onpointerenter={() => ( active = segment.key )}
								onpointerleave={() => ( active = null )}
							></div>
						{/if}
					{/each}
				{/if}
			</div>
			<ul class="flex flex-wrap gap-x-5 gap-y-2">
				{#each segments as segment, index ( segment.key )}
					<li class="flex items-center gap-2 text-sm motion-safe:transition-opacity {dim( segment.key )}" onpointerenter={() => ( active = segment.key )} onpointerleave={() => ( active = null )}>
						<span class="size-2.5 shrink-0 rounded-[3px] ring-1 ring-foreground/10 ring-inset" style="background: {segment.color}" aria-hidden="true"></span>
						<span class="text-muted-foreground">{segment.label}</span>
						<span class="font-semibold tabular-nums">{unavailable ? UNKNOWN : number.format( segment.value )}</span>
						{#if !unavailable}<span class="text-xs text-muted-foreground tabular-nums">{percent[ index ]}%</span>{/if}
					</li>
				{/each}
			</ul>
		</div>
	</Card.Content>
</Card.Root>
