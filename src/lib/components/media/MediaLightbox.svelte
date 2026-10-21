<script lang="ts">
	import { untrack } from 'svelte'
	import { cubicOut } from 'svelte/easing'
	import { SvelteMap } from 'svelte/reactivity'
	import { fly } from 'svelte/transition'
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import FileTextIcon from '@lucide/svelte/icons/file-text'
	import ImageIcon from '@lucide/svelte/icons/image'
	import MaximizeIcon from '@lucide/svelte/icons/maximize'
	import MinimizeIcon from '@lucide/svelte/icons/minimize'
	import PanelRightIcon from '@lucide/svelte/icons/panel-right'
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import XIcon from '@lucide/svelte/icons/x'
	import ZoomInIcon from '@lucide/svelte/icons/zoom-in'
	import ZoomOutIcon from '@lucide/svelte/icons/zoom-out'
	import * as AlertDialog from '$lib/components/ui/alert-dialog'
	import * as Avatar from '$lib/components/ui/avatar'
	import { date, initials } from '$lib/format'
	import { formatBytes, type MediaRow } from '$lib/media'
	import { m } from '$lib/paraglide/messages'

	/* ―― » The fundraiser app's media viewer: a native modal <dialog> ( focus kept inside,
	        Escape closes ) over a dark backdrop — dark in every theme, as photos read best on
	        black, which is why it carries its own colours. Wheel / buttons / + − 0 zoom
	        around the pointer, drag pans when zoomed, swipe or ← → move between items, pinch
	        on touch, double-click toggles 2.5×. A details panel ( uploader, type, size ) and,
	        when `ondelete` is given, delete with a confirm. A document shows its name and a
	        download instead of a zoomable image. */
	let { items, index = $bindable( 0 ), open = $bindable( false ), ondelete } : {
		items       : MediaRow[]
		index ?     : number
		open ?      : boolean
		// Answer true once it is gone; the caller removes it from `items`.
		ondelete ?  : ( item : MediaRow ) => Promise<boolean>
	} = $props()

	const MIN_SCALE = 1
	const MAX_SCALE = 6
	const slide = typeof window !== 'undefined' && matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 0 : 240

	let dialog = $state<HTMLDialogElement>()
	let stage = $state<HTMLDivElement>()
	let image = $state<HTMLImageElement>()

	let scale = $state( 1 )
	let tx = $state( 0 )
	let ty = $state( 0 )
	let smooth = $state( true )
	let direction = $state( 1 )
	let loaded = $state( false )
	let fullscreen = $state( false )
	let details = $state( true )
	let confirming = $state( false )
	let deleting = $state( false )

	const current = $derived( items[ index ] )
	const isImage = $derived( current?.kind === 'image' )

	const clamp = ( value : number, min : number, max : number ) => Math.min( max, Math.max( min, value ) )

	function resetView() {
		smooth = true
		scale = 1
		tx = 0
		ty = 0
	}

	// Keep a zoomed image from being dragged out of the stage.
	function clampPan() {
		if ( !stage || !image )
			return

		const overflowX = Math.max( 0, ( image.offsetWidth * scale - stage.clientWidth ) / 2 )
		const overflowY = Math.max( 0, ( image.offsetHeight * scale - stage.clientHeight ) / 2 )

		tx = clamp( tx, -overflowX, overflowX )
		ty = clamp( ty, -overflowY, overflowY )
	}

	// Zoom keeping the point under ( x, y ) where it is.
	function zoomAt( next : number, x : number, y : number ) {
		if ( !stage || !isImage )
			return

		const rect = stage.getBoundingClientRect()
		const relX = x - ( rect.left + rect.width / 2 )
		const relY = y - ( rect.top + rect.height / 2 )
		const target = clamp( next, MIN_SCALE, MAX_SCALE )

		tx = relX - ( target / scale ) * ( relX - tx )
		ty = relY - ( target / scale ) * ( relY - ty )
		scale = target

		if ( scale === 1 ) {
			tx = 0
			ty = 0
		}

		clampPan()
	}

	function zoomBy( delta : number ) {
		const rect = stage?.getBoundingClientRect()

		smooth = true
		zoomAt( scale + delta, rect ? rect.left + rect.width / 2 : 0, rect ? rect.top + rect.height / 2 : 0 )
	}

	function onWheel( event : WheelEvent ) {
		event.preventDefault()
		smooth = false
		zoomAt( scale * ( event.deltaY < 0 ? 1.15 : 1 / 1.15 ), event.clientX, event.clientY )
	}

	function onDoubleClick( event : MouseEvent ) {
		smooth = true

		if ( scale > 1 )
			resetView()
		else
			zoomAt( 2.5, event.clientX, event.clientY )
	}

	// ―― » Pointer gestures: pan when zoomed, swipe when not, pinch with two fingers.
	const pointers = new SvelteMap<number, { x : number, y : number }>()
	let gesture = $state<'idle' | 'pan' | 'swipe' | 'pinch'>( 'idle' )
	let startX = 0
	let startY = 0
	let startTx = 0
	let startTy = 0
	let swipeX = 0
	let swipeY = 0
	let pinchDistance = 0
	let pinchScale = 1

	function onPointerDown( event : PointerEvent ) {
		if ( event.button === 2 )
			return

		smooth = false
		stage?.setPointerCapture( event.pointerId )
		pointers.set( event.pointerId, { x: event.clientX, y: event.clientY } )

		if ( pointers.size === 2 ) {
			const [ a, b ] = [ ...pointers.values() ]

			pinchDistance = Math.hypot( a.x - b.x, a.y - b.y )
			pinchScale = scale
			gesture = 'pinch'

			return
		}

		startX = event.clientX
		startY = event.clientY
		startTx = tx
		startTy = ty
		swipeX = 0
		swipeY = 0
		gesture = scale > 1 ? 'pan' : 'swipe'
	}

	function onPointerMove( event : PointerEvent ) {
		if ( !pointers.has( event.pointerId ) )
			return

		pointers.set( event.pointerId, { x: event.clientX, y: event.clientY } )

		if ( gesture === 'pinch' && pointers.size >= 2 ) {
			const [ a, b ] = [ ...pointers.values() ]

			if ( pinchDistance > 0 )
				zoomAt( pinchScale * ( Math.hypot( a.x - b.x, a.y - b.y ) / pinchDistance ), ( a.x + b.x ) / 2, ( a.y + b.y ) / 2 )
		} else if ( gesture === 'pan' ) {
			tx = startTx + ( event.clientX - startX )
			ty = startTy + ( event.clientY - startY )
			clampPan()
		} else if ( gesture === 'swipe' ) {
			swipeX = event.clientX - startX
			swipeY = event.clientY - startY
		}
	}

	function onPointerUp( event : PointerEvent ) {
		stage?.releasePointerCapture?.( event.pointerId )

		const swiped = gesture === 'swipe'

		pointers.delete( event.pointerId )

		if ( swiped && pointers.size === 0 && Math.abs( swipeX ) > 60 && Math.abs( swipeX ) > Math.abs( swipeY ) ) {
			if ( swipeX < 0 )
				next()
			else
				previous()
		}

		if ( pointers.size === 0 ) {
			gesture = 'idle'
		} else if ( pointers.size === 1 ) {
			const [ point ] = [ ...pointers.values() ]

			startX = point.x
			startY = point.y
			startTx = tx
			startTy = ty
			gesture = scale > 1 ? 'pan' : 'idle'
		}
	}

	function next() {
		if ( index < items.length - 1 ) {
			direction = 1
			index += 1
			resetView()
		}
	}

	function previous() {
		if ( index > 0 ) {
			direction = -1
			index -= 1
			resetView()
		}
	}

	async function toggleFullscreen() {
		try {
			if ( document.fullscreenElement )
				await document.exitFullscreen()
			else
				await dialog?.requestFullscreen()
		} catch {
			// The browser may refuse; nothing to do.
		}
	}

	function onKeyDown( event : KeyboardEvent ) {
		const actions : Record<string, () => void> = { ArrowRight: next, ArrowLeft: previous, '+': () => zoomBy( 0.4 ), '=': () => zoomBy( 0.4 ), '-': () => zoomBy( -0.4 ), _: () => zoomBy( -0.4 ), 0: resetView }

		actions[ event.key ]?.()
	}

	async function remove() {
		if ( !current || !ondelete || deleting )
			return

		deleting = true

		try {
			if ( await ondelete( current ) )
				confirming = false
		} finally {
			deleting = false
		}
	}

	// The open dialog follows `open`; closing it ( Escape, the X ) writes it back.
	$effect( () => {
		if ( !dialog )
			return

		if ( open && !dialog.open ) {
			dialog.showModal()
			resetView()
			// On a phone the details would cover the image: start with them closed.
			details = innerWidth >= 768
		} else if ( !open && dialog.open ) {
			dialog.close()
		}
	} )

	// After a delete the caller shrinks `items`: stay in range, close when none are left.
	$effect( () => {
		if ( open && items.length === 0 )
			open = false
		else if ( index > items.length - 1 )
			index = Math.max( 0, items.length - 1 )
	} )

	// A new item ( moved to, or the one after a delete ): fit view, and the spinner until it
	// loads ( unless it's already cached ).
	$effect( () => {
		const element = image

		void current?.id
		untrack( resetView )
		confirming = false
		loaded = !isImage || !!( element && current && element.complete && element.naturalWidth > 0 )
	} )

	// The wheel listener must not be passive ( it prevents page scroll ); track fullscreen.
	$effect( () => {
		const element = stage

		if ( !element )
			return

		const onFullscreen = () => ( fullscreen = !!document.fullscreenElement )

		element.addEventListener( 'wheel', onWheel, { passive: false } )
		document.addEventListener( 'fullscreenchange', onFullscreen )

		return () => {
			element.removeEventListener( 'wheel', onWheel )
			document.removeEventListener( 'fullscreenchange', onFullscreen )
		}
	} )
</script>

<dialog bind:this={dialog} class="lightbox" aria-label={current?.name} onclose={() => { open = false; confirming = false; resetView() }} onkeydown={onKeyDown}>
	{#if open && current}
		<div class="lightbox__layout">
			<div class="lightbox__stage-col">
				<div class="lightbox__toolbar">
					<div class="lightbox__title">
						{#if isImage}<ImageIcon class="size-4 shrink-0 opacity-70" />{:else}<FileTextIcon class="size-4 shrink-0 opacity-70" />{/if}
						<span>{current.name}</span>
					</div>

					{#if isImage}
						<button type="button" class="lightbox__btn" aria-label={m.media_zoom_out()} disabled={scale <= MIN_SCALE} onclick={() => zoomBy( -0.4 )}><ZoomOutIcon class="size-5" /></button>
						<span class="lightbox__zoom select-none">{Math.round( scale * 100 )}%</span>
						<button type="button" class="lightbox__btn" aria-label={m.media_zoom_in()} disabled={scale >= MAX_SCALE} onclick={() => zoomBy( 0.4 )}><ZoomInIcon class="size-5" /></button>
						<button type="button" class="lightbox__btn" aria-label={m.media_zoom_reset()} disabled={scale === 1 && tx === 0 && ty === 0} onclick={resetView}><RotateCcwIcon class="size-5" /></button>
					{/if}
					<a class="lightbox__btn" href={current.url} download={current.name} aria-label={m.media_download()}><DownloadIcon class="size-5" /></a>
					<button type="button" class={[ 'lightbox__btn', details && 'lightbox__btn--active' ]} aria-label={m.media_details()} aria-pressed={details} onclick={() => ( details = !details )}><PanelRightIcon class="size-5" /></button>
					<button type="button" class="lightbox__btn" aria-label={fullscreen ? m.media_exit_fullscreen() : m.media_fullscreen()} onclick={toggleFullscreen}>
						{#if fullscreen}<MinimizeIcon class="size-5" />{:else}<MaximizeIcon class="size-5" />{/if}
					</button>
					<button type="button" class="lightbox__btn" aria-label={m.media_close()} onclick={() => ( open = false )}><XIcon class="size-5" /></button>
				</div>

				<div
					bind:this={stage}
					class={[ 'lightbox__stage', scale > 1 && 'zoomed', gesture === 'pan' && 'grabbing' ]}
					role="group"
					aria-label={m.media_stage()}
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
					ondblclick={onDoubleClick}
				>
					{#key index}
						<div class="lightbox__slide" in:fly={{ x: direction * 64, duration: slide, easing: cubicOut, opacity: 0 }} out:fly={{ x: direction * -64, duration: slide, easing: cubicOut, opacity: 0 }}>
							{#if isImage}
								{#if !loaded}<div class="lightbox__spinner" role="status" aria-label={m.media_loading()}></div>{/if}
								<img
									bind:this={image}
									class={[ 'lightbox__img', smooth && 'lightbox__img--smooth', loaded && 'lightbox__img--loaded' ]}
									src={current.url}
									alt={current.name}
									draggable="false"
									style:transform={`translate(${ tx }px, ${ ty }px) scale(${ scale })`}
									onload={() => { loaded = true; clampPan() }}
									onerror={() => ( loaded = true )}
								/>
							{:else}
								<div class="lightbox__document">
									<FileTextIcon class="size-16 opacity-70" />
									<span class="lightbox__document-name">{current.name}</span>
									<a class="lightbox__document-download" href={current.url} download={current.name}><DownloadIcon class="size-4" />{m.media_download()} · {formatBytes( current.size )}</a>
								</div>
							{/if}
						</div>
					{/key}
				</div>

				{#if items.length > 1}
					<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" aria-label={m.media_previous()} disabled={index === 0} onclick={previous}><ChevronLeftIcon class="size-6" /></button>
					<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" aria-label={m.media_next()} disabled={index === items.length - 1} onclick={next}><ChevronRightIcon class="size-6" /></button>
					<div class="lightbox__counter select-none">{index + 1} / {items.length}</div>
				{/if}
			</div>

			<div class="lightbox__sidebar-wrap" data-open={details}>
				<aside class="lightbox__sidebar" aria-label={m.media_details_title()}>
					<h2 class="lightbox__sidebar-title select-none">{m.media_details_title()}</h2>

					<div class="lightbox__uploader">
						<Avatar.Root class="size-10 rounded-full">
							<Avatar.Fallback class="bg-white/10 text-sm font-medium text-white">{current.uploader ? initials( current.uploader ) : '?'}</Avatar.Fallback>
						</Avatar.Root>
						<span class="lightbox__uploader-name">{current.uploader ?? m.media_uploader_unknown()}</span>
					</div>

					<dl class="lightbox__fields">
						<div class="lightbox__field"><dt>{m.media_field_name()}</dt><dd>{current.name}</dd></div>
						<div class="lightbox__field"><dt>{m.media_field_type()}</dt><dd>{current.mime}</dd></div>
						{#if current.width && current.height}
							<div class="lightbox__field"><dt>{m.media_field_dimensions()}</dt><dd>{current.width} × {current.height} px</dd></div>
						{/if}
						<div class="lightbox__field"><dt>{m.media_field_size()}</dt><dd>{formatBytes( current.size )}</dd></div>
						<div class="lightbox__field"><dt>{m.media_field_uploaded()}</dt><dd class="lightbox__mono">{date( current.createdAt )}</dd></div>
					</dl>

					{#if ondelete}
						<button type="button" class="lightbox__delete" onclick={() => ( confirming = true )}><Trash2Icon class="size-4" />{m.media_delete()}</button>
					{/if}
				</aside>
			</div>
		</div>
	{/if}
</dialog>

<!-- Portalled INTO the dialog: the dialog sits in the top layer, so anything outside it
     would render underneath. -->
<AlertDialog.Root bind:open={confirming}>
	<AlertDialog.Content portalProps={{ to: dialog }}>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.media_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>{m.media_delete_desc()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleting}>{m.table_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" disabled={deleting} onclick={remove}>{deleting ? m.media_deleting() : m.media_delete()}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<style>
	.lightbox {
		width: 100vw;
		max-width: 100vw;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		overflow: hidden;
	}

	.lightbox::backdrop {
		background: rgb(0 0 0 / 0.88);
		backdrop-filter: blur(3px);
	}

	.lightbox__layout {
		display: flex;
		width: 100%;
		height: 100%;
		color: #fff;
	}

	.lightbox__stage-col {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.lightbox__toolbar {
		position: absolute;
		inset: 0 0 auto;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 1rem;
		background: linear-gradient(to bottom, rgb(0 0 0 / 0.6), transparent);
	}

	.lightbox__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		margin-right: auto;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.lightbox__title span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lightbox__btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		flex: 0 0 auto;
		border-radius: 0.6rem;
		background: rgb(255 255 255 / 0.08);
		color: #fff;
		transition: background 0.15s ease;
	}

	.lightbox__btn:hover {
		background: rgb(255 255 255 / 0.2);
	}

	.lightbox__btn:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	.lightbox__btn--active {
		background: rgb(255 255 255 / 0.28);
	}

	.lightbox__btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* A tooltip from each button's aria-label. */
	.lightbox__btn::after {
		content: attr(aria-label);
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.5rem;
		border-radius: 0.35rem;
		background: rgb(0 0 0 / 0.92);
		color: #fff;
		font-size: 0.72rem;
		line-height: 1;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.12s ease;
		z-index: 10;
	}

	.lightbox__btn:hover::after,
	.lightbox__btn:focus-visible::after {
		opacity: 1;
	}

	.lightbox__nav--prev::after {
		left: 0;
		transform: none;
	}

	.lightbox__nav--next::after {
		left: auto;
		right: 0;
		transform: none;
	}

	.lightbox__zoom {
		min-width: 3.2rem;
		text-align: center;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	/* min-width/height 0 let the stage shrink below the image, so tall images fit. */
	.lightbox__stage {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		user-select: none;
		cursor: zoom-in;
	}

	.lightbox__stage.zoomed {
		cursor: grab;
	}

	.lightbox__stage.grabbing {
		cursor: grabbing;
	}

	.lightbox__slide {
		position: absolute;
		inset: 0;
		padding: 3.5rem 0.75rem 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox__stage img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		transform-origin: center center;
		will-change: transform;
		-webkit-user-drag: none;
	}

	.lightbox__img {
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.lightbox__img--loaded {
		opacity: 1;
	}

	.lightbox__img--smooth {
		transition: transform 0.2s ease, opacity 0.3s ease;
	}

	.lightbox__spinner {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 2.75rem;
		height: 2.75rem;
		border: 3px solid rgb(255 255 255 / 0.25);
		border-top-color: #fff;
		border-radius: 50%;
		animation: lightbox-spin 0.8s linear infinite;
		pointer-events: none;
	}

	@keyframes lightbox-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.lightbox__document {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 28rem;
		text-align: center;
	}

	.lightbox__document-name {
		font-size: 1.05rem;
		font-weight: 500;
		word-break: break-word;
	}

	.lightbox__document-download {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-radius: 0.6rem;
		background: #fff;
		color: #111;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.lightbox__nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		width: 2.75rem;
		height: 2.75rem;
	}

	.lightbox__nav--prev {
		left: 0.75rem;
	}

	.lightbox__nav--next {
		right: 0.75rem;
	}

	.lightbox__counter {
		position: absolute;
		bottom: 0.9rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.6);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	/* The details column animates its width, so the stage shrinks with it. */
	.lightbox__sidebar-wrap {
		flex: 0 0 auto;
		width: 0;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
		transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.lightbox__sidebar-wrap[data-open='true'] {
		width: 20rem;
		pointer-events: auto;
	}

	.lightbox__sidebar {
		width: 20rem;
		height: 100%;
		overflow-y: auto;
		padding: 1.25rem;
		background: #14151a;
		color: #e8e8ec;
		border-left: 1px solid rgb(255 255 255 / 0.08);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.lightbox__sidebar-wrap[data-open='true'] .lightbox__sidebar {
		opacity: 1;
	}

	.lightbox__sidebar-title {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.lightbox__uploader {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding-bottom: 1rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgb(255 255 255 / 0.08);
	}

	.lightbox__uploader-name {
		font-size: 0.9rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lightbox__fields {
		margin: 0;
	}

	.lightbox__field {
		padding: 0.55rem 0;
		border-bottom: 1px solid rgb(255 255 255 / 0.06);
	}

	.lightbox__field dt {
		font-size: 0.68rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #8b909b;
		margin-bottom: 0.15rem;
	}

	.lightbox__field dd {
		margin: 0;
		font-size: 0.85rem;
		color: #f0f1f4;
		word-break: break-word;
	}

	.lightbox__mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.78rem;
	}

	.lightbox__delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		margin-top: 1.25rem;
		padding: 0.55rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: #fca5a5;
		background: rgb(239 68 68 / 0.12);
		border: 1px solid rgb(239 68 68 / 0.3);
		transition: background 0.15s ease;
	}

	.lightbox__delete:hover {
		background: rgb(239 68 68 / 0.2);
	}

	/* Phones: details slide up from the bottom over the image. */
	@media (max-width: 767px) {
		.lightbox__sidebar-wrap {
			position: absolute;
			inset: auto 0 0;
			width: auto;
			height: auto;
			overflow: visible;
			transition: none;
			z-index: 4;
		}

		.lightbox__sidebar-wrap[data-open='true'] {
			width: auto;
		}

		.lightbox__sidebar {
			width: 100%;
			height: auto;
			max-height: 60vh;
			border-left: 0;
			border-top: 1px solid rgb(255 255 255 / 0.12);
			border-radius: 1rem 1rem 0 0;
			opacity: 1;
			transform: translateY(100%);
			transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
		}

		.lightbox__sidebar-wrap[data-open='true'] .lightbox__sidebar {
			transform: translateY(0);
		}
	}

	@media (max-width: 480px) {
		.lightbox__zoom {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lightbox__img--smooth,
		.lightbox__sidebar-wrap,
		.lightbox__sidebar {
			transition: none;
		}
	}
</style>
