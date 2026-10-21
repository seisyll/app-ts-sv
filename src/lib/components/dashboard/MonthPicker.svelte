<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import { Button } from '$lib/components/ui/button'
	import { Spinner } from '$lib/components/ui/spinner'
	import { currentMonth, monthLabel, shiftMonth, type MonthWindow } from '$lib/months'
	import { m } from '$lib/paraglide/messages'

	/* ―― » Previous / this month / next ( billing-app's MonthPicker ). There is nothing to report
	        on a month that hasn't happened, so it stops at the current one. */
	let { month = $bindable(), loading = false, onchange } : {
		month      : MonthWindow
		loading ?  : boolean
		onchange ? : ( month : MonthWindow ) => void
	} = $props()

	function go( next : MonthWindow ) : void {
		month = next
		onchange?.( next )
	}

	const atCurrent = $derived( month.key >= currentMonth().key )
</script>

<div class="flex items-center gap-2">
	<Button variant="outline" size="icon-sm" disabled={loading} onclick={() => go( shiftMonth( month, -1 ) )} aria-label={m.dash_month_previous()}><ChevronLeftIcon class="rtl:rotate-180" /></Button>
	<span class="flex min-w-36 justify-center text-sm font-semibold tabular-nums" aria-live="polite">
		{#if loading}<Spinner class="size-4 text-muted-foreground" />{:else}{monthLabel( month )}{/if}
	</span>
	<Button variant="outline" size="icon-sm" disabled={loading || atCurrent} onclick={() => go( shiftMonth( month, 1 ) )} aria-label={m.dash_month_next()}><ChevronRightIcon class="rtl:rotate-180" /></Button>
	<Button variant="ghost" size="sm" disabled={loading || atCurrent} onclick={() => go( currentMonth() )}>{m.dash_month_this()}</Button>
</div>
