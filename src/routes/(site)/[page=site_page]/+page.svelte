<script lang="ts">
	import { RichText } from '$lib/components/editor'
	import { APP } from '$lib/config'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()
</script>

<svelte:head>
	<title>{data.title} · {data.brand?.name ?? APP.name}</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
	<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{data.title}</h1>
	{#if data.html}
		<RichText html={data.html} class="mt-8" />
	{:else}
		<p class="mt-6 text-muted-foreground">{m.site_page_unwritten( { name: data.brand?.name ?? APP.name } )}</p>
	{/if}
</main>
