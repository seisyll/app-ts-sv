<script lang="ts">
	import { page } from '$app/state'
	import { Button } from '$lib/components/ui/button'
	import { m } from '$lib/paraglide/messages'

	// A plain error page for every route: each project designs its own later. Not-found and
	// server errors get friendly words; anything else shows the error's own message.
	const status = $derived( page.status )
	const title = $derived( status === 404 ? m.error_404() : status >= 500 ? m.error_500() : m.error_title() )
	const detail = $derived( status === 404 ? m.error_404_desc() : status >= 500 ? m.error_500_desc() : page.error?.message ?? '' )
</script>

<svelte:head>
	<title>{status} · {title}</title>
</svelte:head>

<main class="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
	<p class="font-mono text-sm text-muted-foreground">{status}</p>
	<div class="flex max-w-md flex-col gap-2">
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if detail}<p class="text-muted-foreground">{detail}</p>{/if}
	</div>
	<div class="flex gap-2">
		<Button href="/">{m.error_home()}</Button>
		<Button variant="outline" onclick={() => history.back()}>{m.error_back()}</Button>
	</div>
</main>
