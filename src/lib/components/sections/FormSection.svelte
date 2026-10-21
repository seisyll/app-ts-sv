<script lang="ts">
	import type { Snippet } from 'svelte'

	/* ―― » One group of a long form ( billing-app's FormSection ): a record read as the few things
	        it is ( who, where, what it may do ) instead of one undivided column of fields. A
	        hairline above every group but the first; the heading is a caption, not a field label. */
	let { title, hint, children } : {
		title    : string
		// One quiet sentence for the rule that governs the whole group.
		hint ?   : string
		children : Snippet
	} = $props()
</script>

<section class="grid gap-4 border-t pt-5 first:border-t-0 first:pt-0" aria-label={title}>
	<header class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
		<h3 class="text-xs font-semibold text-muted-foreground">{title}</h3>
		{#if hint}<p class="text-xs text-muted-foreground">{hint}</p>{/if}
	</header>
	{@render children()}
</section>
