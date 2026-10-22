<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import { BrandMark, FaviconPreview } from '#lib/layout/index.js'
	import { m } from '#lib/paraglide/messages.js'
	import { DEMO_LOGO } from '../../demo-data'

	// The workspace brand's pieces with and without a logo. The real controls are on
	// /app/settings/appearance; the public site's header is on /hello/site ( its Logo switch ).
	const name = 'Acme Inc'
</script>

<svelte:head>
	<title>{m.demo_brand_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.demo_brand_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_brand_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>BrandMark</Card.Title>
		<Card.Description>{m.demo_brand_mark_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-wrap gap-4">
		{#each [ null, DEMO_LOGO ] as logo ( logo )}
			<div class="flex w-56 items-center gap-2 rounded-lg border bg-sidebar p-2 text-sm text-sidebar-foreground">
				<BrandMark {name} {logo} />
				<span class="truncate font-medium">{name}</span>
			</div>
		{/each}
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>FaviconPreview</Card.Title>
		<Card.Description>{m.demo_brand_favicon_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-6 sm:grid-cols-2">
		<FaviconPreview icon={null} title={name} />
		<FaviconPreview icon={DEMO_LOGO} title={name} />
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_brand_signin()}</Card.Title>
		<Card.Description>{m.demo_brand_signin_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-wrap gap-10">
		<div class="flex items-center gap-2.5">
			<BrandMark {name} class="size-10" />
			<span class="text-lg font-semibold tracking-tight">{name}</span>
		</div>
		<div class="flex items-center gap-2.5">
			<img src={DEMO_LOGO} alt="" class="h-10 w-auto max-w-48 object-contain" />
			<span class="text-lg font-semibold tracking-tight">{name}</span>
		</div>
	</Card.Content>
	<Card.Footer>
		<Button href="/hello/site" variant="outline" size="sm">{m.demo_brand_site()}</Button>
	</Card.Footer>
</Card.Root>
