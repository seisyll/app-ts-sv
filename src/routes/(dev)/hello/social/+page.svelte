<script lang="ts">
	import { ConnectedAccounts, SocialButtons } from '$lib/components/social'
	import * as Card from '$lib/components/ui/card'
	import { m } from '$lib/paraglide/messages'

	let { form } = $props()
</script>

<svelte:head>
	<title>{m.demo_social_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_social_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_social_desc()}</p>
</div>

<Card.Root class="max-w-sm">
	<Card.Header>
		<Card.Title>SocialButtons</Card.Title>
		<Card.Description>{m.demo_social_buttons()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<SocialButtons providers={[ 'google', 'apple' ]} action="?/social" />
	</Card.Content>
</Card.Root>

<p class="text-sm text-muted-foreground">ConnectedAccounts · {m.demo_social_accounts()}</p>
<ConnectedAccounts accounts={[ { provider: 'google', connected: true }, { provider: 'apple', connected: false } ]} canDisconnect message={form?.said} />
<ConnectedAccounts accounts={[ { provider: 'google', connected: true } ]} canDisconnect={false} />
