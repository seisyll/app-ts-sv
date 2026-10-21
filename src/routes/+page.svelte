<script lang="ts">
	import { dev } from '$app/environment'
	import { Button } from '$lib/components/ui/button'
	import { m } from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.home_title()}</title>
</svelte:head>

<main class="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
	<h1 class="text-2xl font-semibold tracking-tight">{m.home_title()}</h1>
	<div class="flex gap-2">
		<Button href="/login">{m.home_sign_in()}</Button>
		{#if dev}
			<Button href="/hello" variant="outline">{m.home_playground()}</Button>
		{/if}
	</div>
</main>
