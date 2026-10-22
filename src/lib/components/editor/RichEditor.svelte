<script lang="ts" module>
	import type { MediaRow } from '$lib/media'

	// What the editor's node views reach through `editor.storage`.
	declare module '@tiptap/core' {
		interface Storage {
			image    : { pick : ( ( apply : ( row : MediaRow ) => void ) => void ) | null }
			variable : { labels : Record<string, string> }
		}
	}

	export type EditorVariable = { name : string, label : string }
</script>

<script lang="ts">
	import { onMount } from 'svelte'
	import { get, type Readable } from 'svelte/store'
	import { createEditor, EditorContent, SvelteNodeViewRenderer, type Editor } from 'svelte-tiptap'
	import Typography from '@tiptap/extension-typography'
	import { Placeholder } from '@tiptap/extensions'
	import AlignCenterIcon from '@lucide/svelte/icons/text-align-center'
	import AlignJustifyIcon from '@lucide/svelte/icons/text-align-justify'
	import AlignLeftIcon from '@lucide/svelte/icons/text-align-start'
	import AlignRightIcon from '@lucide/svelte/icons/text-align-end'
	import BoldIcon from '@lucide/svelte/icons/bold'
	import BracesIcon from '@lucide/svelte/icons/braces'
	import CodeIcon from '@lucide/svelte/icons/code'
	import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left'
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
	import Heading1Icon from '@lucide/svelte/icons/heading-1'
	import Heading2Icon from '@lucide/svelte/icons/heading-2'
	import Heading3Icon from '@lucide/svelte/icons/heading-3'
	import ImagePlusIcon from '@lucide/svelte/icons/image-plus'
	import ItalicIcon from '@lucide/svelte/icons/italic'
	import LinkIcon from '@lucide/svelte/icons/link'
	import ListIcon from '@lucide/svelte/icons/list'
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import PilcrowIcon from '@lucide/svelte/icons/pilcrow'
	import QuoteIcon from '@lucide/svelte/icons/quote'
	import Redo2Icon from '@lucide/svelte/icons/redo-2'
	import StrikethroughIcon from '@lucide/svelte/icons/strikethrough'
	import TrashIcon from '@lucide/svelte/icons/trash-2'
	import UnderlineIcon from '@lucide/svelte/icons/underline'
	import Undo2Icon from '@lucide/svelte/icons/undo-2'
	import { MediaPicker } from '$lib/components/media'
	import { Button } from '$lib/components/ui/button'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import * as InputGroup from '$lib/components/ui/input-group'
	import * as Popover from '$lib/components/ui/popover'
	import { Toggle } from '$lib/components/ui/toggle'
	import { EMPTY_RICH_TEXT } from '$lib/editor/document'
	import { renderRichText } from '$lib/editor/render'
	import { richTextExtensions, RichImage, safeHref, Variable, type RichText } from '$lib/editor/schema'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import ImageView from './ImageView.svelte'
	import VariableView from './VariableView.svelte'
	import './rich-text.css'

	/* ―― » The rich-text editor ( from the fundraiser app's HTMLEditor and EmailEditor ), one
	        per instance — several can share a page. `value` is TipTap JSON: bind it, or give
	        `name` and it posts as JSON with its form. Validate it on the server with
	        richTextSchema ( $lib/editor/document ) and show it with renderRichText + <RichText />.

	          images     — the image button and node, picking from the media library
	          variables  — a menu of {{name}} chips ( email / notification templates )

	        Until the editor mounts, the server-rendered HTML stands in, so nothing jumps. */
	let {
		value = $bindable( null ),
		name,
		label,
		placeholder = m.editor_placeholder(),
		// The picker is the media library's: off without that module.
		images = MODULES.media,
		variables = [],
		mediaEndpoint = '/api/media',
		invalid = false,
		class: className
	} : {
		value ?         : RichText | null
		name ?          : string
		label           : string
		placeholder ?   : string
		images ?        : boolean
		variables ?     : EditorVariable[]
		mediaEndpoint ? : string
		invalid ?       : boolean
		class ?         : string
	} = $props()

	let editor = $state<Readable<Editor>>()
	let picking = $state( false )
	let pending : ( ( row : MediaRow ) => void ) | undefined
	let link = $state( '' )
	let linkOpen = $state( false )
	let linkError = $state( false )

	// svelte-ignore state_referenced_locally
	const fallback = renderRichText( value ?? EMPTY_RICH_TEXT )

	function pick( apply : ( row : MediaRow ) => void ) {
		pending = apply
		picking = true
	}

	onMount( () => {
		// Instance state for the node views; plain objects, read when they render.
		const labels = Object.fromEntries( variables.map( ( variable ) => [ variable.name, variable.label ] ) )

		editor = createEditor( {
			extensions: [
				...richTextExtensions.filter( ( extension ) => extension.name !== 'image' && extension.name !== 'variable' ),
				RichImage.extend( { addStorage: () => ( { pick: images ? pick : null } ), addNodeView: () => SvelteNodeViewRenderer( ImageView ) } ),
				Variable.extend( { addStorage: () => ( { labels } ), addNodeView: () => SvelteNodeViewRenderer( VariableView ) } ),
				Typography,
				Placeholder.configure( { placeholder } )
			],
			content    : value ?? EMPTY_RICH_TEXT,
			editorProps: { attributes: { class: 'rich-text rich-editor__content', 'aria-label': label, 'aria-multiline': 'true', role: 'textbox' } },
			onUpdate   : ( { editor: instance } ) => {
				value = instance.getJSON() as RichText
			}
		} )

		return () => get( editor! ).destroy()
	} )

	// A value set from outside ( a form reset, a loaded record ) replaces the document.
	$effect( () => {
		const instance = editor && get( editor )
		const next = value ?? EMPTY_RICH_TEXT

		if ( instance && JSON.stringify( next ) !== JSON.stringify( instance.getJSON() ) )
			instance.commands.setContent( next, { emitUpdate: false } )
	} )

	const run = ( command : ( chain : ReturnType<Editor[ 'chain' ]> ) => ReturnType<Editor[ 'chain' ]> ) => () => editor && command( get( editor ).chain().focus() ).run()

	function applyLink() {
		const href = link.trim()
		const full = href && !/^[a-z]+:|^[/#]/i.test( href ) ? `https://${ href }` : href

		if ( !safeHref( full ) ) {
			linkError = true

			return
		}

		run( ( chain ) => chain.extendMarkRange( 'link' ).setLink( { href: full } ) )()
		linkOpen = false
	}

	const groups = [
		[
			{ id: 'paragraph', label: m.editor_paragraph(), icon: PilcrowIcon, active: ( e : Editor ) => e.isActive( 'paragraph' ), run: run( ( c ) => c.setParagraph() ) },
			{ id: 'h1', label: m.editor_heading( { level: 1 } ), icon: Heading1Icon, active: ( e : Editor ) => e.isActive( 'heading', { level: 1 } ), run: run( ( c ) => c.toggleHeading( { level: 1 } ) ) },
			{ id: 'h2', label: m.editor_heading( { level: 2 } ), icon: Heading2Icon, active: ( e : Editor ) => e.isActive( 'heading', { level: 2 } ), run: run( ( c ) => c.toggleHeading( { level: 2 } ) ) },
			{ id: 'h3', label: m.editor_heading( { level: 3 } ), icon: Heading3Icon, active: ( e : Editor ) => e.isActive( 'heading', { level: 3 } ), run: run( ( c ) => c.toggleHeading( { level: 3 } ) ) }
		],
		[
			{ id: 'bold', label: m.editor_bold(), icon: BoldIcon, active: ( e : Editor ) => e.isActive( 'bold' ), run: run( ( c ) => c.toggleBold() ) },
			{ id: 'italic', label: m.editor_italic(), icon: ItalicIcon, active: ( e : Editor ) => e.isActive( 'italic' ), run: run( ( c ) => c.toggleItalic() ) },
			{ id: 'underline', label: m.editor_underline(), icon: UnderlineIcon, active: ( e : Editor ) => e.isActive( 'underline' ), run: run( ( c ) => c.toggleUnderline() ) },
			{ id: 'strike', label: m.editor_strike(), icon: StrikethroughIcon, active: ( e : Editor ) => e.isActive( 'strike' ), run: run( ( c ) => c.toggleStrike() ) },
			{ id: 'code', label: m.editor_code(), icon: CodeIcon, active: ( e : Editor ) => e.isActive( 'code' ), run: run( ( c ) => c.toggleCode() ) }
		],
		[
			{ id: 'bullets', label: m.editor_bullets(), icon: ListIcon, active: ( e : Editor ) => e.isActive( 'bulletList' ), run: run( ( c ) => c.toggleBulletList() ) },
			{ id: 'numbers', label: m.editor_numbers(), icon: ListOrderedIcon, active: ( e : Editor ) => e.isActive( 'orderedList' ), run: run( ( c ) => c.toggleOrderedList() ) },
			{ id: 'quote', label: m.editor_quote(), icon: QuoteIcon, active: ( e : Editor ) => e.isActive( 'blockquote' ), run: run( ( c ) => c.toggleBlockquote() ) },
			{ id: 'divider', label: m.editor_divider(), icon: MinusIcon, active: () => false, run: run( ( c ) => c.setHorizontalRule() ) }
		],
		[
			{ id: 'left', label: m.editor_align_left(), icon: AlignLeftIcon, active: ( e : Editor ) => e.isActive( { textAlign: 'left' } ), run: run( ( c ) => c.setTextAlign( 'left' ) ) },
			{ id: 'center', label: m.editor_align_center(), icon: AlignCenterIcon, active: ( e : Editor ) => e.isActive( { textAlign: 'center' } ), run: run( ( c ) => c.setTextAlign( 'center' ) ) },
			{ id: 'right', label: m.editor_align_right(), icon: AlignRightIcon, active: ( e : Editor ) => e.isActive( { textAlign: 'right' } ), run: run( ( c ) => c.setTextAlign( 'right' ) ) },
			{ id: 'justify', label: m.editor_align_justify(), icon: AlignJustifyIcon, active: ( e : Editor ) => e.isActive( { textAlign: 'justify' } ), run: run( ( c ) => c.setTextAlign( 'justify' ) ) }
		]
	]
</script>

<div class={cn( 'overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50', invalid && 'border-destructive', className )}>
	<div role="toolbar" aria-label={m.editor_toolbar()} class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/40 p-1.5">
		{#if $editor}
			<div class="flex items-center">
				<Button variant="ghost" size="icon-sm" aria-label={m.editor_undo()} title={m.editor_undo()} disabled={!$editor.can().undo()} onclick={run( ( c ) => c.undo() )}><Undo2Icon /></Button>
				<Button variant="ghost" size="icon-sm" aria-label={m.editor_redo()} title={m.editor_redo()} disabled={!$editor.can().redo()} onclick={run( ( c ) => c.redo() )}><Redo2Icon /></Button>
			</div>

			{#each groups as group, index ( index )}
				<div class="flex items-center">
					{#each group as item ( item.id )}
						<Toggle size="sm" aria-label={item.label} title={item.label} pressed={item.active( $editor )} onPressedChange={item.run}><item.icon /></Toggle>
					{/each}
					{#if index === 1}
						<!-- The link: a popover with the address, open and remove ( the fundraiser app's ). -->
						<Popover.Root bind:open={linkOpen} onOpenChange={( open ) => { if ( open ) { link = $editor.getAttributes( 'link' ).href ?? ''; linkError = false } }}>
							<Popover.Trigger>
								{#snippet child( { props } )}
									<Toggle {...props} size="sm" aria-label={m.editor_link()} title={m.editor_link()} pressed={$editor.isActive( 'link' )}><LinkIcon /></Toggle>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-80">
								<form class="flex flex-col gap-2" onsubmit={( event ) => { event.preventDefault(); applyLink() }}>
									<InputGroup.Root>
										<InputGroup.Input bind:value={link} placeholder={m.editor_link_placeholder()} aria-label={m.editor_link()} aria-invalid={linkError || undefined} oninput={() => ( linkError = false )} />
										<InputGroup.Addon align="inline-end">
											<InputGroup.Button type="submit" size="icon-xs" aria-label={m.editor_link_apply()} title={m.editor_link_apply()} disabled={!link.trim()}><CornerDownLeftIcon /></InputGroup.Button>
											<InputGroup.Button size="icon-xs" aria-label={m.editor_link_open()} title={m.editor_link_open()} disabled={!safeHref( link )} onclick={() => open( link, '_blank', 'noopener' )}><ExternalLinkIcon /></InputGroup.Button>
											<InputGroup.Button size="icon-xs" aria-label={m.editor_link_remove()} title={m.editor_link_remove()} disabled={!$editor.isActive( 'link' )} onclick={() => { run( ( c ) => c.extendMarkRange( 'link' ).unsetLink() )(); linkOpen = false }}><TrashIcon /></InputGroup.Button>
										</InputGroup.Addon>
									</InputGroup.Root>
									{#if linkError}<p class="text-xs text-destructive">{m.editor_link_invalid()}</p>{/if}
								</form>
							</Popover.Content>
						</Popover.Root>
					{/if}
				</div>
			{/each}

			{#if images || variables.length}
				<div class="flex items-center">
					{#if images}
						<Button variant="ghost" size="icon-sm" aria-label={m.editor_image()} title={m.editor_image()} onclick={() => pick( ( row ) => run( ( c ) => c.setImage( { src: row.url, alt: row.name.replace( /\.[^.]+$/, '' ) } ) )() )}><ImagePlusIcon /></Button>
					{/if}
					{#if variables.length}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child( { props } )}
									<Button {...props} variant="ghost" size="sm" aria-label={m.editor_variable()} title={m.editor_variable()}><BracesIcon data-icon="inline-start" />{m.editor_variable()}</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									{#each variables as variable ( variable.name )}
										<DropdownMenu.Item onclick={run( ( c ) => c.insertContent( { type: 'variable', attrs: { name: variable.name } } ) )}>
											<span>{variable.label}</span>
											<span class="ms-auto font-mono text-xs text-muted-foreground">{`{{${ variable.name }}}`}</span>
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="h-8"></div>
		{/if}
	</div>

	{#if $editor}
		<EditorContent editor={$editor} />
	{:else}
		<!-- Server render and first paint: the same document, not yet editable. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderRichText() output, escaped by construction -->
		<div class="rich-text rich-editor__content">{@html fallback}</div>
	{/if}

	{#if name}<input type="hidden" {name} value={JSON.stringify( value ?? EMPTY_RICH_TEXT )} />{/if}
</div>

{#if images}
	<MediaPicker bind:open={picking} endpoint={mediaEndpoint} onpick={( row ) => { pending?.( row ); pending = undefined }} />
{/if}
