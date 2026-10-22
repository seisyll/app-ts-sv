<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import SunIcon from '@lucide/svelte/icons/sun'
	import { Button } from '#lib/components/ui/button/index.js'
	import { m } from '#lib/paraglide/messages.js'
</script>

<Button variant="ghost" size="icon" onclick={toggleMode} aria-label={m.hello_theme()}>
	{#if mode.current === 'dark'}
		<SunIcon />
	{:else}
		<MoonIcon />
	{/if}
</Button>
