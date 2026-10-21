<script lang="ts">
	import { AvatarField } from '$lib/components/avatar'
	import * as Card from '$lib/components/ui/card'
	import { formatBytes } from '$lib/media'
	import { m } from '$lib/paraglide/messages'

	// Nothing leaves the page: an "upload" shows the cropped square and its size.
	let image = $state<string | null>( null )
	let size = $state( 0 )

	async function upload( picture : Blob ) {
		if ( image )
			URL.revokeObjectURL( image )

		image = URL.createObjectURL( picture )
		size = picture.size
	}

	async function remove() {
		image = null
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.avatar_title()}</Card.Title>
		<Card.Description>{m.demo_avatar_desc()}</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-6">
		<AvatarField name="Ada Lovelace" {image} uploaded={!!image} {upload} {remove} />
		{#if image}
			<div class="flex items-end gap-4">
				<img src={image} alt="" class="size-32 rounded-lg border" />
				<span class="text-sm text-muted-foreground">512 × 512 WebP · {formatBytes( size )}</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
