<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import AlignCenterIcon from '@lucide/svelte/icons/align-center'
	import AlignLeftIcon from '@lucide/svelte/icons/align-left'
	import AlignRightIcon from '@lucide/svelte/icons/align-right'
	import ImageUpIcon from '@lucide/svelte/icons/image-up'
	import TrashIcon from '@lucide/svelte/icons/trash-2'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'

	/* ―― » The fundraiser app's resizable image ( modelled on the Edra editor ): when selected,
	        corner handles resize it — width only, so the aspect ratio can't drift — and a small
	        toolbar aligns, replaces ( the editor's media picker ) or removes it. */
	let { node, updateAttributes, deleteNode, selected, editor } : NodeViewProps = $props()

	let image = $state<HTMLImageElement>()
	let resizing = $state( false )

	const align = $derived( ( node.attrs.align ?? 'center' ) as 'left' | 'center' | 'right' )
	const controls = $derived( editor.isEditable && selected )

	const MIN_WIDTH = 64

	function startResize( event : PointerEvent, fromLeft : boolean ) {
		if ( !editor.isEditable || !image )
			return

		event.preventDefault()
		event.stopPropagation()
		resizing = true

		const startX = event.clientX
		const startWidth = image.getBoundingClientRect().width
		const maxWidth = editor.view.dom.clientWidth || startWidth

		const move = ( next : PointerEvent ) => {
			const delta = next.clientX - startX

			updateAttributes( { width: Math.max( MIN_WIDTH, Math.min( Math.round( fromLeft ? startWidth - delta : startWidth + delta ), maxWidth ) ) } )
		}
		const up = () => {
			resizing = false
			removeEventListener( 'pointermove', move )
			removeEventListener( 'pointerup', up )
		}

		addEventListener( 'pointermove', move )
		addEventListener( 'pointerup', up )
	}

	const replace = () => editor.storage.image.pick?.( ( row ) => updateAttributes( { src: row.url, alt: row.name.replace( /\.[^.]+$/, '' ) } ) )

	const corners = [
		{ id: 'top-left', left: true, class: '-top-1.5 -left-1.5 cursor-nwse-resize' },
		{ id: 'top-right', left: false, class: '-top-1.5 -right-1.5 cursor-nesw-resize' },
		{ id: 'bottom-left', left: true, class: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
		{ id: 'bottom-right', left: false, class: '-bottom-1.5 -right-1.5 cursor-nwse-resize' }
	]
	const alignments = [
		{ id: 'left', icon: AlignLeftIcon, label: m.editor_align_left() },
		{ id: 'center', icon: AlignCenterIcon, label: m.editor_align_center() },
		{ id: 'right', icon: AlignRightIcon, label: m.editor_align_right() }
	] as const
	const tool = 'inline-flex size-7 items-center justify-center rounded-sm hover:bg-accent hover:text-accent-foreground'
</script>

<NodeViewWrapper class={cn( 'my-4 flex w-full', { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[ align ] )} data-drag-handle="">
	<div class={cn( 'relative inline-block max-w-full leading-none', controls && 'rounded-sm ring-2 ring-primary ring-offset-2 ring-offset-background', resizing && 'select-none' )}>
		<img
			bind:this={image}
			src={node.attrs.src}
			alt={node.attrs.alt ?? ''}
			style:width={node.attrs.width ? `${ node.attrs.width }px` : undefined}
			class="block h-auto max-w-full rounded-sm select-none"
			draggable="false"
		/>

		{#if controls}
			{#each corners as corner ( corner.id )}
				<span role="presentation" title={m.editor_image_resize()} onpointerdown={( event ) => startResize( event, corner.left )} class={cn( 'absolute z-10 size-3 rounded-full border-2 border-background bg-primary shadow-sm', corner.class )}></span>
			{/each}

			<div contenteditable="false" class="absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md border bg-popover p-0.5 text-popover-foreground shadow-md">
				{#each alignments as option ( option.id )}
					<button type="button" title={option.label} aria-label={option.label} aria-pressed={align === option.id} onclick={() => updateAttributes( { align: option.id } )} class={cn( tool, align === option.id && 'bg-accent text-accent-foreground' )}>
						<option.icon class="size-4" />
					</button>
				{/each}
				<div class="mx-0.5 h-5 w-px bg-border"></div>
				{#if editor.storage.image.pick}
					<button type="button" title={m.editor_image_replace()} aria-label={m.editor_image_replace()} onclick={replace} class={tool}><ImageUpIcon class="size-4" /></button>
				{/if}
				<button type="button" title={m.editor_image_remove()} aria-label={m.editor_image_remove()} onclick={() => deleteNode()} class={cn( tool, 'text-destructive hover:bg-destructive/10 hover:text-destructive' )}><TrashIcon class="size-4" /></button>
			</div>
		{/if}
	</div>
</NodeViewWrapper>
