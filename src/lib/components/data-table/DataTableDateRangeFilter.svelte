<script lang="ts" generics="TData">
	import { untrack } from 'svelte'
	import type { Table } from '@tanstack/table-core'
	import type { DateRange } from 'bits-ui'
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus'
	import XIcon from '@lucide/svelte/icons/x'
	import { Button } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover'
	import { RangeCalendar } from '$lib/components/ui/range-calendar'
	import { APP } from '$lib/config'
	import { date } from '$lib/format'
	import { m } from '$lib/paraglide/messages'

	let {
		table,
		columnId
	} : {
		table    : Table<TData>
		columnId : string
	} = $props()

	// Looked up without getColumn(), which logs an error for a missing column.
	const column = $derived( table.getAllFlatColumns().find( ( candidate ) => candidate.id === columnId ) )
	const active = $derived( ( column?.getFilterValue() as string[] | undefined )?.length === 2 )

	// What the calendar shows, including a half-picked range ( start chosen, end not yet ).
	let draft = $state<DateRange>( { start: undefined, end: undefined } )

	// The table owns the filter: when it's cleared elsewhere ( the toolbar's Reset ), drop a
	// completed draft so the calendar doesn't keep showing the old range. Reads `active`,
	// writes `draft` untracked — it can't retrigger itself.
	$effect( () => {
		if ( !active )
			untrack( () => {
				if ( draft.start && draft.end )
					draft = { start: undefined, end: undefined }
			} )
	} )

	const short = { day: 'numeric', month: 'short' } as const
	const label = $derived( active && draft.start && draft.end
		? `${ date( draft.start.toDate( APP.timeZone ), short ) } – ${ date( draft.end.toDate( APP.timeZone ), short ) }`
		: m.table_date() )

	function onRangeChange( range : DateRange ) : void {
		column?.setFilterValue( range.start && range.end ? [ range.start.toString(), range.end.toString() ] : undefined )
	}

	function clear() : void {
		draft = { start: undefined, end: undefined }
		column?.setFilterValue( undefined )
	}
</script>

{#if column}
	<div class="flex items-center gap-1">
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child( { props } )}
					<Button {...props} variant="outline" size="sm" class="h-8 border-dashed">
						<CalendarPlusIcon />
						{label}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto overflow-hidden p-0" align="start">
				<RangeCalendar bind:value={draft} onValueChange={onRangeChange} captionLayout="dropdown" />
			</Popover.Content>
		</Popover.Root>

		{#if active}
			<Button variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground size-8" onclick={clear} aria-label={m.table_date_clear()}>
				<XIcon />
			</Button>
		{/if}
	</div>
{/if}
