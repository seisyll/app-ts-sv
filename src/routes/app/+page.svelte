<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()
</script>

<svelte:head>
	<title>{m.app_nav_home()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.app_welcome( { name: data.user.name } )}</h1>
	<p class="text-muted-foreground text-sm">{m.app_welcome_desc( { tenant: data.tenant.name, role: data.user.role } )}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.app_start_title()}</Card.Title>
		<Card.Description>{m.app_start_desc()}</Card.Description>
	</Card.Header>
</Card.Root>
