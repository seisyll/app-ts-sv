<script lang="ts">
	import { LocaleSwitcher, ThemeToggle } from '$lib/layout'

	let { children } = $props()
</script>

<div class="bg-muted/40 flex min-h-svh flex-col">
	<header class="flex justify-end gap-2 p-4">
		<LocaleSwitcher size="sm" />
		<ThemeToggle />
	</header>
	<main class="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
		<div class="w-full max-w-sm">
			{@render children()}
		</div>
	</main>
</div>
