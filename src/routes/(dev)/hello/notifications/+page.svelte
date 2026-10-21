<script lang="ts">
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import { AllClear, NotificationBell, NotificationList, NotificationStore } from '$lib/components/notifications'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { m } from '$lib/paraglide/messages'

	// The bell and the queue against a mock inbox ( /api/hello/notifications, in memory ).
	// The real ones live in /app's header and at /app/notifications.
	const store = new NotificationStore( undefined, '/api/hello/notifications' )

	let replay = $state( 0 )

	$effect( () => {
		void store.refresh()
	} )

	async function reset() {
		await fetch( '/api/hello/notifications?reset=1' )
		await store.refresh()
	}
</script>

<svelte:head>
	<title>{m.notif_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.notif_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_notif_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_notif_bell()}</Card.Title>
		<Card.Description>{m.demo_notif_bell_desc()}</Card.Description>
		<Card.Action class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={reset}><RotateCcwIcon data-icon="inline-start" />{m.demo_notif_reset()}</Button>
			<NotificationBell {store} inbox="/hello/notifications" preferences="/hello/notifications" />
		</Card.Action>
	</Card.Header>
	<Card.Content>
		<div class="overflow-hidden rounded-lg border">
			{#if store.queue.length}
				<NotificationList items={store.queue} onopen={( item ) => store.markRead( [ item.id ] )} ondismiss={( item ) => store.markRead( [ item.id ] )} />
			{:else}
				<AllClear />
			{/if}
		</div>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.notif_all_clear()}</Card.Title>
		<Card.Action><Button variant="outline" size="sm" onclick={() => replay++}>{m.demo_notif_replay()}</Button></Card.Action>
	</Card.Header>
	<Card.Content class="grid gap-4 sm:grid-cols-2">
		{#key replay}
			<div class="rounded-lg border"><AllClear /></div>
			<div class="rounded-lg border"><AllClear compact /></div>
		{/key}
	</Card.Content>
</Card.Root>
