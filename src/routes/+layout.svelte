<script lang="ts">
	import '../app.css'
	import { ModeWatcher } from 'mode-watcher'
	import { NavProgress } from '$lib/components/nav-progress'
	import { Toaster } from '$lib/components/ui/sonner'

	let { children } = $props()
</script>

<ModeWatcher />
<Toaster />
<NavProgress />
{@render children()}
