/* ―― » Vendored-UI sync ( from billing-app ) — `bun run sync:ui -- --source <checkout> [name …]`.

        `shadcn-svelte add` writes the RESOLVED flavour: one style's decisions baked into
        utility classes. Switching styles at runtime needs the AUTHORING flavour — bare
        `cn-*` markers on every component, the decisions living in one sheet per style.
        The CLI never serves that flavour, so it comes from the shadcn-svelte repo itself:
        <checkout> is a clone of https://github.com/huntabyte/shadcn-svelte ( a sparse
        checkout of docs/src/lib/registry is enough ).

        Updates every folder already in src/lib/components/ui; name more to add them. Writes
        the sheet of every style in STYLES ( src/lib/appearance.ts ). Deterministic, so a
        re-run against a newer checkout re-applies everything:
        - $lib/registry/ui/…    → #lib/components/ui/…
        - $lib/registry/hooks/… → #lib/hooks/…
        - any other $lib/…      → #lib/… ( SvelteKit 3's subpath import, package.json )
        - IconPlaceholder       → the per-icon @lucide/svelte import its `lucide` prop names
        - the deliberate divergences in PATCHES, applied by anchor
        It fails rather than writes when an icon has no lucide file, an IconPlaceholder or a
        $lib/registry import survives, or a patch anchor is gone. */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { STYLES } from '../src/lib/appearance'

const ROOT = join( import.meta.dir, '..' )
const flag = process.argv.indexOf( '--source' )
const SOURCE = flag > -1 ? process.argv[ flag + 1 ] : ''
const extra = process.argv.slice( 2 ).filter( ( arg, index, all ) => arg !== '--source' && all[ index - 1 ] !== '--source' )

if ( !SOURCE || !existsSync( join( SOURCE, 'docs', 'src', 'lib', 'registry', 'ui' ) ) )
	throw new Error( 'pass --source <a shadcn-svelte checkout containing docs/src/lib/registry>' )

const SRC_UI = join( SOURCE, 'docs', 'src', 'lib', 'registry', 'ui' )
const SRC_STYLES = join( SOURCE, 'docs', 'src', 'lib', 'registry', 'styles' )
const DEST_UI = join( ROOT, 'src', 'lib', 'components', 'ui' )
const DEST_STYLES = join( ROOT, 'src', 'lib', 'styles' )

// Folders under ui/ that are ours ( shadcn's table render helpers ), never synced.
const OURS = [ 'data-table' ]

// Upstream still names a few icons by lucide's OLD file names.
const ICON_RENAMES : Record<string, string> = { 'loader-2': 'loader-circle', 'more-horizontal': 'ellipsis' }

const kebabIcon = ( pascal : string ) => {
	const kebab = pascal.replace( /Icon$/, '' ).replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).replace( /([a-zA-Z])([0-9])/g, '$1-$2' ).toLowerCase()

	return ICON_RENAMES[ kebab ] ?? kebab
}

const ICON_IMPORT = /^([ \t]*)import IconPlaceholder from ["'][$#]lib\/components\/icon-placeholder\/icon-placeholder\.svelte["'];?\r?\n/m
const ICON_ELEMENT = /<IconPlaceholder\b([\s\S]*?)\/>/g
const LIBRARY_PROP = /^(lucide|tabler|hugeicons|phosphor|remixicon)$/

function transformIcons( body : string, file : string ) : string {
	if ( !body.includes( 'IconPlaceholder' ) )
		return body

	const used = new Set<string>()
	let out = body.replace( ICON_ELEMENT, ( _whole, attrs : string ) => {
		const lucide = /(?:^|\s)lucide="([A-Za-z0-9]+)"/.exec( attrs )

		if ( !lucide )
			throw new Error( `${ file }: IconPlaceholder without a lucide name` )

		used.add( lucide[ 1 ] )

		// Drop the icon-library props; everything else ( class, data-slot ) stays.
		const kept = attrs.replace( /(?:^|\s)+([a-zA-Z-]+)="[^"]*"/g, ( whole, name : string ) => ( LIBRARY_PROP.test( name ) ? '' : whole ) )

		return `<${ lucide[ 1 ] }${ kept.trimEnd() === '' ? ' ' : kept }/>`
	} )

	const imports = [ ...used ].sort().map( ( name ) => {
		const icon = kebabIcon( name )

		if ( !existsSync( join( ROOT, 'node_modules', '@lucide', 'svelte', 'dist', 'icons', `${ icon }.svelte` ) ) )
			throw new Error( `${ file }: no @lucide/svelte icon '${ icon }' for ${ name }` )

		return `import ${ name } from "@lucide/svelte/icons/${ icon }";`
	} )

	if ( !ICON_IMPORT.test( out ) )
		throw new Error( `${ file }: uses IconPlaceholder but its import was not found` )

	out = out.replace( ICON_IMPORT, ( _whole, indent : string ) => imports.map( ( line ) => `${ indent }${ line }\n` ).join( '' ) )

	if ( out.includes( 'IconPlaceholder' ) )
		throw new Error( `${ file }: an IconPlaceholder survived` )

	return out
}

/* ―― » Deliberate divergences from upstream, by anchor: a changed upstream FAILS here for a
        human decision instead of drifting. Tooltip.Root stays self-providing ( upstream
        moved the Provider out of Root; the app's tooltips are written for Root alone ).
        Dialogs taller than the screen scroll inside it instead of running off the edge. The
        sidebar's context key is the one the app was written with ( from the appearance port ). */
const DIALOG_SCROLL = 'max-h-[calc(100dvh-2rem)] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain outline-none'

const PATCHES : Record<string, [ string, string ][]> = {
	'tooltip/tooltip.svelte': [
		[ 'import { Tooltip as TooltipPrimitive } from "bits-ui";', 'import { Tooltip as TooltipPrimitive } from "bits-ui";\n\timport TooltipProvider from "./tooltip-provider.svelte";' ],
		[ '<TooltipPrimitive.Root bind:open {...restProps} />', '<TooltipProvider>\n\t<TooltipPrimitive.Root bind:open {...restProps} />\n</TooltipProvider>' ]
	],
	'dialog/dialog-content.svelte': [
		[ 'z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none', `z-50 ${ DIALOG_SCROLL }` ]
	],
	'alert-dialog/alert-dialog-content.svelte': [
		[ 'z-50 grid w-full -translate-x-1/2 -translate-y-1/2 outline-none', `z-50 grid ${ DIALOG_SCROLL }` ]
	],
	'sidebar/context.svelte.ts': [
		[ 'const SYMBOL_KEY = "scn-sidebar";', 'const SYMBOL_KEY = "sba-sidebar";' ]
	]
}

function transform( body : string, file : string ) : string {
	let out = body.replace( /[$#]lib\/registry\/ui\//g, '#lib/components/ui/' ).replace( /[$#]lib\/registry\/hooks\//g, '#lib/hooks/' )

	for ( const [ anchor, replacement ] of PATCHES[ file ] ?? [] ) {
		if ( !out.includes( anchor ) )
			throw new Error( `${ file }: patch anchor not found — upstream changed under a deliberate divergence, re-decide it:\n${ anchor }` )

		out = out.replace( anchor, replacement )
	}

	out = transformIcons( out, file )

	if ( /[$#]lib\/registry\//.test( out ) )
		throw new Error( `${ file }: an unmapped $lib/registry import survived` )

	return out.replace( /\$lib\//g, '#lib/' ).replace( /\r\n/g, '\n' )
}

const upstream = readdirSync( SRC_UI, { withFileTypes: true } ).filter( ( entry ) => entry.isDirectory() ).map( ( entry ) => entry.name )
const ours = readdirSync( DEST_UI, { withFileTypes: true } ).filter( ( entry ) => entry.isDirectory() && !OURS.includes( entry.name ) ).map( ( entry ) => entry.name )
const folders = [ ...new Set( [ ...ours, ...extra ] ) ]

for ( const folder of folders ) {
	if ( !upstream.includes( folder ) )
		throw new Error( `upstream has no '${ folder }' component` )
}

const markers = ( text : string ) => text.match( /cn-[a-z0-9-]+/g ) ?? []
const used = new Set<string>()
let files = 0

for ( const folder of folders ) {
	const dest = join( DEST_UI, folder )

	rmSync( dest, { recursive: true, force: true } )
	mkdirSync( dest, { recursive: true } )

	for ( const entry of readdirSync( join( SRC_UI, folder ) ) ) {
		const out = transform( readFileSync( join( SRC_UI, folder, entry ), 'utf8' ), `${ folder }/${ entry }` )

		markers( out ).forEach( ( marker ) => used.add( marker ) )
		writeFileSync( join( dest, entry ), out )
		files++
	}
}

const styled = new Set<string>()

for ( const style of STYLES ) {
	const out = transform( readFileSync( join( SRC_STYLES, `style-${ style }.css` ), 'utf8' ), `style-${ style }.css` )

	markers( out ).forEach( ( marker ) => styled.add( marker ) )
	writeFileSync( join( DEST_STYLES, `style-${ style }.css` ), out )
}

// Reported, not fatal: upstream leaves some markers unstyled on purpose ( JS hooks like
// cn-menu-target, seams like cn-font-heading ). Listed so a new one is seen, not silent;
// src/lib/styles/styles.test.ts holds the accepted list.
const structural = [ ...used ].filter( ( marker ) => !styled.has( marker ) ).sort()

console.log( `✓ ${ folders.length } components, ${ files } files; styles: ${ STYLES.join( ', ' ) }` )
console.log( `✓ ${ used.size } markers, ${ structural.length } unstyled: ${ structural.join( ', ' ) }` )
