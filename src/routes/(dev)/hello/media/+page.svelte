<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { MediaDropzone, MediaFeed, MediaField, MediaGrid, MediaLightbox, type MediaView } from '$lib/components/media'
	import * as Card from '$lib/components/ui/card'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { ACCEPT, type MediaRow } from '$lib/media'
	import { m } from '$lib/paraglide/messages'

	// The media components against a mock library ( /api/hello/media: generated pictures,
	// nothing stored ). The real library is /app/media.
	const feed = new MediaFeed( { kind: 'image', endpoint: '/api/hello/media', take: 12 } )

	let view = $state<MediaView>( 'masonry' )
	let viewing = $state( false )
	let index = $state( 0 )
	let cover = $state<string | null>( null )

	$effect( () => {
		void feed.load()
	} )

	// Deleting only drops the row here.
	async function remove( item : MediaRow ) {
		feed.remove( item.id )
		toast.success( m.media_deleted() )

		return true
	}

	// Public / private only flips the row here ( every fourth mock starts public ).
	async function publish( item : MediaRow, value : boolean ) {
		feed.replace( { ...item, public: value } )
	}
</script>

<svelte:head>
	<title>{m.media_title()} · {m.hello_title()}</title>
</svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold tracking-tight">{m.media_title()}</h1>
	<p class="text-sm text-muted-foreground">{m.demo_media_desc()}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_media_field()}</Card.Title>
		<Card.Description>{m.demo_media_field_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		<MediaField label={m.demo_media_cover()} bind:value={cover} endpoint="/api/hello/media" />
		<p class="text-xs text-muted-foreground">value: <code>{cover ?? 'null'}</code></p>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.demo_media_grid()}</Card.Title>
		<Card.Description>{m.demo_media_grid_desc()}</Card.Description>
		<Card.Action>
			<ToggleGroup.Root type="single" variant="outline" size="sm" value={view} onValueChange={( next ) => next && ( view = next as MediaView )} aria-label={m.media_view()}>
				<ToggleGroup.Item value="masonry">{m.media_view_masonry()}</ToggleGroup.Item>
				<ToggleGroup.Item value="grid">{m.media_view_grid()}</ToggleGroup.Item>
				<ToggleGroup.Item value="list">{m.media_view_list()}</ToggleGroup.Item>
			</ToggleGroup.Root>
		</Card.Action>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<MediaDropzone accept={ACCEPT.image} title={m.media_drop()} hint={m.media_drop_images()} onfiles={( files ) => toast( files.map( ( file ) => file.name ).join( ', ' ) )} />
		<MediaGrid items={feed.rows} {view} onselect={( _, at ) => { index = at; viewing = true }} />
	</Card.Content>
</Card.Root>

<MediaLightbox items={feed.rows} bind:index bind:open={viewing} ondelete={remove} onpublic={publish} />
