<script lang="ts">
	import './help-article.css'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import * as Sheet from '#lib/components/ui/sheet/index.js'
	import { Skeleton } from '#lib/components/ui/skeleton/index.js'
	import { helpHref } from '#lib/help/index.js'
	import { errorMessage, http } from '#lib/http.js'
	import { m } from '#lib/paraglide/messages.js'

	/* ―― » The help article named by ?help=<id>, over whatever page is open ( mounted once,
	        in the /app layout ). The URL is its only state: HelpLink and the help centre link
	        to it, support can send it, and closing takes the parameter away again. The article
	        is fetched when opened ( /api/help/<id> ), so pages carry none of the text. */
	type Article = { id : string, title : string, html : string }

	const id = $derived( page.url.searchParams.get( 'help' ) )

	let article = $state<Article | null>( null )
	let failed = $state<string | null>( null )

	$effect( () => {
		const wanted = id

		if ( !wanted || article?.id === wanted )
			return

		article = null
		failed = null
		http.get<Article>( `/api/help/${ encodeURIComponent( wanted ) }` ).then(
			( found ) => {
				if ( wanted === id )
					article = found
			},
			( caught ) => ( failed = errorMessage( caught ) )
		)
	} )

	const close = () => goto( helpHref( page.url, null ), { replace: true, reset: false } )
</script>

<Sheet.Root open={!!id} onOpenChange={( open ) => !open && close()}>
	<Sheet.Content side="right" class="w-full gap-0 overflow-y-auto sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Description>{m.help_title()}</Sheet.Description>
			<Sheet.Title class="text-lg">{article?.title ?? ( failed ? m.help_unavailable() : '' )}</Sheet.Title>
		</Sheet.Header>
		<div class="px-4 pb-8">
			{#if article}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- the app's own Markdown, rendered on the server -->
				<div class="help-article">{@html article.html}</div>
			{:else if failed}
				<p class="text-sm text-muted-foreground">{failed}</p>
			{:else}
				<div class="flex flex-col gap-3" aria-busy="true">
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-5/6" />
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
