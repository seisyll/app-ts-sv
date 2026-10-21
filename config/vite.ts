import { readdirSync } from 'node:fs'
import path from 'node:path'
import { runnerImport, type Plugin } from 'vite'
import type { ClientConfig } from './define.ts'
import { MODULE_IDS, moduleDefinition, routeIsUnder, type ModuleId } from './modules.ts'
import { resolveClient, type ResolvedClient } from './resolve.ts'

const THEMES_DIR = 'src/lib/themes'
const CLIENTS_DIR = 'config/clients'

const folders = ( dir : string ) => readdirSync( dir, { withFileTypes: true } ).filter( ( entry ) => entry.isDirectory() ).map( ( entry ) => entry.name )

// The client this build is for: CLIENT, else config/clients/default.ts.
export async function loadClient( name = process.env.CLIENT || 'default' ) : Promise<ResolvedClient> {
	const clients = readdirSync( CLIENTS_DIR ).filter( ( file ) => file.endsWith( '.ts' ) ).map( ( file ) => file.slice( 0, -3 ) )

	if ( !clients.includes( name ) )
		throw new Error( `CLIENT=${ name }: there is no ${ CLIENTS_DIR }/${ name }.ts ( have: ${ clients.join( ', ' ) } ).` )

	// Through Vite's module runner: a client file is TypeScript importing other TypeScript.
	const { module } = await runnerImport<{ default : ClientConfig }>( path.resolve( CLIENTS_DIR, `${ name }.ts` ) )

	return resolveClient( name, module.default, folders( THEMES_DIR ) )
}

const HTTP_METHODS = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD' ]

/* ―― » What replaces a file under a route that isn't in this build. Pages and endpoints
        answer 404 ( or send people to `whenOff` ); components render nothing; anything else
        exports nothing — so none of the real code, nor what it imports, is bundled. */
export function routeStub( file : string, whenOff ?: string ) : string {
	const answer = whenOff
		? `import { redirect } from '@sveltejs/kit'; const off = () => redirect( 307, ${ JSON.stringify( whenOff ) } )`
		: 'import { error } from \'@sveltejs/kit\'; const off = () => error( 404 )'

	if ( file.endsWith( '.svelte' ) )
		return ''

	if ( /\/\+server\.[jt]s$/.test( file ) )
		return `${ answer }\n${ HTTP_METHODS.map( ( method ) => `export const ${ method } = off` ).join( '\n' ) }\n`

	if ( /\/\+(page|layout)(\.server)?\.[jt]s$/.test( file ) )
		return `${ answer }\nexport const load = off\n`

	return 'export {}'
}

/* ―― » The module gate ( the fundraiser app's extension plugin, generalised ):
          - `MODULES.<id>` becomes `true` / `false` in the source, so `if ( MODULES.media )`
            drops the disabled branch and the imports only it used ( src/modules.d.ts );
          - `__BUILT_MODULES__` is the whole map, for runtime lookups ( $lib/modules ), and
            `__CLIENT__` the client's name;
          - files under a module's routes are stubbed when the module is off — in dev too,
            so CLIENT=x in dev is exactly x's build — and the playground ( src/routes/(dev) )
            is stubbed in every production build. */
export function modules( client : ResolvedClient ) : Plugin {
	const root = path.resolve( 'src/routes' ).replaceAll( '\\', '/' )
	const off = MODULE_IDS.filter( ( id ) => !client.modules[ id ] )
	let building = false

	return {
		name   : 'modules',
		enforce: 'pre',
		config : () => ( {
			define: {
				__BUILT_MODULES__: JSON.stringify( client.modules ),
				__CLIENT__       : JSON.stringify( client.name ),
				...Object.fromEntries( MODULE_IDS.map( ( id ) => [ `MODULES.${ id }`, JSON.stringify( client.modules[ id ] ) ] ) )
			}
		} ),
		configResolved( config ) {
			building = config.command === 'build'

			if ( !config.isProduction || building )
				config.logger.info( `client ${ client.name }: ${ MODULE_IDS.filter( ( id ) => client.modules[ id ] ).join( ', ' ) || 'no modules' }` )
		},
		load( id ) {
			const file = id.split( '?' )[ 0 ].replaceAll( '\\', '/' )

			if ( !file.startsWith( `${ root }/` ) )
				return

			const routeId = file.slice( root.length, file.lastIndexOf( '/' ) ) || '/'

			if ( building && routeIsUnder( routeId, '/(dev)' ) )
				return routeStub( file )

			const owner = off.find( ( module : ModuleId ) => moduleDefinition( module ).routes.some( ( owned ) => routeIsUnder( routeId, owned ) ) )

			if ( owner )
				return routeStub( file, moduleDefinition( owner ).whenOff )
		}
	}
}
