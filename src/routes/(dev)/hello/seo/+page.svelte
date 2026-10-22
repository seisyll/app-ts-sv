<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { shareImage } from '#theme'
	import { Seo } from '#lib/components/seo/index.js'
	import * as Card from '#lib/components/ui/card/index.js'
	import { m } from '#lib/paraglide/messages.js'

	const title = 'Pricing · Acme'
	const description = 'Three plans, every module included. Start free; pay per seat when your team grows.'

	// What <Seo> wrote into the head, read back after hydration.
	let tags = $state<[ string, string ][]>( [] )

	onMount( () => {
		tags = [ ...document.head.querySelectorAll( 'link[rel=canonical], meta[name=description], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]' ) ].map( ( tag ) => [
			tag.getAttribute( 'property' ) ?? tag.getAttribute( 'name' ) ?? ( tag.tagName === 'LINK' ? 'canonical' : 'json-ld' ),
			tag.getAttribute( 'content' ) ?? tag.getAttribute( 'href' ) ?? tag.textContent ?? ''
		] )
	} )
</script>

<Seo {title} {description} siteName="Acme" image={shareImage} imageAlt="Acme" jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title }} />

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_seo_preview()}</Card.Title>
		<Card.Description>{m.demo_seo_preview_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="max-w-md overflow-hidden rounded-lg border">
			<img src={shareImage} alt="" class="aspect-[1200/630] w-full object-cover" />
			<div class="flex flex-col gap-1 border-t bg-muted/40 p-3">
				<span class="text-xs text-muted-foreground uppercase">{page.url.host}</span>
				<span class="text-sm font-semibold">{title}</span>
				<span class="line-clamp-2 text-sm text-muted-foreground">{description}</span>
			</div>
		</div>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_seo_tags()}</Card.Title>
		<Card.Description>{m.demo_seo_tags_desc()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<dl class="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
			{#each tags as [ name, value ], index ( index )}
				<dt class="font-mono text-xs text-muted-foreground">{name}</dt>
				<dd class="min-w-0 font-mono text-xs break-all">{value}</dd>
			{/each}
		</dl>
	</Card.Content>
</Card.Root>
