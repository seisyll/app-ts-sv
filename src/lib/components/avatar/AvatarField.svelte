<script lang="ts">
	import { toast } from 'svelte-sonner'
	import * as Avatar from '#lib/components/ui/avatar/index.js'
	import { Button } from '#lib/components/ui/button/index.js'
	import * as Dialog from '#lib/components/ui/dialog/index.js'
	import { Spinner } from '#lib/components/ui/spinner/index.js'
	import { initials } from '#lib/format.js'
	import { errorMessage } from '#lib/http.js'
	import { m } from '#lib/paraglide/messages.js'
	import AvatarCropper from './AvatarCropper.svelte'

	/* ―― » Someone's own picture: what shows now ( an upload, a sign-in provider's, or their
	        initials ), a button to choose a new one — cropped square in a dialog before it is
	        sent — and, when the one showing was uploaded, a way back. The caller does the
	        sending ( `upload`, `remove` ), so the field works against anything. */
	let { name, image, uploaded, upload, remove } : {
		name     : string
		image    : string | null
		// The picture showing is an upload ( so there's something to remove ).
		uploaded : boolean
		upload   : ( picture : Blob ) => Promise<void>
		remove   : () => Promise<void>
	} = $props()

	let input = $state<HTMLInputElement>()
	let cropper = $state<AvatarCropper>()
	let chosen = $state<string | null>( null )
	let busy = $state( false )

	function choose( event : Event ) {
		const file = ( event.currentTarget as HTMLInputElement ).files?.[ 0 ]

		if ( file )
			chosen = URL.createObjectURL( file )

		// The same file again must still fire a change.
		input!.value = ''
	}

	function close() {
		if ( chosen )
			URL.revokeObjectURL( chosen )

		chosen = null
	}

	async function run( work : () => Promise<void>, done : string ) {
		busy = true

		try {
			await work()
			toast.success( done )
			close()
		} catch ( caught ) {
			toast.error( errorMessage( caught ) )
		} finally {
			busy = false
		}
	}
</script>

<div class="flex items-center gap-4">
	<Avatar.Root class="size-16">
		{#if image}<Avatar.Image src={image} alt="" />{/if}
		<Avatar.Fallback class="text-lg font-medium">{initials( name )}</Avatar.Fallback>
	</Avatar.Root>
	<div class="flex flex-wrap gap-2">
		<Button variant="outline" size="sm" disabled={busy} onclick={() => input?.click()}>{m.avatar_change()}</Button>
		{#if uploaded}
			<Button variant="ghost" size="sm" disabled={busy} onclick={() => run( remove, m.avatar_removed() )}>{m.avatar_remove()}</Button>
		{/if}
	</div>
	<input bind:this={input} type="file" accept="image/*" class="hidden" onchange={choose} />
</div>

<Dialog.Root open={chosen !== null} onOpenChange={( open ) => !open && !busy && close()}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{m.avatar_crop_title()}</Dialog.Title>
			<Dialog.Description>{m.avatar_crop_desc()}</Dialog.Description>
		</Dialog.Header>
		{#if chosen}
			<AvatarCropper bind:this={cropper} src={chosen} />
		{/if}
		<Dialog.Footer>
			<Button variant="outline" disabled={busy} onclick={close}>{m.table_cancel()}</Button>
			<Button disabled={busy} onclick={() => run( async() => upload( await cropper!.crop() ), m.avatar_saved() )}>
				{#if busy}<Spinner data-icon="inline-start" />{/if}
				{m.avatar_save()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
