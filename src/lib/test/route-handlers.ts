import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/* ―― » Every handler in src/routes ( the playground's (dev) aside ), as text, for the
        tripwires that read the source rather than run it ( audit-coverage, permission-
        coverage ). A +server.ts gives its method handlers; a +page.server.ts its `load` and
        each action — the actions object's keys at its first indent. A handler's body runs to
        the next one, which is close enough to ask "does it call X". */
export type RouteHandler = { key : string, name : string, body : string }

const ROUTES = path.resolve( 'src/routes' )
const METHODS = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ]

const files = ( dir : string ) : string[] => readdirSync( dir, { withFileTypes: true } ).flatMap( ( entry ) => {
	const full = path.join( dir, entry.name )

	return entry.isDirectory() ? ( entry.name === '(dev)' ? [] : files( full ) ) : [ full ]
} )

function handlersIn( file : string, source : string ) : { name : string, body : string }[] {
	const exports = [ ...source.matchAll( /^export (?:const|async function|function) (\w+)/gm ) ]
	const section = ( index : number ) => source.slice( exports[ index ].index, exports[ index + 1 ]?.index )
	const indexOf = ( name : string ) => exports.findIndex( ( match ) => match[ 1 ] === name )

	if ( file.endsWith( '+server.ts' ) )
		return exports.map( ( match, index ) => ( { name: match[ 1 ], body: section( index ) } ) ).filter( ( handler ) => METHODS.includes( handler.name ) )

	const load = indexOf( 'load' )
	const actions = indexOf( 'actions' )
	const block = actions < 0 ? '' : section( actions )
	const starts = [ ...block.matchAll( /^\t(\w+)\s*:/gm ) ]

	return [
		...( load < 0 ? [] : [ { name: 'load', body: section( load ) } ] ),
		...starts.map( ( match, index ) => ( { name: match[ 1 ], body: block.slice( match.index, starts[ index + 1 ]?.index ) } ) )
	]
}

export const routeHandlers = () : RouteHandler[] => files( ROUTES )
	.filter( ( file ) => /\+(server|page\.server)\.ts$/.test( file ) )
	.flatMap( ( file ) => handlersIn( file, readFileSync( file, 'utf8' ) ).map( ( handler ) => ( {
		...handler,
		key: `${ path.relative( ROUTES, file ).replaceAll( '\\', '/' ) }#${ handler.name }`
	} ) ) )
