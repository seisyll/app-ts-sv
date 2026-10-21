<script lang="ts">
	import { page } from '$app/state'
	import { mode, toggleMode } from 'mode-watcher'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import SunIcon from '@lucide/svelte/icons/sun'
	import { Button } from '$lib/components/ui/button'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { languageName } from '$lib/format'
	import { m } from '$lib/paraglide/messages'
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime'

	let { children } = $props()

	const locale = getLocale()

	// One entry per playground page. Component names stay untranslated.
	const pages = [
		{ href: '/hello', label: m.nav_overview() },
		{ href: '/hello/save-bar', label: 'SaveBar' }
	]
</script>

<!-- pb-32 keeps the last card clear of floating bars. -->
<div class="mx-auto flex max-w-3xl flex-col gap-6 p-6 pb-32">
	<header class="flex flex-col gap-4">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<p class="text-2xl font-semibold tracking-tight">{m.hello_title()}</p>
				<p class="text-muted-foreground text-sm">{m.hello_subtitle()}</p>
			</div>

			<div class="flex items-center gap-2">
				<!-- Getter pins the active locale ( no deselect ); setter reloads into the new one. -->
				<ToggleGroup.Root
					type="single"
					variant="outline"
					aria-label={m.hello_language()}
					bind:value={() => locale, ( value ) => value && setLocale( value as Locale )}
				>
					{#each locales as code ( code )}
						<ToggleGroup.Item value={code} aria-label={languageName( code )}>
							{code.toUpperCase()}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>

				<Button variant="outline" size="icon" onclick={toggleMode} aria-label={m.hello_theme()}>
					{#if mode.current === 'dark'}
						<SunIcon />
					{:else}
						<MoonIcon />
					{/if}
				</Button>
			</div>
		</div>

		<nav class="flex flex-wrap gap-1" aria-label={m.hello_title()}>
			{#each pages as item ( item.href )}
				{@const current = page.url.pathname === item.href}
				<Button
					href={item.href}
					size="sm"
					variant={current ? 'secondary' : 'ghost'}
					aria-current={current ? 'page' : undefined}
				>
					{item.label}
				</Button>
			{/each}
		</nav>
	</header>

	<main class="flex flex-col gap-6">
		{@render children()}
	</main>
</div>
