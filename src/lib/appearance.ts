import * as v from 'valibot'
import { m } from '$lib/paraglide/messages'

/* ―― » Appearance: three knobs over CLOSED catalogs ( from billing-app, ADR 0010 ).
          palette — a frozen set of colour tokens, light and dark ( src/lib/styles/palettes.css )
          style   — a component grammar: one vendored sheet per style ( src/lib/styles/style-*.css )
          radius  — the one shape token, --radius
        The answer rides <html> as `theme-<palette> style-<style> radius-<radius>`, beside
        mode-watcher's `.dark`. A workspace sets the default; each person may override any
        knob while the workspace allows it. Not a colour picker: every combination offered is
        one that was looked at in both modes. DESIGN.md has the rules for adding to these. */

// Recipes from shadcn-svelte's registry colours ( base ← accent ); `swatch` is the picker's
// dot — data describing the palette, the one place a raw colour is allowed.
export const PALETTES = [
	{ id: 'neutral', swatch: '#737373', base: 'neutral', accent: 'neutral' },
	{ id: 'stone', swatch: '#78716c', base: 'stone', accent: 'stone' },
	{ id: 'blue', swatch: '#2b7fff', base: 'neutral', accent: 'blue' },
	{ id: 'teal', swatch: '#00bba7', base: 'neutral', accent: 'teal' },
	{ id: 'emerald', swatch: '#00bc7d', base: 'neutral', accent: 'emerald' },
	{ id: 'violet', swatch: '#8e51ff', base: 'neutral', accent: 'violet' },
	{ id: 'rose', swatch: '#ff2056', base: 'neutral', accent: 'rose' },
	{ id: 'amber', swatch: '#fd9a00', base: 'stone', accent: 'amber' }
] as const

// shadcn-svelte's eight styles. Each needs its sheet imported in app.css.
export const STYLES = [ 'vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea' ] as const

// shadcn's five radii; `medium` is the template's original 0.625rem.
export const RADII = [
	{ id: 'none', value: '0rem' },
	{ id: 'small', value: '0.45rem' },
	{ id: 'default', value: '0.5rem' },
	{ id: 'medium', value: '0.625rem' },
	{ id: 'large', value: '0.875rem' }
] as const

export type PaletteId = typeof PALETTES[number]['id']
export type StyleId = typeof STYLES[number]
export type RadiusId = typeof RADII[number]['id']

export type Appearance = { palette : PaletteId, style : StyleId, radius : RadiusId }
// A workspace's default, and whether people may override it.
export type AppearanceSetting = Appearance & { allowUserOverride : boolean }
// One person's choices; null follows the workspace for that knob alone.
export type AppearanceOverride = { [ K in keyof Appearance ] : Appearance[ K ] | null }
// What the app layout hands the picker.
export type AppearanceState = { setting : AppearanceSetting, override : AppearanceOverride, resolved : Appearance }

export const DEFAULT_APPEARANCE : Appearance = { palette: 'neutral', style: 'vega', radius: 'medium' }
export const DEFAULT_SETTING : AppearanceSetting = { ...DEFAULT_APPEARANCE, allowUserOverride: true }
export const NO_OVERRIDE : AppearanceOverride = { palette: null, style: null, radius: null }

const PALETTE_IDS = PALETTES.map( ( palette ) => palette.id )
const RADIUS_IDS = RADII.map( ( radius ) => radius.id )

export const isPalette = ( value : unknown ) : value is PaletteId => PALETTE_IDS.includes( value as PaletteId )
export const isStyle = ( value : unknown ) : value is StyleId => STYLES.includes( value as StyleId )
export const isRadius = ( value : unknown ) : value is RadiusId => RADIUS_IDS.includes( value as RadiusId )

// Upstream's own coupling: Lyra and Sera are drawn with square corners, Rhea's compact
// geometry has no `large`. Resolution applies it; the STORED choice is kept, so switching
// back to another style brings the chosen radius back.
export function coupledRadius( style : StyleId, radius : RadiusId ) : RadiusId {
	if ( style === 'lyra' || style === 'sera' )
		return 'none'

	return style === 'rhea' && radius === 'large' ? 'default' : radius
}

/* ―― » THE resolution, on both sides so there is one answer. Per knob: the person's
        override while the workspace allows overrides, else the workspace's, else the
        default. Turning overrides off IGNORES stored overrides rather than deleting them.
        An unknown id ( a catalog row removed later ) degrades to the default, never errors. */
// Raw input: stored rows and cookies hold plain strings until resolution checks them.
type Unchecked = { palette ?: unknown, style ?: unknown, radius ?: unknown }

export function resolveAppearance( setting : Unchecked & { allowUserOverride ?: boolean }, override : Unchecked = NO_OVERRIDE ) : Appearance {
	const own = setting.allowUserOverride ?? true
	const pick = <T>( is : ( value : unknown ) => value is T, mine : unknown, theirs : unknown, fallback : T ) : T =>
		( own && is( mine ) ? mine : is( theirs ) ? theirs : fallback )
	const style = pick( isStyle, override.style, setting.style, DEFAULT_APPEARANCE.style )

	return {
		palette: pick( isPalette, override.palette, setting.palette, DEFAULT_APPEARANCE.palette ),
		style,
		radius : coupledRadius( style, pick( isRadius, override.radius, setting.radius, DEFAULT_APPEARANCE.radius ) )
	}
}

// The <html> classes. The style class is ALWAYS there: without a sheet scope the
// components are unstyled.
export const appearanceClasses = ( { palette, style, radius } : Appearance ) => `palette-${ palette } style-${ style } radius-${ radius }`

/* ―― » In the browser. <html> is server-rendered once and client navigation never re-renders
        it, so a change is painted by hand, the way mode-watcher paints `.dark`. Leaves early
        when nothing changed: rewriting <html>'s classes restyles the whole document, and
        this runs on every navigation of the app layout. */
export function paintAppearance( resolved : Appearance ) : void {
	const html = document.documentElement
	const wanted = appearanceClasses( resolved ).split( ' ' )
	const current = [ ...html.classList ].filter( ( name ) => /^(palette|style|radius)-/.test( name ) )

	if ( current.length === wanted.length && wanted.every( ( name ) => current.includes( name ) ) )
		return

	html.classList.remove( ...current )
	html.classList.add( ...wanted )
}

// The SSR cookie's value, `palette:style:radius`. Parsing validates each part against its
// catalog, so a tampered or stale cookie degrades to defaults and never reaches markup.
export const serializeAppearance = ( { palette, style, radius } : Appearance ) => `${ palette }:${ style }:${ radius }`

export function parseAppearance( value : string | undefined ) : Appearance {
	const [ palette, style, radius ] = ( value ?? '' ).split( ':' )

	return resolveAppearance( { palette, style, radius } )
}

export const appearanceSettingSchema = v.object( {
	palette          : v.picklist( PALETTE_IDS ),
	style            : v.picklist( STYLES ),
	radius           : v.picklist( RADIUS_IDS ),
	allowUserOverride: v.boolean()
} )

export const appearanceOverrideSchema = v.object( {
	palette: v.nullable( v.picklist( PALETTE_IDS ) ),
	style  : v.nullable( v.picklist( STYLES ) ),
	radius : v.nullable( v.picklist( RADIUS_IDS ) )
} )

// Labels. Style names are proper nouns and stay untranslated.
export const paletteLabel = ( id : PaletteId ) : string => ( {
	neutral: m.appearance_palette_neutral(),
	stone  : m.appearance_palette_stone(),
	blue   : m.appearance_palette_blue(),
	teal   : m.appearance_palette_teal(),
	emerald: m.appearance_palette_emerald(),
	violet : m.appearance_palette_violet(),
	rose   : m.appearance_palette_rose(),
	amber  : m.appearance_palette_amber()
} )[ id ]

export const styleLabel = ( id : StyleId ) : string => id[ 0 ].toUpperCase() + id.slice( 1 )

export const styleDescription = ( id : StyleId ) : string => ( {
	vega: m.appearance_style_vega(),
	nova: m.appearance_style_nova(),
	maia: m.appearance_style_maia(),
	lyra: m.appearance_style_lyra(),
	mira: m.appearance_style_mira(),
	luma: m.appearance_style_luma(),
	sera: m.appearance_style_sera(),
	rhea: m.appearance_style_rhea()
} )[ id ]

export const radiusLabel = ( id : RadiusId ) : string => ( {
	none     : m.appearance_radius_none(),
	small    : m.appearance_radius_small(),
	'default': m.appearance_radius_default(),
	medium   : m.appearance_radius_medium(),
	large    : m.appearance_radius_large()
} )[ id ]
