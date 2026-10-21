<script lang="ts">
	import MenuIcon from '@lucide/svelte/icons/menu'
	import XIcon from '@lucide/svelte/icons/x'
	import LocaleSwitcher from '$lib/layout/LocaleSwitcher.svelte'
	import { m } from '$lib/paraglide/messages'
	import type { Site } from '../contract'
	import Mark from './Mark.svelte'

	let { site } : { site : Site } = $props()

	let scrollY = $state( 0 )
	// A native modal <dialog>: focus stays inside, Escape closes it, and it inherits the
	// theme's variables ( a portal to <body> would leave the .theme-aurora scope ).
	let menu = $state<HTMLDialogElement>()
</script>

<svelte:window bind:scrollY />

<header
	class={[
		'sticky top-0 z-50 flex items-center justify-between border-b px-5 py-4 transition-all duration-300 sm:px-8 lg:px-18',
		scrollY > 4 ? 'border-white/6 bg-(--ink)/70 backdrop-blur-xl' : 'border-transparent'
	]}
>
	<a href="/" class="flex items-center gap-2.75 text-foreground">
		<Mark />
		<span class="font-serif text-[23px] font-medium tracking-[0.02em]">{site.name}</span>
	</a>

	<nav class="hidden items-center gap-9 md:flex">
		{#each site.nav as link ( link.href )}
			<a href={link.href} class="text-[13px] tracking-[0.01em] text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</a>
		{/each}
	</nav>

	<div class="flex items-center gap-3">
		<div class="hidden sm:block"><LocaleSwitcher size="sm" /></div>
		{#if site.start.href !== site.signIn.href}
			<a href={site.signIn.href} class="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground lg:block">{site.signIn.label}</a>
		{/if}
		<a
			href={site.start.href}
			class="hidden items-center rounded-full border border-white/14 bg-white/3 px-4.5 py-2.25 text-[13px] font-medium text-(--soft) transition-all duration-200 hover:border-(--teal)/40 hover:bg-(--teal)/10 hover:text-white md:flex"
		>{site.start.label}</a>
		<button
			type="button"
			onclick={() => menu?.showModal()}
			aria-label={m.site_menu_open()}
			class="flex size-10 items-center justify-center rounded-[10px] border border-white/12 bg-white/3 text-foreground md:hidden"
		>
			<MenuIcon class="size-5" />
		</button>
	</div>
</header>

<dialog
	bind:this={menu}
	aria-label={site.name}
	class="m-0 size-full max-h-none max-w-none bg-(--ink)/98 px-5 py-6 text-foreground backdrop:bg-transparent sm:px-10"
>
	<div class="mb-12 flex items-center justify-between">
		<span class="font-serif text-[23px] font-medium">{site.name}</span>
		<button
			type="button"
			onclick={() => menu?.close()}
			aria-label={m.site_menu_close()}
			class="flex size-10 items-center justify-center rounded-[10px] border border-white/12 text-foreground"
		>
			<XIcon class="size-5" />
		</button>
	</div>
	<nav class="flex flex-col">
		{#each site.nav as link ( link.href )}
			<a href={link.href} onclick={() => menu?.close()} class="border-b border-white/6 py-3.5 font-serif text-[34px] font-light text-foreground">{link.label}</a>
		{/each}
	</nav>
	<div class="mt-8 flex flex-col gap-3">
		<a href={site.start.href} onclick={() => menu?.close()} class="rounded-full bg-foreground py-3.5 text-center font-medium text-(--ink)">{site.start.label}</a>
		{#if site.start.href !== site.signIn.href}
			<a href={site.signIn.href} onclick={() => menu?.close()} class="rounded-full border border-white/14 py-3.5 text-center font-medium text-foreground">{site.signIn.label}</a>
		{/if}
		<div class="mt-4 self-center"><LocaleSwitcher size="sm" /></div>
	</div>
</dialog>
