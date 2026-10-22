<script lang="ts">
	import { fade } from 'svelte/transition'
	import { goto } from '$app/navigation'
	import CheckCheckIcon from '@lucide/svelte/icons/check-check'
	import SettingsIcon from '@lucide/svelte/icons/settings-2'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import BellIcon from '@lucide/svelte/icons/bell'
	import { AllClear, getNotifications, NotificationList } from '#lib/components/notifications/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import type { NotificationItem } from '#lib/notifications.js'
	import { m } from '#lib/paraglide/messages.js'

	// The inbox ( the fundraiser app's ): the same queue as the bell, full size. Handling an
	// item — opening it, or its check — marks it read and it leaves; history stays stored.
	const store = getNotifications()

	// Emptying a queue that held something is worth the all-clear; arriving empty is not.
	let hadItems = $state( store.queue.length > 0 )

	$effect( () => {
		if ( store.queue.length > 0 )
			hadItems = true
	} )

	async function openItem( item : NotificationItem ) {
		if ( !item.readAt )
			await store.markRead( [ item.id ] )

		if ( item.href )
			void goto( item.href )
	}
</script>

<svelte:head>
	<title>{m.notif_title()}</title>
</svelte:head>

<div class="flex max-w-3xl flex-col gap-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="flex flex-col gap-1">
			<h1 class="text-xl font-semibold tracking-tight">{m.notif_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.notif_page_desc()}</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" disabled={!store.unread} onclick={() => store.markRead()}><CheckCheckIcon data-icon="inline-start" />{m.notif_mark_all()}</Button>
			<Button variant="ghost" size="icon-sm" href="/app/account/notifications" title={m.notif_preferences()} aria-label={m.notif_preferences()}><SettingsIcon /></Button>
		</div>
	</div>

	<Card.Root class="overflow-hidden py-0">
		{#if store.error}
			<div class="flex items-center gap-2 px-4 py-4 text-sm text-destructive" role="alert">
				<TriangleAlertIcon class="size-4 shrink-0" />
				<span>{store.error}</span>
				<button type="button" class="ms-auto font-medium underline underline-offset-2" onclick={() => store.refresh()}>{m.notif_retry()}</button>
			</div>
		{:else if store.queue.length}
			<NotificationList items={store.queue} onopen={openItem} ondismiss={( item ) => store.markRead( [ item.id ] )} />
		{:else if hadItems}
			<div in:fade={{ delay: 240, duration: 220 }}><AllClear /></div>
		{:else}
			<div class="flex flex-col items-center gap-2 px-6 py-16 text-center">
				<div class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><BellIcon class="size-6" /></div>
				<p class="font-medium">{m.notif_empty()}</p>
				<p class="text-sm text-muted-foreground">{m.notif_empty_desc()}</p>
			</div>
		{/if}
	</Card.Root>
</div>
