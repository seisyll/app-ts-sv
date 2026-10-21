<script lang="ts">
	import ImageIcon from '@lucide/svelte/icons/image'
	import ImageOffIcon from '@lucide/svelte/icons/image-off'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { Spinner } from '$lib/components/ui/spinner'
	import { ACCEPT, mediaUrl, type MediaRow } from '$lib/media'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import MediaPicker from './MediaPicker.svelte'
	import { uploadMedia } from './upload'

	/* ―― » One image on a record ( billing-app's MediaField ): a preview, upload, choose from
	        the library, remove. The value is the media id — bind it, or give `name` and the
	        field posts it with its form ( empty when removed ). Removing only unlinks: the
	        file stays in the library. */
	let { value = $bindable( null ), name, label, endpoint = '/api/media', disabled = false } : {
		value ?    : string | null
		name ?     : string
		label      : string
		endpoint ? : string
		disabled ? : boolean
	} = $props()

	// The row last chosen here; otherwise the preview comes from the id alone.
	let chosen = $state<MediaRow>()
	let picking = $state( false )
	let uploading = $state( false )
	let missing = $state( false )

	const preview = $derived( value ? ( chosen?.id === value ? chosen.thumbUrl : mediaUrl( value, 'thumb' ) ) : null )

	function set( row : MediaRow | undefined ) {
		chosen = row
		missing = false
		value = row?.id ?? null
	}

	async function upload( event : Event & { currentTarget : HTMLInputElement } ) {
		const [ file ] = event.currentTarget.files ?? []

		event.currentTarget.value = ''

		if ( !file )
			return

		uploading = true
		const [ row ] = await uploadMedia( [ file ], endpoint )

		uploading = false

		if ( row )
			set( row )
	}
</script>

<fieldset class="flex flex-col gap-2" {disabled}>
	<legend class="mb-2 text-sm font-medium">{label}</legend>
	<div class="flex items-center gap-4">
		<div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
			{#if preview && !missing}
				<img src={preview} alt="" class="size-full object-cover" onerror={() => ( missing = true )} />
			{:else if missing}
				<ImageOffIcon class="size-6" aria-hidden="true" />
			{:else}
				<ImageIcon class="size-6" aria-hidden="true" />
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<div class="flex flex-wrap gap-2">
				<!-- A label around a real file input: the native picker, keyboard included. -->
				<label class={cn( buttonVariants( { variant: 'outline', size: 'sm' } ), 'cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50', ( disabled || uploading ) && 'pointer-events-none opacity-50' )}>
					{#if uploading}<Spinner data-icon="inline-start" />{/if}
					{value ? m.media_replace() : m.media_upload()}
					<input type="file" accept={ACCEPT.image} class="sr-only" disabled={disabled || uploading} onchange={upload} />
				</label>
				<Button variant="outline" size="sm" {disabled} onclick={() => ( picking = true )}>{m.media_choose()}</Button>
				{#if value}
					<Button variant="ghost" size="sm" {disabled} onclick={() => set( undefined )}>{m.media_remove()}</Button>
				{/if}
			</div>
			<p class="text-xs text-muted-foreground" aria-live="polite">{missing ? m.media_missing() : value ? '' : m.media_none()}</p>
		</div>
	</div>
	{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
</fieldset>

<MediaPicker bind:open={picking} {endpoint} onpick={set} />
