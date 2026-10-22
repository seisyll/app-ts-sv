<script lang="ts">
	import { page } from '$app/state'
	import { navTrail } from '#lib/layout/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { demoNav } from '../nav'

	let { data } = $props()

	const nav = demoNav()
	const trail = $derived( navTrail( nav, page.url.pathname ) )
	const title = $derived( trail.at( -1 )?.title ?? m.demo_shell_fallback() )
</script>

<svelte:head>
	<title>{title} · Acme Inc</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
	<p class="text-muted-foreground text-sm">
		{#if data.slow}
			{m.demo_shell_slow()}
		{:else if trail.length === 0}
			{m.demo_shell_unlisted()}
		{:else}
			{m.demo_shell_desc()}
		{/if}
	</p>
</div>

<!-- Placeholder blocks ( shadcn's sidebar demo layout ); tall enough to scroll. -->
<div class="grid auto-rows-min gap-4 md:grid-cols-3">
	{#each [ 1, 2, 3 ] as block ( block )}
		<div class="bg-muted/50 aspect-video rounded-xl"></div>
	{/each}
</div>
<div class="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min"></div>
