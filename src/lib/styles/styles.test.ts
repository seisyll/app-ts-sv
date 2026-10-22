import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETTES, RADII, STYLES } from '#lib/appearance.js'

// The catalog in src/lib/appearance.ts against the CSS that serves it: a row without its
// CSS would paint nothing, CSS without a row would ship unused.
const read = ( path : string ) => readFileSync( join( 'src', path ), 'utf8' )
const sheets = readdirSync( 'src/lib/styles' ).filter( ( file ) => /^style-.+\.css$/.test( file ) )

describe( 'styles', () => {
	it( 'every catalog style has its sheet, imported in app.css, and nothing else is', () => {
		const imported = [ ...read( 'app.css' ).matchAll( /@import '\.\/lib\/styles\/style-([a-z]+)\.css' layer\(base\)/g ) ].map( ( match ) => match[ 1 ] )

		expect( imported ).toEqual( [ ...STYLES ] )
		expect( sheets.map( ( file ) => file.slice( 6, -4 ) ).sort() ).toEqual( [ ...STYLES ].sort() )
	} )

	it( 'each sheet is scoped to its own style class', () => {
		for ( const style of STYLES )
			expect( read( `lib/styles/style-${ style }.css` ).startsWith( `.style-${ style } {` ), style ).toBe( true )
	} )

	it( 'every marker a component uses is styled by a sheet, or is one upstream leaves unstyled', () => {
		// Hooks and seams upstream deliberately leaves bare ( see scripts/sync-ui.ts ).
		const structural = new Set( [
			'cn-alert-dialog-action', 'cn-alert-dialog-cancel', 'cn-avatar-group', 'cn-breadcrumb', 'cn-card-action',
			'cn-command-item-indicator', 'cn-field-orientation-horizontal', 'cn-field-orientation-responsive',
			'cn-field-orientation-vertical', 'cn-font-heading', 'cn-menu-target', 'cn-scroll-area-viewport',
			'cn-select-item-indicator-icon', 'cn-sidebar-trigger',
			'cn-accordion-trigger-icon', 'cn-context-menu-trigger', 'cn-input-otp-caret', 'cn-input-otp-input',
			'cn-native-select-wrapper', 'cn-navigation-menu-item', 'cn-pagination', 'cn-pagination-link',
			'cn-pagination-next-text', 'cn-pagination-previous-text', 'cn-rtl-flip', 'cn-tabs-list-variant-default',
			'cn-tabs-list-variant-line'
		] )
		const styled = new Set( sheets.flatMap( ( file ) => read( `lib/styles/${ file }` ).match( /cn-[a-z0-9-]+/g ) ?? [] ) )
		const used = new Set<string>()

		for ( const folder of readdirSync( 'src/lib/components/ui' ) ) {
			for ( const file of readdirSync( join( 'src/lib/components/ui', folder ) ) )
				( read( `lib/components/ui/${ folder }/${ file }` ).match( /cn-[a-z0-9-]+/g ) ?? [] ).forEach( ( marker ) => used.add( marker ) )
		}

		expect( [ ...used ].filter( ( marker ) => !styled.has( marker ) && !structural.has( marker ) ) ).toEqual( [] )
	} )
} )

describe( 'palettes', () => {
	const css = read( 'lib/styles/palettes.css' )
	const variables = ( selector : string ) => {
		const body = css.match( new RegExp( `^${ selector.replaceAll( '.', '\\.' ) } \\{([^}]*)\\}`, 'm' ) )?.[ 1 ]

		return body?.match( /--[a-z0-9-]+/g )?.sort()
	}

	it( 'every palette has a light and a dark block defining the same variables', () => {
		for ( const { id } of PALETTES ) {
			const light = variables( `html.palette-${ id }` )

			expect( light, id ).toBeDefined()
			expect( variables( `html.dark.palette-${ id }` ), id ).toEqual( light )
			expect( light, id ).not.toContain( '--radius' )
		}
	} )

	it( 'every radius sets --radius to its catalog value', () => {
		for ( const { id, value } of RADII )
			expect( css ).toContain( `html.radius-${ id } {\n\t--radius: ${ value };\n}` )
	} )
} )
