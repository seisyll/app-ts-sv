<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open'
	import type { Snippet } from 'svelte'
	import { page } from '$app/state'
	import { helpAvailable, helpEntry, helpHref } from '#lib/help/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'

	/* ―― » "How does this work?" next to the thing itself: opens a help article over the page
	        ( HelpSheet, ?help=<id> ) without leaving it. Renders nothing where the article
	        isn't available — the help module off, or the article's own module off for this
	        workspace — so a link never leads nowhere.

	          <HelpLink doc="sign-in-protection" />
	          <HelpLink doc="email-setup">How to set up email</HelpLink> */
	let { doc, class: className, children } : { doc : string, class ?: string, children ?: Snippet } = $props()

	// The /app layout's data says what this workspace has on; elsewhere, the build decides.
	const shown = $derived( MODULES.help && helpAvailable( helpEntry( doc ), page.data.modules as string[] | undefined ) )
</script>

{#if shown}
	<a
		href={helpHref( page.url, doc )}
		data-sveltekit-replacestate
		data-sveltekit-reset="false"
		class={cn( 'inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', className )}
	>
		<BookOpenIcon class="size-3.5" />
		{#if children}{@render children()}{:else}{m.help_link()}{/if}
	</a>
{/if}
