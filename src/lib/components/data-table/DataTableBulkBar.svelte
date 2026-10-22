<script lang="ts" generics="TData">
	import type { Table } from '@tanstack/table-core'
	import { cubicOut } from 'svelte/easing'
	import { prefersReducedMotion } from 'svelte/motion'
	import { fly } from 'svelte/transition'
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
	import XIcon from '@lucide/svelte/icons/x'
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js'
	import { Separator } from '#lib/components/ui/separator/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import type { BulkAction, BulkConfirm } from './bulk'

	let {
		table,
		actions = [],
		onsettled
	} : {
		table       : Table<TData>
		actions ?   : BulkAction<TData>[]
		// After any action finishes — the table refreshes server rows here.
		onsettled ? : () => void
	} = $props()

	type Pending = { confirm : BulkConfirm, keepSelection ?: boolean, run : ( rows : TData[] ) => unknown }

	const selectedRows = $derived( table.getFilteredSelectedRowModel().rows.map( ( row ) => row.original ) )
	const count = $derived( selectedRows.length )

	// Blocks double-submits while an action runs.
	let busy = $state( false )
	let confirmOpen = $state( false )
	let pending = $state<Pending | null>( null )

	async function execute( run : ( rows : TData[] ) => unknown, keepSelection ?: boolean ) : Promise<void> {
		if ( busy || count === 0 )
			return

		busy = true

		try {
			// Snapshot before the reset below clears the selection.
			await run( selectedRows )
		} finally {
			busy = false

			if ( !keepSelection )
				table.resetRowSelection()

			onsettled?.()
		}
	}

	function dispatch( action : { confirm ?: BulkConfirm, keepSelection ?: boolean, run : ( rows : TData[] ) => unknown } ) : void {
		if ( busy || count === 0 )
			return

		if ( action.confirm ) {
			pending = { confirm: action.confirm, keepSelection: action.keepSelection, run: action.run }
			confirmOpen = true

			return
		}

		void execute( action.run, action.keepSelection )
	}

	function proceed() : void {
		if ( !pending )
			return

		const { run, keepSelection } = pending

		confirmOpen = false
		pending = null
		void execute( run, keepSelection )
	}

	const motion = $derived( prefersReducedMotion.current ? { y: 0, duration: 0 } : { y: 16, duration: 220 } )
</script>

{#if count > 0}
	<!-- Click-through wrapper; only the pill takes pointer events. -->
	<div
		class="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
		transition:fly={{ ...motion, easing: cubicOut }}
		role="region"
		aria-label={m.table_bulk_label()}
	>
		<div class="bg-popover text-popover-foreground pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-lg border p-1.5 shadow-lg">
			<div class="flex shrink-0 items-center gap-1.5 px-2 text-sm whitespace-nowrap">
				<span class="font-semibold tabular-nums">{count}</span>
				<span class="text-muted-foreground">{m.table_bulk_selected()}</span>
			</div>

			{#if actions.length}
				<Separator orientation="vertical" class="mx-0.5 shrink-0 data-vertical:h-5 data-vertical:self-center" />
			{/if}

			{#each actions as action ( action.id )}
				{#if action.items?.length}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger disabled={busy}>
							{#snippet child( { props } )}
								<Button {...props} variant="ghost" size="sm" disabled={busy} class="shrink-0">
									{#if action.icon}
										<action.icon />
									{/if}
									{action.label}
									<ChevronDownIcon class="opacity-60" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" sideOffset={8} class="w-52">
							<DropdownMenu.Group>
								{#each action.items as item ( item.value )}
									<DropdownMenu.Item
										variant={item.variant ?? 'default'}
										disabled={busy}
										onclick={() => dispatch( { confirm: item.confirm, run: item.run } )}
									>
										{#if item.icon}
											<item.icon />
										{/if}
										{item.label}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else if action.run}
					{@const run = action.run}
					<Button
						variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
						size="sm"
						disabled={busy}
						class="shrink-0"
						onclick={() => dispatch( { confirm: action.confirm, keepSelection: action.keepSelection, run } )}
					>
						{#if action.icon}
							<action.icon />
						{/if}
						{action.label}
					</Button>
				{/if}
			{/each}

			<Separator orientation="vertical" class="mx-0.5 shrink-0 data-vertical:h-5 data-vertical:self-center" />

			<Button
				variant="ghost"
				size="icon"
				disabled={busy}
				class="text-muted-foreground hover:text-foreground size-8 shrink-0"
				onclick={() => table.resetRowSelection()}
				aria-label={m.table_bulk_clear()}
			>
				<XIcon />
			</Button>
		</div>
	</div>
{/if}

<!-- Mounted outside the {#if}: the dialog must outlive a selection that clears. -->
<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{pending?.confirm.title ?? m.table_bulk_confirm_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{pending?.confirm.description?.( count ) ?? m.table_bulk_confirm_desc( { count } )}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.table_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" onclick={proceed}>
				{pending?.confirm.actionLabel ?? m.table_bulk_continue()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
