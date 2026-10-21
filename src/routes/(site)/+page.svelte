<script lang="ts">
	import { Home, shareImage } from '$theme'
	import { page } from '$app/state'
	import { Seo } from '$lib/components/seo'
	import { APP } from '$lib/config'
	import { homeContent } from '$lib/themes/content'

	let { data } = $props()

	const content = $derived( homeContent( data ) )
	const name = $derived( data.brand?.name ?? APP.name )
	// Who runs the site, for search results: the workspace, its address and its logo.
	const organization = $derived( {
		'@context': 'https://schema.org',
		'@type'   : 'Organization',
		name,
		url       : page.url.origin,
		...( data.brand?.logo ? { logo: new URL( data.brand.logo, page.url.origin ).href } : {} )
	} )
</script>

<Seo title={name} description={content.hero.lead} siteName={name} image={shareImage} jsonLd={organization} />

<Home {content} />
