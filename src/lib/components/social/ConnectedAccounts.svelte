<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { SOCIAL_LABELS, type ConnectedAccount } from '#lib/social.js'
	import SocialIcon from './SocialIcon.svelte'

	/* ―― » The profile page's sign-in methods: each provider this deployment offers, connected
	        or not. Connect leaves for the provider and comes back here; disconnect is refused
	        for the last way in ( `canDisconnect` false: one method left ). Plain forms to the
	        page's `link` / `unlink` actions. */
	let { accounts, canDisconnect, message } : {
		accounts      : ConnectedAccount[]
		canDisconnect : boolean
		// The last action's outcome.
		message ?     : string | null
	} = $props()
</script>

{#if accounts.length}
	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title>{m.social_title()}</Card.Title>
			<Card.Description>{m.social_desc()}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#each accounts as account ( account.provider )}
				<form method="POST" class="flex items-center gap-3 rounded-lg border px-3 py-2.5">
					<input type="hidden" name="provider" value={account.provider} />
					<SocialIcon provider={account.provider} class="size-5" />
					<span class="flex-1 text-sm font-medium">{SOCIAL_LABELS[ account.provider ]}</span>
					{#if account.connected}
						<Badge variant="secondary">{m.social_connected()}</Badge>
						<Button type="submit" formaction="?/unlink" variant="ghost" size="sm" disabled={!canDisconnect} title={canDisconnect ? undefined : m.social_last_method()}>{m.social_disconnect()}</Button>
					{:else}
						<Button type="submit" formaction="?/link" variant="outline" size="sm">{m.social_connect()}</Button>
					{/if}
				</form>
			{/each}
			{#if message}
				<p class="text-sm text-muted-foreground" role="status">{message}</p>
			{:else if !canDisconnect && accounts.some( ( account ) => account.connected )}
				<p class="text-xs text-muted-foreground">{m.social_last_method()}</p>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
