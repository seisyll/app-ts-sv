<script lang="ts">
	import { page } from '$app/state'
	import { Button } from '$lib/components/ui/button'
	import { NO_OVERRIDE } from '$lib/appearance'
	import { AppearancePicker, LocaleSwitcher, ThemeToggle } from '$lib/layout'
	import { isBuilt, type ModuleId } from '$lib/modules'
	import { m } from '$lib/paraglide/messages'

	let { data, children } = $props()

	// One entry per playground page. Component names stay untranslated. A module's pages
	// show only when this build ships it ( their routes are stubs otherwise ).
	const all : { href : string, label : string, module ?: ModuleId }[] = [
		{ href: '/hello', label: m.nav_overview() },
		{ href: '/hello/save-bar', label: 'SaveBar' },
		{ href: '/hello/data-table', label: 'DataTable' },
		{ href: '/hello/forms', label: m.demo_forms_title() },
		{ href: '/hello/media', label: m.media_title(), module: 'media' },
		{ href: '/hello/editor', label: m.demo_editor_title(), module: 'editor' },
		{ href: '/hello/notifications', label: m.notif_title(), module: 'notifications' },
		{ href: '/hello/mail', label: m.demo_mail_title(), module: 'mail' },
		{ href: '/hello/shell', label: m.demo_shell_title() },
		{ href: '/hello/site', label: m.demo_site_title(), module: 'site' }
	]
	const pages = all.filter( ( item ) => !item.module || isBuilt( item.module ) )
</script>

<!-- pb-32 keeps the last card clear of floating bars. -->
<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6 pb-32">
	<header class="flex flex-col gap-4">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<p class="text-2xl font-semibold tracking-tight">{m.hello_title()}</p>
				<p class="text-muted-foreground text-sm">{m.hello_subtitle()}</p>
			</div>

			<div class="flex items-center gap-2">
				<!-- Paint-only: try every palette, style and radius on every page here. -->
				{#if MODULES.appearance}
					<AppearancePicker setting={{ ...data.appearance, allowUserOverride: true }} override={NO_OVERRIDE} />
				{/if}
				<LocaleSwitcher />
				<ThemeToggle />
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
