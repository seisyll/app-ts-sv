<script lang="ts" module>
	export type MediaView = 'masonry' | 'grid' | 'list'
</script>

<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import { date } from '#lib/format.js'
	import { formatBytes, type MediaRow } from '#lib/media.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'

	/* ―― » The fundraiser app's media grid: masonry ( natural heights ), a square grid, or a
	        list with details. Each tile is a button; `onselect` decides what a click means —
	        open the lightbox in the library, pick an image in the picker ( `selected` marks
	        the choice ). Documents always show as rows: a PDF has nothing to look at. */
	let { items, view = 'masonry', selected, onselect } : {
		items      : MediaRow[]
		view ?     : MediaView
		selected ? : string
		onselect   : ( item : MediaRow, index : number ) => void
	} = $props()

	const tile = 'group relative overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
	const mode = $derived( items.some( ( item ) => item.kind === 'document' ) ? 'list' : view )
</script>

{#snippet check( item : MediaRow )}
	{#if item.public}
		<span class="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow" title={m.media_public()}><GlobeIcon class="size-3.5" /><span class="sr-only">{m.media_public()}</span></span>
	{/if}
	{#if item.id === selected}
		<span class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"><CheckIcon class="size-4" /></span>
	{/if}
{/snippet}

{#if mode === 'masonry'}
	<div class="columns-2 gap-3 sm:columns-3 md:columns-4 xl:columns-5">
		{#each items as item, index ( item.id )}
			<button type="button" class={cn( tile, 'mb-3 block w-full break-inside-avoid', item.id === selected && 'ring-3 ring-primary' )} aria-label={item.name} aria-pressed={selected ? item.id === selected : undefined} onclick={() => onselect( item, index )}>
				<img src={item.thumbUrl} alt="" loading="lazy" width={item.width} height={item.height} class="h-auto w-full object-cover transition-transform duration-200 group-hover:scale-105" />
				{@render check( item )}
			</button>
		{/each}
	</div>
{:else if mode === 'grid'}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
		{#each items as item, index ( item.id )}
			<button type="button" class={cn( tile, 'aspect-square', item.id === selected && 'ring-3 ring-primary' )} aria-label={item.name} aria-pressed={selected ? item.id === selected : undefined} onclick={() => onselect( item, index )}>
				<img src={item.thumbUrl} alt="" loading="lazy" class="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
				{@render check( item )}
			</button>
		{/each}
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each items as item, index ( item.id )}
			<button
				type="button"
				class={cn( 'flex items-center gap-3 rounded-lg border p-2 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50', item.id === selected && 'border-primary bg-primary/5' )}
				aria-pressed={selected ? item.id === selected : undefined}
				onclick={() => onselect( item, index )}
			>
				{#if item.kind === 'image'}
					<img src={item.thumbUrl} alt="" loading="lazy" class="size-14 shrink-0 rounded-md border bg-muted object-cover" />
				{:else}
					<span class="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"><FileTextIcon class="size-6" /></span>
				{/if}
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="flex items-center gap-1.5 truncate text-sm font-medium">{item.name}{#if item.public}<GlobeIcon class="size-3.5 shrink-0 text-muted-foreground" aria-label={m.media_public()} />{/if}</span>
					<span class="truncate text-xs text-muted-foreground">
						{#if item.width && item.height}{item.width} × {item.height} px · {/if}{formatBytes( item.size )} · {date( item.createdAt, { dateStyle: 'medium' } )}
					</span>
				</span>
				{#if item.id === selected}<CheckIcon class="size-4 shrink-0 text-primary" />{/if}
			</button>
		{/each}
	</div>
{/if}
