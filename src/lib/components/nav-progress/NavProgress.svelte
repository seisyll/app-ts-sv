<script lang="ts">
	import { untrack } from 'svelte'
	import { prefersReducedMotion } from 'svelte/motion'
	import { navigating } from '$app/state'
	import { m } from '#lib/paraglide/messages.js'
	import { cn } from '#lib/utils.js'

	/* ―― » The app-wide "something is loading" bar. SvelteKit runs `load` BEFORE painting
	        the next page, so without it a slow load reads as a click that didn't take.
	        Mounted once in the root layout it follows `navigating`; pass `active` to drive
	        it from any other in-flight work instead:
	          <NavProgress active={source.loading} class="absolute" /> */
	let {
		active,
		delay = 80,
		label = m.shell_loading(),
		class: className
	} : {
		// Drive the bar manually. Omit to follow SvelteKit navigation.
		active ? : boolean
		// Grace period before drawing, in ms. Keep it short: the timer fires late under
		// a busy main thread, so a longer one silently skips the 200–300ms loads.
		delay ?  : number
		// Announced to screen readers while the bar is up.
		label ?  : string
		class ?  : string
	} = $props()

	// The creep never passes 92%: only the page arriving moves it to 100.
	const CEILING = 92
	const TICK = 240

	const busy = $derived( active ?? ( navigating.to !== null ) )

	let visible = $state( false )
	let closing = $state( false )
	let value = $state( 0 )

	$effect( () => {
		if ( busy ) {
			// Continue a still-fading bar instead of restarting it, unless it had landed.
			const restart = untrack( () => !visible || closing || value >= CEILING )

			closing = false

			let started = false

			const show = setTimeout( () => {
				if ( restart )
					value = 12

				started = true
				visible = true
			}, delay )

			const tick = setInterval( () => {
				if ( started )
					value += ( CEILING - value ) * 0.16
			}, TICK )

			return () => {
				clearTimeout( show )
				clearInterval( tick )
			}
		}

		// The navigation beat the grace period: nothing was drawn.
		if ( untrack( () => !visible ) )
			return

		// Land on 100%, fade, then unmount — timer-driven, not an outro, because outros
		// don't tick in a hidden tab and the bar would never leave the DOM.
		value = 100

		const fadeAt = setTimeout( () => {
			closing = true
		}, 180 )

		const hide = setTimeout( () => {
			visible = false
			closing = false
			value = 0
		}, 400 )

		return () => {
			clearTimeout( fadeAt )
			clearTimeout( hide )
		}
	} )

	// Reduced motion drops the easing, never the bar: the feedback still matters.
	const eased = $derived( !prefersReducedMotion.current )

	// The fill is a transform ( compositor-driven ) rather than a width, so it keeps
	// moving through the main-thread work it is reporting on. The counter-translated
	// child keeps any gradient pinned to the viewport while the clip uncovers it.
	const offset = $derived( `translateX(${ value - 100 }%)` )
	const cancel = $derived( `translateX(${ 100 - value }%)` )
	const glide = $derived( eased ? `transition: transform ${ TICK }ms linear` : '' )
</script>

<!-- Mounted up front: an aria-live region inserted with its message can be missed. -->
<span class="sr-only" role="status" aria-live="polite">
	{visible ? label : ''}
</span>

{#if visible}
	<!-- Above everything ( it reports on the whole window ) and click-through. -->
	<div
		data-slot="nav-progress"
		class={cn(
			'pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5',
			eased && 'transition-opacity duration-200 ease-out',
			closing && 'opacity-0',
			className
		)}
		style="--nav-progress: {value / 100}"
		aria-hidden="true"
	>
		<div data-slot="nav-progress-clip" class="absolute inset-0 overflow-hidden" style="transform: {offset}; {glide}">
			<div data-slot="nav-progress-bar" class="bg-primary absolute inset-0" style="transform: {cancel}; {glide}"></div>
		</div>
		<!-- Leading glow: a sibling of the clip so the blur can spill past the edge. -->
		<div data-slot="nav-progress-edge" class="pointer-events-none absolute inset-0" style="transform: {offset}; {glide}">
			<div class="bg-primary absolute end-0 top-0 h-full w-20 opacity-70 blur-[3px]"></div>
		</div>
	</div>
{/if}
