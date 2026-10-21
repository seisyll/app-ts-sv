<script lang="ts">
	import { BrandMark, LocaleSwitcher, ThemeToggle } from '$lib/layout'

	let { data, children } = $props()
</script>

<div class="bg-muted/40 flex min-h-svh flex-col">
	<header class="flex justify-end gap-2 p-4">
		<LocaleSwitcher size="sm" />
		<ThemeToggle />
	</header>
	<main class="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
		<div class="flex w-full max-w-sm flex-col gap-6">
			<!-- Whose sign-in this is: the workspace's logo ( or initials ) and name. -->
			{#if data.brand}
				<div class="flex items-center justify-center gap-2.5">
					{#if data.brand.logo}
						<img src={data.brand.logo} alt="" class="h-10 w-auto max-w-48 object-contain" />
					{:else}
						<BrandMark name={data.brand.name} class="size-10" />
					{/if}
					<span class="text-lg font-semibold tracking-tight">{data.brand.name}</span>
				</div>
			{/if}
			{@render children()}
		</div>
	</main>
</div>
