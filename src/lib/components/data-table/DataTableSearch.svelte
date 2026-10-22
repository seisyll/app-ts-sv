<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search'
	import { Input } from '#lib/components/ui/input/index.js'
	import { Label } from '#lib/components/ui/label/index.js'
	import * as Select from '#lib/components/ui/select/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'
	import type { SearchColumnOption } from './types'

	let {
		columns,
		value = '',
		column = 'all',
		placeholder = m.table_search(),
		onvalue,
		oncolumn,
		class: className
	} : {
		// Scope picker options. Omit for a plain box over every column.
		columns ?     : SearchColumnOption[]
		value ?       : string
		column ?      : string
		placeholder ? : string
		onvalue ?     : ( value : string ) => void
		oncolumn ?    : ( column : string ) => void
		class ?       : string
	} = $props()

	// Unique per instance: two tables on one page must not share ids.
	const id = $props.id()

	const options = $derived( columns?.length ? [ { value: 'all', label: m.table_search_all() }, ...columns ] : [] )
	const selectedLabel = $derived( options.find( ( option ) => option.value === column )?.label ?? m.table_search_all() )
</script>

<div class={cn( 'flex items-center gap-2', className )}>
	{#if options.length}
		<Select.Root type="single" value={column} onValueChange={( next ) => oncolumn?.( next )}>
			<Select.Trigger size="sm" class="w-36 shrink-0" aria-label={m.table_search_label()}>
				{selectedLabel}
			</Select.Trigger>
			<Select.Content>
				{#each options as option ( option.value )}
					<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{/if}

	<div class="relative flex-1">
		<Label for="{id}-search" class="sr-only">{m.table_search_label()}</Label>
		<SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input
			id="{id}-search"
			type="search"
			{placeholder}
			{value}
			oninput={( event ) => onvalue?.( event.currentTarget.value )}
			class="h-8 pl-9"
		/>
	</div>
</div>
