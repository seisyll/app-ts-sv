<script lang="ts">
	import { Slider } from '#lib/components/ui/slider/index.js'
	import { m } from '#lib/paraglide/messages.js'

	/* ―― » A square out of a picture, for an avatar: the picture fills a square frame ( a
	        circle shows what most places will show ), and the person drags it into place and
	        zooms in — mouse, touch or keys ( arrows move, + and − zoom ). `crop()` answers the
	        square as a WebP of `size` pixels.

	        The picture always covers the frame: it can't be dragged or zoomed out to show
	        anything behind it, so every crop is a whole square of the picture. */
	let { src, size = 512, frame = 288 } : {
		// An object URL or any URL the page may draw ( the CSP's img-src ).
		src    : string
		// The output's edge, in pixels.
		size ? : number
		// The frame's edge on screen, in CSS pixels.
		frame ?: number
	} = $props()

	let image = $state<HTMLImageElement>()
	let natural = $state( { width: 0, height: 0 } )
	let zoom = $state( 1 )
	// The picture's top-left corner, relative to the frame's.
	let left = $state( 0 )
	let top = $state( 0 )

	// At zoom 1 the picture's shorter side just fills the frame.
	const scale = $derived( natural.width ? ( frame / Math.min( natural.width, natural.height ) ) * zoom : 1 )
	const clamp = ( value : number, min : number ) => Math.min( 0, Math.max( min, value ) )

	function place( nextLeft : number, nextTop : number ) {
		left = clamp( nextLeft, frame - natural.width * scale )
		top = clamp( nextTop, frame - natural.height * scale )
	}

	function loaded() {
		natural = { width: image!.naturalWidth, height: image!.naturalHeight }
		zoom = 1
		place( ( frame - natural.width * scale ) / 2, ( frame - natural.height * scale ) / 2 )
	}

	// Zoom about the frame's centre, so what's in the middle stays there.
	function zoomTo( next : number ) {
		const before = scale
		const centre = { x: ( frame / 2 - left ) / before, y: ( frame / 2 - top ) / before }

		zoom = Math.min( 4, Math.max( 1, next ) )
		place( frame / 2 - centre.x * scale, frame / 2 - centre.y * scale )
	}

	let drag : { x : number, y : number, left : number, top : number } | null = null

	function down( event : PointerEvent ) {
		( event.currentTarget as HTMLElement ).setPointerCapture( event.pointerId )
		drag = { x: event.clientX, y: event.clientY, left, top }
	}

	function move( event : PointerEvent ) {
		if ( drag )
			place( drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y )
	}

	function key( event : KeyboardEvent ) {
		const step = event.shiftKey ? 40 : 10
		const moves : Record<string, () => void> = {
			ArrowLeft : () => place( left + step, top ),
			ArrowRight: () => place( left - step, top ),
			ArrowUp   : () => place( left, top + step ),
			ArrowDown : () => place( left, top - step ),
			'+'       : () => zoomTo( zoom + 0.1 ),
			'='       : () => zoomTo( zoom + 0.1 ),
			'-'       : () => zoomTo( zoom - 0.1 )
		}

		if ( moves[ event.key ] ) {
			event.preventDefault()
			moves[ event.key ]()
		}
	}

	// The square in the frame, drawn at `size`.
	export function crop() : Promise<Blob> {
		const canvas = document.createElement( 'canvas' )
		const side = frame / scale

		canvas.width = canvas.height = size
		canvas.getContext( '2d' )!.drawImage( image!, -left / scale, -top / scale, side, side, 0, 0, size, size )

		return new Promise( ( resolve, reject ) => canvas.toBlob( ( blob ) => ( blob ? resolve( blob ) : reject( new Error( 'The picture could not be drawn.' ) ) ), 'image/webp', 0.9 ) )
	}
</script>

<div class="flex flex-col items-center gap-4">
	<!-- A two-way pan isn't any standard widget: role=application hands its keys to the
	     handler above, and the label says which they are. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="relative cursor-grab touch-none overflow-hidden rounded-lg bg-muted outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
		style:width="{frame}px"
		style:height="{frame}px"
		role="application"
		tabindex="0"
		aria-label={m.avatar_crop_area()}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={() => ( drag = null )}
		onpointercancel={() => ( drag = null )}
		onwheel={( event ) => {
			event.preventDefault()
			zoomTo( zoom - event.deltaY / 500 )
		}}
		onkeydown={key}
	>
		<img
			bind:this={image}
			{src}
			alt=""
			draggable="false"
			onload={loaded}
			class="pointer-events-none absolute max-w-none origin-top-left"
			style:left="{left}px"
			style:top="{top}px"
			style:width="{natural.width * scale}px"
			style:height="{natural.height * scale}px"
		/>
		<!-- What most places show: the circle; the corners only where avatars are square. -->
		<div class="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_color-mix(in_oklch,var(--background)_55%,transparent)] ring-2 ring-background/80"></div>
	</div>
	<Slider type="single" value={zoom} min={1} max={4} step={0.01} onValueChange={zoomTo} class="w-full max-w-72" aria-label={m.avatar_zoom()} />
</div>
