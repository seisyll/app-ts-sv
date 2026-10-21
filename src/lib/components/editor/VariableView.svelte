<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'

	// A variable as a chip: its label from the editor's list, its {{name}} on hover.
	let { node, selected, editor } : NodeViewProps = $props()

	const label = $derived( editor.storage.variable.labels[ node.attrs.name ] as string | undefined )
</script>

<NodeViewWrapper
	as="span"
	class={cn( 'rich-text__variable cursor-grab', selected && 'ring-2 ring-ring', !label && 'border-destructive text-destructive' )}
	title={`{{${ node.attrs.name }}}`}
	data-drag-handle=""
>{label ?? `${ m.editor_unknown_variable() }: ${ node.attrs.name }`}</NodeViewWrapper>
