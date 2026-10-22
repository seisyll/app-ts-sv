<script lang="ts">
	import '../app.css'
	// The appearance palettes and radii; html-scoped, so they outrank app.css's :root.
	import '#lib/styles/palettes.css'
	// Scroll edges that say there is more ( sidebar, command palette, tall dialogs ). Unlayered.
	import '#lib/layout/scroll-fade.css'
	import { ModeWatcher } from 'mode-watcher'
	import { NavProgress } from '#lib/components/nav-progress/index.js'
	import { Toaster } from '#lib/components/ui/sonner/index.js'

	let { data, children } = $props()
</script>

<svelte:head>
	{#if data.brand?.favicon}
		<link rel="icon" href={data.brand.favicon} type="image/webp" />
	{/if}
</svelte:head>

<!-- Its pre-paint script lives in app.html, where the CSP nonce is. -->
<ModeWatcher disableHeadScriptInjection />
<Toaster />
<NavProgress />
{@render children()}
