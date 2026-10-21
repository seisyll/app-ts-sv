import { describe, expect, it } from 'vitest'
import { appearanceClasses, coupledRadius, DEFAULT_APPEARANCE, parseAppearance, resolveAppearance, serializeAppearance } from './appearance'

describe( 'resolveAppearance', () => {
	const setting = { palette: 'blue', style: 'nova', radius: 'large', allowUserOverride: true } as const

	it( 'takes each overridden knob from the person, the rest from the workspace', () => {
		expect( resolveAppearance( setting, { palette: 'rose', style: null, radius: null } ) ).toEqual( { palette: 'rose', style: 'nova', radius: 'large' } )
	} )

	it( 'ignores overrides while the workspace forbids them, without needing them deleted', () => {
		expect( resolveAppearance( { ...setting, allowUserOverride: false }, { palette: 'rose', style: 'mira', radius: 'none' } ) ).toEqual( { palette: 'blue', style: 'nova', radius: 'large' } )
	} )

	it( 'lets the style overrule the radius: Lyra and Sera are square, Rhea has no large', () => {
		expect( resolveAppearance( { ...setting, style: 'lyra' } ).radius ).toBe( 'none' )
		expect( resolveAppearance( { ...setting, style: 'sera' } ).radius ).toBe( 'none' )
		expect( resolveAppearance( { ...setting, style: 'rhea' } ).radius ).toBe( 'default' )
		expect( coupledRadius( 'rhea', 'small' ) ).toBe( 'small' )
	} )

	it( 'drops ids the catalog does not have, knob by knob', () => {
		expect( resolveAppearance( { palette: 'plaid', style: 'nova', radius: 'huge' }, { palette: null, style: 'comic', radius: null } ) )
			.toEqual( { palette: 'neutral', style: 'nova', radius: 'medium' } )
	} )
} )

describe( 'the cookie and the classes', () => {
	it( 'round-trips, and a tampered or missing cookie degrades to defaults', () => {
		const look = { palette: 'teal', style: 'maia', radius: 'small' } as const

		expect( parseAppearance( serializeAppearance( look ) ) ).toEqual( look )
		expect( parseAppearance( undefined ) ).toEqual( DEFAULT_APPEARANCE )
		expect( parseAppearance( '"><script>:vega:x' ) ).toEqual( { palette: 'neutral', style: 'vega', radius: 'medium' } )
	} )

	it( 'always names a style, so components are never unstyled', () => {
		expect( appearanceClasses( parseAppearance( 'junk' ) ) ).toBe( 'palette-neutral style-vega radius-medium' )
	} )
} )
