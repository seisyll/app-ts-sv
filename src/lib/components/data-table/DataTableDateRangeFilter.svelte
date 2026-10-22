<script lang="ts" generics="TData extends RowData">
	import { untrack } from 'svelte'
	import { parseDate } from '@internationalized/date'
	import type { RowData, Table } from '@tanstack/svelte-table'
	import type { DateRange } from 'bits-ui'
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus'
	import XIcon from '@lucide/svelte/icons/x'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Popover from '#lib/components/ui/popover/index.js'
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js'
	import { APP } from '#lib/config.js'
	import { date } from '#lib/format.js'
	import { m } from '#lib/paraglide/messages.js'
	import type { DataTableFeatures } from './features'

	let {
		table,
		columnId
	} : {
		table    : Table<DataTableFeatures, TData>
		columnId : string
	} = $props()

	// Looked up without getColumn(), which logs an error for a missing column.
	const column = $derived( table.getAllFlatColumns().find( ( candidate ) => candidate.id === columnId ) )
	const value = $derived( column?.getFilterValue() as string[] | undefined )
	const active = $derived( value?.length === 2 )

	// What the calendar shows, including a half-picked range ( start chosen, end not yet ).
	let draft = $state<DateRange>( { start: undefined, end: undefined } )

	// The table owns the filter: when it's set elsewhere ( from the URL ), show that range;
	// when it's cleared elsewhere ( the toolbar's Reset ), drop a completed draft so the
	// calendar doesn't keep showing the old one. Reads `value`, writes `draft` untracked —
	// it can't retrigger itself.
	$effect( () => {
		const range = value

		untrack( () => {
			if ( range?.length === 2 ) {
				if ( draft.start?.toString() !== range[ 0 ] || draft.end?.toString() !== range[ 1 ] )
					draft = { start: parseDate( range[ 0 ] ), end: parseDate( range[ 1 ] ) }
			} else if ( draft.start && draft.end )
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
