<script lang="ts">
	import type { Snippet } from 'svelte'

	/* ―― » One group of a settings page ( billing-app's SettingsSection ): what it is and why on
	        the left, the controls on the right — a reader scans the left column for the thing
	        they came to change and never meets a control without the sentence saying what it
	        governs. Groups are divided by hairlines, not boxed one card each. */
	let { title, description, children } : {
		title          : string
		description ?  : string
		children       : Snippet
	} = $props()
</script>

<section class="grid gap-4 border-t py-6 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10" aria-label={title}>
	<header class="space-y-1">
		<h2 class="text-sm font-semibold">{title}</h2>
		{#if description}<p class="text-sm text-pretty text-muted-foreground">{description}</p>{/if}
	</header>
	<div class="min-w-0">{@render children()}</div>
</section>
