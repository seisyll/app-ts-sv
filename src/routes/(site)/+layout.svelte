<script lang="ts">
	import { dev } from '$app/env'
	import { Footer, Header, id } from '#theme'
	import { Button } from '#lib/components/ui/button/index.js'
	import { siteChrome } from '#lib/themes/content.js'
	import { m } from '#lib/paraglide/messages.js'

	let { data, children } = $props()

	// The active theme ( the client config's, see vite.config.ts ), under its .theme-<id> class.
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
