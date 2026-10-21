<script lang="ts">
	import { Home } from '$theme'
	import { APP } from '$lib/config'
	import { homeContent } from '$lib/themes/content'

	let { data } = $props()

	const content = $derived( homeContent( data ) )
</script>

<svelte:head>
	<title>{APP.name}</title>
	<meta name="description" content={content.hero.lead} />
</svelte:head>

<Home {content} />
