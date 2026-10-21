<script lang="ts">
	import { toast } from 'svelte-sonner'
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid'
	import ListIcon from '@lucide/svelte/icons/list'
	import SearchIcon from '@lucide/svelte/icons/search'
	import { MediaDropzone, MediaFeed, MediaGrid, MediaLightbox, uploadMedia, type MediaView } from '$lib/components/media'
	import { Button } from '$lib/components/ui/button'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { debounce } from '$lib/debounce'
	import { errorMessage, http } from '$lib/http'
	import { ACCEPT, type MediaKind, type MediaRow } from '$lib/media'
	import { m } from '$lib/paraglide/messages'

	let { data } = $props()

	// svelte-ignore state_referenced_locally
	const feeds = { image: new MediaFeed( { kind: 'image', initial: data.images } ), document: new MediaFeed( { kind: 'document' } ) }

	let kind = $state<MediaKind>( 'image' )
	let view = $state<MediaView>( 'masonry' )
	let viewing = $state( false )
	let index = $state( 0 )
	let uploading = $state( false )

	const feed = $derived( feeds[ kind ] )

	// One search box for both tabs; a tab loads when its results are for another search.
	let query = $state( '' )
	const loaded = { image: true, document: false }

	function refresh( target : MediaKind ) {
		feeds[ target ].search = query
		loaded[ target ] = true
		void feeds[ target ].load()
	}

	const search = debounce( 300, () => refresh( kind ) )

	// The last view chosen, per browser ( storage may be off: then the default ).
	const VIEW_KEY = 'media-view'

	$effect( () => {
		try {
			const saved = localStorage.getItem( VIEW_KEY )

			if ( saved === 'masonry' || saved === 'grid' || saved === 'list' )
				view = saved
		} catch {
			// Storage blocked: keep the default.
		}

		return () => search.cancel()
	} )

	function chooseView( next : string | undefined ) {
		if ( next !== 'masonry' && next !== 'grid' && next !== 'list' )
			return

		view = next

		try {
			localStorage.setItem( VIEW_KEY, next )
		} catch {
			// Storage blocked: the choice lasts for this visit.
		}
	}

	function chooseKind( next : string | undefined ) {
		if ( next !== 'image' && next !== 'document' )
			return

		kind = next

		if ( !loaded[ next ] || feeds[ next ].search !== query )
			refresh( next )
	}

	async function upload( files : File[] ) {
		uploading = true
		const rows = await uploadMedia( files )

		uploading = false
		feeds.image.add( rows )
		feeds.document.add( rows )
	}

	async function remove( item : MediaRow ) : Promise<boolean> {
		try {
			await http.delete( `/api/media/${ item.id }` )
			feeds[ item.kind ].remove( item.id )
			toast.success( m.media_deleted() )

			return true
		} catch ( caught ) {
			toast.error( errorMessage( caught ) )

			return false
		}
	}

	const views = [
		{ value: 'masonry', label: m.media_view_masonry(), icon: GalleryVerticalEndIcon },
		{ value: 'grid', label: m.media_view_grid(), icon: LayoutGridIcon },
		{ value: 'list', label: m.media_view_list(), icon: ListIcon }
	]
</script>

<svelte:head>
	<title>{m.media_title()}</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold tracking-tight">{m.media_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.media_desc()}</p>
	</div>

	{#if data.canUpload}
		<MediaDropzone
			accept={`${ ACCEPT.image },${ ACCEPT.document }`}
			title={m.media_drop()}
			hint={`${ m.media_drop_images() } · ${ m.media_drop_documents() }`}
			disabled={uploading}
			onfiles={upload}
		/>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<ToggleGroup.Root type="single" variant="outline" value={kind} onValueChange={chooseKind} aria-label={m.media_kind()}>
			<ToggleGroup.Item value="image">{m.media_images()}</ToggleGroup.Item>
			<ToggleGroup.Item value="document">{m.media_documents()}</ToggleGroup.Item>
		</ToggleGroup.Root>

		<InputGroup.Root class="w-full sm:w-64">
			<InputGroup.Input type="search" placeholder={m.media_search()} aria-label={m.media_search()} bind:value={query} oninput={() => search()} />
			<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
		</InputGroup.Root>

		<span class="text-sm text-muted-foreground sm:ms-auto">{m.media_count( { shown: feed.rows.length, total: feed.total } )}</span>

		{#if kind === 'image'}
			<ToggleGroup.Root type="single" variant="outline" size="sm" value={view} onValueChange={chooseView} aria-label={m.media_view()}>
				{#each views as option ( option.value )}
					<ToggleGroup.Item value={option.value} aria-label={option.label} title={option.label}><option.icon /></ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		{/if}
	</div>

	{#if feed.rows.length}
		<MediaGrid items={feed.rows} {view} onselect={( _, at ) => { index = at; viewing = true }} />
		{#if feed.more}
			<div class="flex justify-center">
				<Button variant="outline" disabled={feed.loading} onclick={() => feed.load( true )}>
					{#if feed.loading}<Spinner data-icon="inline-start" />{/if}{m.media_more()}
				</Button>
			</div>
		{/if}
	{:else if feed.loading}
		<div class="flex justify-center py-16"><Spinner /></div>
	{:else}
		<div class="flex flex-col items-center gap-1 py-16 text-center">
			<p class="font-medium">{feed.error || m.media_empty()}</p>
			{#if !feed.error}<p class="text-sm text-muted-foreground">{m.media_empty_desc()}</p>{/if}
		</div>
	{/if}
</div>

<MediaLightbox items={feed.rows} bind:index bind:open={viewing} ondelete={data.canDelete ? remove : undefined} />
