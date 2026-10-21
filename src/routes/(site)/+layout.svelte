<script lang="ts">
	import { dev } from '$app/environment'
	import { Footer, Header, id } from '$theme'
	import { Button } from '$lib/components/ui/button'
	import { siteChrome } from '$lib/themes/content'
	import { m } from '$lib/paraglide/messages'

	let { data, children } = $props()

	// The active theme ( the client config's, see svelte.config.js ), under its .theme-<id> class.
	const site = $derived( siteChrome( { signUp: data.signUp, logo: data.brand?.logo, site: data.site } ) )
</script>

<div class="theme-{id} min-h-svh">
	<Header {site} />
	{@render children()}
	<Footer {site} />
</div>

{#if dev}
	<Button href="/hello" variant="secondary" size="sm" class="fixed bottom-4 left-4 z-50 shadow-md">{m.site_playground()}</Button>
{/if}
