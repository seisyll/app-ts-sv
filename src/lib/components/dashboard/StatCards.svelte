<script lang="ts" module>
	import type { Component } from 'svelte'
	import type { FigureUnit } from './Figure.svelte'

	export type StatCard = {
		label   : string
		// A number rolls to its new value ( Figure ); a string is printed as it is.
		value   : number | string
		unit ?  : FigureUnit
		hint ?  : string
		icon ?  : Component
		// A token only: a figure that must read as bad uses --destructive, the rest stays neutral.
		tone ?  : 'default' | 'destructive'
	}
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import Figure from './Figure.svelte'

	/* ―― » The figure row a dashboard opens with ( billing-app's StatCards ): one component, so
	        the spacing can't drift between screens. `unavailable`: the read behind these figures
	        FAILED, which is not the same as zero — the labels stay, every number becomes a dash,
	        and the hints ( figures too ) go. Per card: give that card the value '—'. */
	let { cards, columns = 4, unavailable = false } : {
		cards          : StatCard[]
		columns ?      : 2 | 3 | 4
		unavailable ?  : boolean
	} = $props()

	const UNKNOWN = '—'
	const grid = { 2: 'sm:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }
</script>

<div class="grid grid-cols-2 gap-3 {grid[ columns ]}">
	{#each cards as card ( card.label )}
		{@const Icon = card.icon}
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="flex items-center gap-1.5">
					{#if Icon}<Icon class="size-4 shrink-0 text-muted-foreground" />{/if}
					<p class="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{card.label}</p>
				</div>
				<p class="mt-1 text-2xl font-bold tabular-nums {unavailable ? 'text-muted-foreground' : card.tone === 'destructive' ? 'text-destructive' : 'text-foreground'}">
					{#if unavailable}{UNKNOWN}{:else}<Figure value={card.value} unit={card.unit} />{/if}
				</p>
				{#if card.hint && !unavailable}
					<p class="mt-0.5 truncate text-xs text-muted-foreground">{card.hint}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{/each}
</div>
