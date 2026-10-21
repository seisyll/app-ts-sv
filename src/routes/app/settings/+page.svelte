<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import * as Card from '$lib/components/ui/card'
	import { moduleLabel } from '$lib/modules'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()
</script>

<svelte:head>
	<title>{m.app_nav_settings()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.app_nav_settings()}</h1>
	<p class="text-muted-foreground text-sm">{m.app_settings_desc()}</p>
</div>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>{data.tenant.name}</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-sm">
			<dt class="text-muted-foreground">{m.app_settings_tenancy()}</dt>
			<dd><Badge variant="secondary">{data.tenancy}</Badge></dd>
			<dt class="text-muted-foreground">{m.app_settings_signup()}</dt>
			<dd><Badge variant={data.signUp ? 'default' : 'outline'}>{data.signUp ? m.app_on() : m.app_off()}</Badge></dd>
		</dl>
	</Card.Content>
</Card.Root>

<Card.Root class="max-w-xl">
	<Card.Header>
		<Card.Title>{m.modules_title()}</Card.Title>
		<Card.Description>{m.modules_desc( { client: data.client } )}</Card.Description>
	</Card.Header>
	<Card.Content>
		<dl class="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 text-sm">
			{#each data.modules as module ( module.id )}
				<dt>{moduleLabel( module.id )}</dt>
				<dd>
					{#if module.state === 'on'}
						<Badge>{m.app_on()}</Badge>
					{:else if module.state === 'off'}
						<Badge variant="outline">{m.modules_off_here()}</Badge>
					{:else}
						<Badge variant="secondary">{m.modules_absent()}</Badge>
					{/if}
				</dd>
			{/each}
		</dl>
	</Card.Content>
</Card.Root>
