<script lang="ts" module>
	// One part of the whole. `color` is a theme token or a mix of one, never a raw colour.
	export type UnitPart = { key : string, label : string, value : number, color : string, hint ?: string }
</script>

<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import Figure from './Figure.svelte'
	import { shares } from './shares'

	/* ―― » A whole as a hundred cells, one per percent ( billing-app's waffle ): how much of it is
	        still waiting reads as an area, which the eye judges better than a bar once a part is
	        small. The legend prints every part's count and share ( the same largest-remainder
	        numbers the cells use ). Pointing at a part lights its cells; with `onselect`, pressing
	        a legend row filters to it ( again: everything ). `unavailable`: the read failed. */
	let { title, totalHint, parts, active = [], onselect, unavailable = false } : {
		title          : string
		totalHint ?    : string
		parts          : UnitPart[]
		// The keys the view is filtered to; empty is everything.
		active ?       : string[]
		onselect ?     : ( key : string | null ) => void
		unavailable ?  : boolean
	} = $props()

	const UNKNOWN = '—'
	const CELLS = 100

	const total = $derived( parts.reduce( ( sum, part ) => sum + part.value, 0 ) )
	const percent = $derived( shares( parts.map( ( part ) => part.value ) ) )
	// Which part each cell belongs to; null where there is nothing.
	const cells = $derived( unavailable || total === 0 ? Array.from( { length: CELLS }, () => null ) : parts.flatMap( ( part, index ) => Array.from( { length: percent[ index ] }, () => part ) ) )

	let hovered = $state<string | null>( null )
	const lit = ( key : string ) => ( hovered === null ? active.length === 0 || active.includes( key ) : hovered === key )
	const pick = ( key : string ) => onselect?.( active.length === 1 && active.includes( key ) ? null : key )

	const summary = $derived( unavailable ? m.dash_unavailable( { title } ) : `${ title } ${ total }: ${ parts.map( ( part, index ) => `${ part.label } ${ part.value } ( ${ percent[ index ] }% )` ).join( ', ' ) }` )
</script>

<Card.Root class="py-0">
	<Card.Content class="grid grid-cols-1 items-center gap-x-5 gap-y-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5">
		<div class="grid gap-1 sm:col-span-2">
			<p class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
			<Figure value={unavailable ? UNKNOWN : total} class="text-3xl leading-none font-bold tracking-tight" />
			{#if totalHint}<p class="text-xs text-muted-foreground">{totalHint}</p>{/if}
		</div>

		<div class="grid w-fit grid-cols-10 gap-[3px]" role="img" aria-label={summary}>
			{#each cells as part, index ( index )}
				<span
					role="presentation"
					class="size-2.5 rounded-[2px] motion-safe:transition-[opacity,background-color] motion-safe:duration-300 {part === null ? 'bg-muted' : 'ring-1 ring-foreground/20 ring-inset'} {part !== null && !lit( part.key ) ? 'opacity-25' : 'opacity-100'}"
					style={part === null ? undefined : `background: ${ part.color }`}
					onpointerenter={() => ( hovered = part?.key ?? null )}
					onpointerleave={() => ( hovered = null )}
				></span>
			{/each}
		</div>

		<ul class="grid min-w-0 gap-1">
			{#each parts as part, index ( part.key )}
				<li class="min-w-0">
					<button
						type="button"
						class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-[calc(var(--radius)*0.6)] px-2 py-1 text-start outline-none transition-[background-color,opacity] focus-visible:ring-2 focus-visible:ring-ring
							{active.includes( part.key ) ? 'bg-accent ring-1 ring-border' : onselect ? 'hover:bg-accent/50' : ''} {onselect ? 'cursor-pointer' : 'cursor-default'} {lit( part.key ) ? 'opacity-100' : 'opacity-50'}"
						aria-pressed={onselect ? active.includes( part.key ) : undefined}
						disabled={!onselect}
						onclick={() => pick( part.key )}
						onpointerenter={() => ( hovered = part.key )}
						onpointerleave={() => ( hovered = null )}
					>
						<span class="flex min-w-0 items-center gap-2">
							<span class="size-2.5 shrink-0 rounded-[2px] ring-1 ring-foreground/10 ring-inset" style="background: {part.color}" aria-hidden="true"></span>
							<span class="truncate text-sm">{part.label}</span>
							{#if part.hint}<span class="truncate text-xs text-muted-foreground max-sm:hidden">{part.hint}</span>{/if}
						</span>
						<span></span>
						<span class="flex items-baseline gap-1.5">
							<Figure value={unavailable ? UNKNOWN : part.value} class="text-base font-semibold" />
							{#if !unavailable}<span class="text-xs text-muted-foreground tabular-nums">{percent[ index ]}%</span>{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</Card.Content>
</Card.Root>
