<script lang="ts">
	import '../app.css'
	// The appearance palettes and radii; html-scoped, so they outrank app.css's :root.
	import '$lib/styles/palettes.css'
	// Scroll edges that say there is more ( sidebar, command palette, tall dialogs ). Unlayered.
	import '$lib/layout/scroll-fade.css'
	import { ModeWatcher } from 'mode-watcher'
	import { NavProgress } from '$lib/components/nav-progress'
	import { Toaster } from '$lib/components/ui/sonner'

	let { data, children } = $props()
</script>

<svelte:head>
	{#if data.brand?.favicon}
		<link rel="icon" href={data.brand.favicon} type="image/webp" />
	{/if}
</svelte:head>

<ModeWatcher />
<Toaster />
<NavProgress />
{@render children()}
