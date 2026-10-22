<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Dialog from '#lib/components/ui/dialog/index.js'
	import * as InputGroup from '#lib/components/ui/input-group/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { debounce } from '#lib/debounce.js'
	import { ACCEPT, type MediaRow } from '#lib/media.js'
	import { m } from '#lib/paraglide/messages.js'
	import { MediaFeed } from './feed.svelte'
	import MediaDropzone from './MediaDropzone.svelte'
	import MediaGrid from './MediaGrid.svelte'
	import { uploadMedia } from './upload'

	// Pick one image from the library, or upload one and pick it ( billing-app's field
	// needed a source; this gives it the whole library ).
	let { open = $bindable( false ), endpoint = '/api/media', onpick } : {
		open ?     : boolean
		endpoint ? : string
		onpick     : ( row : MediaRow ) => void
	} = $props()

	// svelte-ignore state_referenced_locally
	const feed = new MediaFeed( { kind: 'image', endpoint, take: 24 } )
	const search = debounce( 300, () => void feed.load() )

	let chosen = $state<MediaRow>()
	let uploading = $state( false )

	// Fresh on every open: the library may have changed since.
	$effect( () => {
		if ( open ) {
			chosen = undefined
			void feed.load()
		}

		return () => search.cancel()
	} )

	async function upload( files : File[] ) {
		uploading = true
		const rows = await uploadMedia( files, endpoint )

		uploading = false
		feed.add( rows )
		chosen = rows[ 0 ] ?? chosen
	}

	function pick() {
		if ( chosen ) {
			onpick( chosen )
			open = false
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90dvh] flex-col sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>{m.media_pick_title()}</Dialog.Title>
			<Dialog.Description>{m.media_pick_desc()}</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-3 sm:flex-row">
			<InputGroup.Root class="sm:max-w-xs">
				<InputGroup.Input type="search" placeholder={m.media_search()} aria-label={m.media_search()} bind:value={feed.search} oninput={() => search()} />
				<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
			</InputGroup.Root>
			<MediaDropzone compact class="flex-1 sm:flex-row sm:py-2" accept={ACCEPT.image} title={m.media_upload()} disabled={uploading} onfiles={upload} />
		</div>

		<div class="min-h-40 flex-1 overflow-y-auto p-1">
			{#if feed.rows.length}
				<MediaGrid items={feed.rows} view="grid" selected={chosen?.id} onselect={( item ) => ( chosen = item )} />
				{#if feed.more}
					<div class="mt-3 flex justify-center">
						<Button variant="outline" size="sm" disabled={feed.loading} onclick={() => feed.load( true )}>
							{#if feed.loading}<Spinner data-icon="inline-start" />{/if}{m.media_more()}
						</Button>
					</div>
				{/if}
			{:else if feed.loading}
				<div class="flex justify-center py-10"><Spinner /></div>
			{:else}
				<p class="py-10 text-center text-sm text-muted-foreground">{feed.error || m.media_empty()}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child( { props } )}<Button {...props} variant="outline">{m.table_cancel()}</Button>{/snippet}
			</Dialog.Close>
			<Button disabled={!chosen} onclick={pick}>{m.media_pick()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
