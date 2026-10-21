<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search'
	import { page } from '$app/state'
	import * as Empty from '$lib/components/ui/empty'
	import * as InputGroup from '$lib/components/ui/input-group'
	import * as Item from '$lib/components/ui/item'
	import { HELP_CATEGORIES, helpHref, type HelpCategory } from '$lib/help'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	let query = $state( '' )

	// Words in the title or summary, any order, any case.
	const found = $derived.by( () => {
		const words = query.toLowerCase().split( /\s+/ ).filter( Boolean )

		return data.articles.filter( ( article ) => words.every( ( word ) => `${ article.title } ${ article.summary }`.toLowerCase().includes( word ) ) )
	} )
	const groups = $derived( ( Object.keys( HELP_CATEGORIES ) as HelpCategory[] )
		.map( ( category ) => ( { category, articles: found.filter( ( article ) => article.category === category ) } ) )
		.filter( ( group ) => group.articles.length ) )
</script>

<svelte:head>
	<title>{m.help_title()} · {data.tenant.name}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">{m.help_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.help_desc()}</p>
</div>

<div class="flex max-w-2xl flex-col gap-8">
	<InputGroup.Root>
		<InputGroup.Input type="search" placeholder={m.help_search()} aria-label={m.help_search()} bind:value={query} />
		<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
	</InputGroup.Root>

	{#each groups as group ( group.category )}
		<section class="flex flex-col gap-3" aria-labelledby="help-{group.category}">
			<h2 id="help-{group.category}" class="text-xs font-semibold text-muted-foreground">{HELP_CATEGORIES[ group.category ]()}</h2>
			<Item.Group class="rounded-lg border">
				{#each group.articles as article, index ( article.id )}
					{#if index}<Item.Separator />{/if}
					<Item.Root>
						{#snippet child( { props } )}
							<a {...props} href={helpHref( page.url, article.id )} data-sveltekit-replacestate data-sveltekit-noscroll data-sveltekit-keepfocus>
								<Item.Content>
									<Item.Title>{article.title}</Item.Title>
									<Item.Description>{article.summary}</Item.Description>
								</Item.Content>
							</a>
						{/snippet}
					</Item.Root>
				{/each}
			</Item.Group>
		</section>
	{:else}
		<Empty.Root>
			<Empty.Header>
				<Empty.Title>{m.help_none()}</Empty.Title>
				<Empty.Description>{query ? m.help_none_search() : m.help_none_desc()}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/each}
</div>
