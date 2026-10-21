import { getLocale } from '$lib/paraglide/runtime'

// Ported from billing-app's landing page. Both leave the server-rendered content as is
// when motion is reduced or JavaScript never runs.
const reducedMotion = () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches

// Fades and lifts an element in the first time it scrolls into view: use:reveal={{ delay: 120 }}
export function reveal( node : HTMLElement, { delay = 0 } : { delay ?: number } = {} ) {
	if ( reducedMotion() )
		return

	node.style.opacity = '0'
	node.style.transform = 'translateY(24px)'
	node.style.transition = `opacity 1s cubic-bezier(.16,1,.3,1) ${ delay }ms, transform 1s cubic-bezier(.16,1,.3,1) ${ delay }ms`

	const observer = new IntersectionObserver( ( entries ) => {
		if ( !entries.some( ( entry ) => entry.isIntersecting ) )
			return

		node.style.opacity = '1'
		node.style.transform = 'none'
		observer.disconnect()
	}, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' } )

	observer.observe( node )

	return { destroy: () => observer.disconnect() }
}

type CountUp = { to : number, decimals ?: number, suffix ?: string }

// Counts a number up from 0 when half of it is in view. Render the final value as the
// element's text; this replaces it while counting.
export function countUp( node : HTMLElement, { to, decimals = 0, suffix = '' } : CountUp ) {
	if ( reducedMotion() )
		return

	const format = new Intl.NumberFormat( getLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals } )
	const show = ( value : number ) => ( node.textContent = format.format( value ) + suffix )
	let frame = 0

	show( 0 )

	const observer = new IntersectionObserver( ( entries ) => {
		if ( !entries.some( ( entry ) => entry.isIntersecting ) )
			return

		observer.disconnect()

		const start = performance.now()
		const step = ( now : number ) => {
			const progress = Math.min( 1, ( now - start ) / 1500 )

			show( to * ( 1 - ( 1 - progress ) ** 3 ) )

			if ( progress < 1 )
				frame = requestAnimationFrame( step )
		}

		frame = requestAnimationFrame( step )
	}, { threshold: 0.5 } )

	observer.observe( node )

	return {
		destroy() {
			observer.disconnect()
			cancelAnimationFrame( frame )
		}
	}
}
