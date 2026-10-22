<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { fade } from 'svelte/transition'
	import { goto } from '$app/navigation'
	import BellIcon from '@lucide/svelte/icons/bell'
	import CheckCheckIcon from '@lucide/svelte/icons/check-check'
	import SettingsIcon from '@lucide/svelte/icons/settings-2'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Popover from '#lib/components/ui/popover/index.js'
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js'
	import type { NotificationItem } from '#lib/notifications.js'
	import { m } from '#lib/paraglide/messages.js'
	import AllClear from './AllClear.svelte'
	import NotificationList from './NotificationList.svelte'
	import { getNotifications, type NotificationStore } from './store.svelte'

	/* ―― » The header bell ( the fundraiser app's ): an unread badge kept live by polling —
	        it owns the store's watch() while the shell is mounted — and a popover with the
	        queue, mark-all-read, and the way to the inbox and the preferences. Clearing the
	        last item while it's open earns the all-clear moment. */
	let { store = getNotifications(), inbox = '/app/notifications', preferences = '/app/account/notifications' } : {
		store ?       : NotificationStore
		inbox ?       : string
		preferences ? : string
	} = $props()

	let open = $state( false )
	// The reward is for emptying the queue while looking at it, not for opening it empty.
	let hadItems = $state( false )

	// svelte-ignore state_referenced_locally
	onMount( () => store.watch() )

	const count = $derived( store.unread )

	// On open: fresh items, and the reward armed only if there is something to clear. Only
	// `open` is tracked — re-arming on every queue change would cancel the reward.
	$effect( () => {
		if ( open ) {
			untrack( () => {
				hadItems = store.queue.length > 0
				void store.refresh()
			} )
		}
	} )

	$effect( () => {
		if ( store.queue.length > 0 )
			hadItems = true
	} )

	function go( href : string ) {
		open = false
		void goto( href )
	}

	async function openItem( item : NotificationItem ) {
		open = false

		if ( !item.readAt )
			await store.markRead( [ item.id ] )

		if ( item.href )
			void goto( item.href )
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child( { props } )}
			<Button {...props} variant="ghost" size="icon" class="relative" aria-label={count ? m.notif_bell_unread( { count } ) : m.notif_title()}>
				<BellIcon />
				{#if count}
					<span class="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground ring-2 ring-background">{count > 99 ? '99+' : count}</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content align="end" sideOffset={8} class="flex w-88 max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0">
		<div class="flex items-center justify-between gap-2 border-b px-3 py-2.5">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold">{m.notif_title()}</span>
				{#if count}<span class="rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none font-medium text-muted-foreground">{m.notif_new( { count } )}</span>{/if}
			</div>
			<Button variant="ghost" size="xs" class="text-muted-foreground" disabled={!count} onclick={() => store.markRead()}>
				<CheckCheckIcon data-icon="inline-start" />{m.notif_mark_all()}
			</Button>
		</div>

		{#if store.error}
			<div class="flex items-center gap-2 px-3 py-3 text-sm text-destructive" role="alert">
				<TriangleAlertIcon class="size-4 shrink-0" />
				<span>{store.error}</span>
				<button type="button" class="ms-auto font-medium underline underline-offset-2" onclick={() => store.refresh()}>{m.notif_retry()}</button>
			</div>
		{:else if store.queue.length}
			<ScrollArea class="*:data-[slot=scroll-area-viewport]:max-h-96">
				<NotificationList compact items={store.queue} onopen={openItem} ondismiss={( item ) => store.markRead( [ item.id ] )} />
			</ScrollArea>
		{:else if hadItems}
			<div in:fade={{ delay: 240, duration: 220 }}><AllClear compact /></div>
		{:else}
			<div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
				<div class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><BellIcon class="size-5" /></div>
				<p class="text-sm font-medium">{m.notif_empty()}</p>
				<p class="text-xs leading-snug text-muted-foreground">{m.notif_empty_desc()}</p>
			</div>
		{/if}

		<div class="flex items-center justify-between gap-2 border-t px-2 py-1.5">
			<Button variant="ghost" size="xs" onclick={() => go( inbox )}>{m.notif_see_all()}</Button>
			<Button variant="ghost" size="icon-xs" class="text-muted-foreground" title={m.notif_preferences()} aria-label={m.notif_preferences()} onclick={() => go( preferences )}><SettingsIcon /></Button>
		</div>
	</Popover.Content>
</Popover.Root>
