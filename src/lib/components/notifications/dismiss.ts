import { cubicOut } from 'svelte/easing'
import type { TransitionConfig } from 'svelte/transition'

/* ―― » A handled row leaving the list ( the fundraiser app's ): its box collapses to nothing
        while it lifts and shrinks a hair, so the rows below close the gap in one move. With
        reduced motion, a short fade and nothing else. */
export function dismiss( node : Element, { duration = 260 } : { duration ?: number } = {} ) : TransitionConfig {
	if ( matchMedia( '(prefers-reduced-motion: reduce)' ).matches )
		return { duration: 120, css: ( t ) => `opacity: ${ t };` }

	const element = node as HTMLElement
	const style = getComputedStyle( element )
	const px = ( name : string ) => Number.parseFloat( style.getPropertyValue( name ) ) || 0
	const box = { height: element.offsetHeight, pt: px( 'padding-top' ), pb: px( 'padding-bottom' ), mt: px( 'margin-top' ), mb: px( 'margin-bottom' ), bt: px( 'border-top-width' ), bb: px( 'border-bottom-width' ) }

	return {
		duration,
		easing: cubicOut,
		css   : ( t, u ) => `overflow: hidden; transform-origin: top; opacity: ${ t }; transform: translateY(${ u * -10 }px) scale(${ 0.96 + t * 0.04 });`
			+ `height: ${ t * box.height }px; padding-top: ${ t * box.pt }px; padding-bottom: ${ t * box.pb }px; margin-top: ${ t * box.mt }px; margin-bottom: ${ t * box.mb }px;`
			+ `border-top-width: ${ t * box.bt }px; border-bottom-width: ${ t * box.bb }px;`
	}
}
