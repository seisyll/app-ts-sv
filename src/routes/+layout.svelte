<script lang="ts">
	import '../app.css'
	// The appearance palettes and radii; html-scoped, so they outrank app.css's :root.
	import '$lib/styles/palettes.css'
	import { ModeWatcher } from 'mode-watcher'
	import { NavProgress } from '$lib/components/nav-progress'
	import { Toaster } from '$lib/components/ui/sonner'

	let { children } = $props()
</script>

<ModeWatcher />
<Toaster />
<NavProgress />
{@render children()}
