<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check'
	import type { NotificationItem } from '$lib/notifications'
	import { relativeTime } from '$lib/notifications'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import { dismiss } from './dismiss'
	import { notificationIcon } from './icons'

	/* ―― » The queue's rows, shared by the bell and the inbox ( the fundraiser app drew them
	        twice ). Clicking a row opens it; the check that slides in on hover — or on keyboard
	        focus, so it's never hover-only — marks it done without leaving. A done row
	        collapses out ( dismiss ). */
	let { items, compact = false, onopen, ondismiss } : {
		items      : NotificationItem[]
		compact ?  : boolean
		onopen     : ( item : NotificationItem ) => void
		ondismiss  : ( item : NotificationItem ) => void
	} = $props()
</script>

<ul class="divide-y">
	{#each items as item ( item.id )}
		{@const Icon = notificationIcon( item.type )}
		<li out:dismiss class="group relative flex items-stretch">
			<button
				type="button"
				onclick={() => onopen( item )}
				class={cn( 'flex min-w-0 flex-1 items-start gap-3 pr-12 text-start transition-colors outline-none group-focus-within:bg-muted/60 group-hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset', compact ? 'py-2.5 pl-3' : 'py-3.5 pl-4' )}
			>
				<span class={cn( 'mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-muted', compact ? 'size-8' : 'size-9' )}><Icon class="size-4" /></span>
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="text-sm leading-snug font-semibold">{item.title}</span>
					{#if item.body}<span class={cn( 'text-xs leading-snug text-muted-foreground', compact && 'truncate' )}>{item.body}</span>{/if}
					<span class="mt-0.5 text-xs text-muted-foreground"><time datetime={item.createdAt}>{relativeTime( item.createdAt )}</time></span>
				</span>
			</button>
			<button
				type="button"
				onclick={() => ondismiss( item )}
				title={m.notif_dismiss()}
				aria-label={m.notif_dismiss_item( { title: item.title } )}
				class="absolute inset-y-0 right-0 flex w-11 translate-x-full items-center justify-center border-l text-muted-foreground opacity-0 outline-none transition duration-200 ease-out group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none"
			>
				<CheckIcon class="size-4" />
			</button>
		</li>
	{/each}
</ul>
