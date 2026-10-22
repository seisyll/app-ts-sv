<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'
</script>

<svelte:head>
	<title>{m.shell_logout()}</title>
</svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title><h1 class="text-xl">{m.auth_logout_title()}</h1></Card.Title>
	</Card.Header>
	<Card.Footer class="gap-2">
		<form method="POST" class="flex-1">
			<Button type="submit" class="w-full">{m.shell_logout()}</Button>
		</form>
		<Button href="/app" variant="outline" class="flex-1">{m.auth_stay()}</Button>
	</Card.Footer>
</Card.Root>
