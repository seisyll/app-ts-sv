<script lang="ts">
	import { page } from '$app/state'

	/* ―― » One page's head, for search engines and link previews: title, description, canonical
	        URL, Open Graph and Twitter tags, and optional JSON-LD — all in the server-rendered
	        HTML crawlers read. Render it from a PAGE, never a layout: <svelte:head> appends, so
	        two writers would leave two descriptions. Paths become absolute on this request's
	        origin ( each workspace's own host, in shared tenancy ). Whether a page may be
	        indexed at all is the server's call ( X-Robots-Tag, hooks.server.ts ). */
	let { title, description, siteName, image, imageAlt = '', type = 'website', canonical, jsonLd } : {
		title         : string
		description ? : string
		siteName ?    : string
		// A 1200×630 picture for previews; a page without its own passes the theme's.
		image ?       : string
		imageAlt ?    : string
		type ?        : 'website' | 'article'
		// Another URL that shows the same thing; default: this page without its query.
		canonical ?   : string
		// schema.org data: one object, or several.
		jsonLd ?      : object | object[]
	} = $props()

	const absolute = ( path : string ) => new URL( path, page.url.origin ).href
	const url = $derived( absolute( canonical ?? page.url.pathname ) )
	// Data, not code ( the content security policy doesn't apply ) — but a closing script tag
	// inside it would still end the tag early, so every "<" is escaped.
	const ld = $derived( jsonLd ? JSON.stringify( jsonLd ).replaceAll( '<', '\\u003c' ) : null )
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}<meta name="description" content={description} />{/if}
	<link rel="canonical" href={url} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	{#if description}<meta property="og:description" content={description} />{/if}
	{#if siteName}<meta property="og:site_name" content={siteName} />{/if}
	{#if image}
		<meta property="og:image" content={absolute( image )} />
		{#if imageAlt}<meta property="og:image:alt" content={imageAlt} />{/if}
		<meta name="twitter:card" content="summary_large_image" />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{#if ld}
		{@html `<script type="application/ld+json">${ ld }</script>`}
	{/if}
</svelte:head>
