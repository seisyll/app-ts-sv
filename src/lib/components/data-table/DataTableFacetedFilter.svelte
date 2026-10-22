<script lang="ts" generics="TData, TValue">
	import type { Column } from '@tanstack/table-core'
	import CheckIcon from '@lucide/svelte/icons/check'
	import FunnelPlusIcon from '@lucide/svelte/icons/funnel-plus'
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Command from '#lib/components/ui/command/index.js'
	import * as Popover from '#lib/components/ui/popover/index.js'
	import { Separator } from '#lib/components/ui/separator/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'
	import type { FacetedFilterOption } from './types'

	let {
		column,
		title,
		options
	} : {
		column  : Column<TData, TValue>
		title   : string
		options : FacetedFilterOption[]
	} = $props()

	const selected = $derived( new Set( ( column.getFilterValue() as string[] | undefined ) ?? [] ) )

	function toggle( value : string ) : void {
		const next = selected.has( value ) ? [ ...selected ].filter( ( item ) => item !== value ) : [ ...selected, value ]

		column.setFilterValue( next.length ? next : undefined )
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child( { props } )}
			<Button {...props} variant="outline" size="sm" class="h-8 border-dashed">
				<FunnelPlusIcon />
				{title}
				{#if selected.size > 0}
					<Separator orientation="vertical" class="mx-1 data-vertical:h-4 data-vertical:self-center" />
					<Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">{selected.size}</Badge>
					<div class="hidden gap-1 lg:flex">
						{#if selected.size > 2}
							<Badge variant="secondary" class="rounded-sm px-1 font-normal">
								{m.table_filter_selected( { count: selected.size } )}
							</Badge>
						{:else}
							{#each options.filter( ( option ) => selected.has( option.value ) ) as option ( option.value )}
								<Badge variant="secondary" class="rounded-sm px-1 font-normal">{option.label}</Badge>
							{/each}
						{/if}
					</div>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-52 p-0" align="start">
		<Command.Root>
			<Command.Input placeholder={title} />
			<Command.List>
				<Command.Empty>{m.table_filter_empty()}</Command.Empty>
				<Command.Group>
					{#each options as option ( option.value )}
						{@const isSelected = selected.has( option.value )}
						{@const Icon = option.icon}
						<Command.Item value={option.label} onSelect={() => toggle( option.value )} data-checked={isSelected}>
							<div class={cn(
								'border-primary flex size-4 items-center justify-center rounded-sm border',
								isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
							)}>
								<CheckIcon class="size-3.5" />
							</div>
							{#if Icon}
								<Icon class="text-muted-foreground" />
							{/if}
							<span>{option.label}</span>
						</Command.Item>
					{/each}
				</Command.Group>
				{#if selected.size > 0}
					<Command.Separator />
					<Command.Group>
						<Command.Item onSelect={() => column.setFilterValue( undefined )} class="justify-center text-center">
							{m.table_filter_clear()}
						</Command.Item>
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
