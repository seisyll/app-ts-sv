<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js'
	import LocaleSwitcher from '#lib/layout/LocaleSwitcher.svelte'
	import ThemeToggle from '#lib/layout/ThemeToggle.svelte'
	import type { Site } from '../contract'

	let { site } : { site : Site } = $props()
</script>

<header class="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
	<div class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			{#if site.logo}<img src={site.logo} alt="" class="h-7 w-auto max-w-40 object-contain" />{/if}
			{site.name}
		</a>
		<nav class="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
			{#each site.nav as link ( link.href )}
				<a href={link.href} class="transition-colors hover:text-foreground">{link.label}</a>
			{/each}
		</nav>
		<div class="ms-auto flex items-center gap-1">
			<div class="hidden sm:block"><LocaleSwitcher size="sm" /></div>
			<ThemeToggle />
			{#if site.start.href !== site.signIn.href}
				<Button href={site.signIn.href} variant="ghost" size="sm" class="hidden sm:inline-flex">{site.signIn.label}</Button>
			{/if}
			<Button href={site.start.href} size="sm">{site.start.label}</Button>
		</div>
	</div>
</header>
