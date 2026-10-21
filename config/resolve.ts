import type { ClientConfig, Preset } from './define.ts'
import { MODULE_IDS, moduleDefinition, type ModuleId } from './modules.ts'

export type ResolvedClient = {
	name    : string
	modules : Record<ModuleId, boolean>
	theme   : string
}

export const DEFAULT_THEME = 'aurora'

/* ―― » A client config folded into what the build needs: its presets in order, then its own
        values; every module it never mentions is off. Pure — the caller reads the files and
        lists the themes. A mistake ( an unknown module, a missing requirement, a theme that
        isn't there ) throws, naming every problem at once, so a bad config can't build. */
export function resolveClient( name : string, config : ClientConfig, themes : readonly string[] ) : ResolvedClient {
	const layers : Preset[] = [ ...( config.extends ? [ config.extends ].flat() : [] ), config ]
	const modules = Object.fromEntries( MODULE_IDS.map( ( id ) => [ id, false ] ) ) as Record<ModuleId, boolean>
	const problems : string[] = []
	let theme = DEFAULT_THEME

	for ( const layer of layers ) {
		for ( const [ id, on ] of Object.entries( layer.modules ?? {} ) ) {
			if ( MODULE_IDS.includes( id as ModuleId ) )
				modules[ id as ModuleId ] = on === true
			else
				problems.push( `unknown module "${ id }"` )
		}

		theme = layer.theme ?? theme
	}

	for ( const id of MODULE_IDS ) {
		for ( const need of moduleDefinition( id ).requires ?? [] ) {
			if ( modules[ id ] && !modules[ need as ModuleId ] )
				problems.push( `${ id } needs ${ need }` )
		}
	}

	if ( modules.site && !themes.includes( theme ) )
		problems.push( `theme "${ theme }" is not a folder in src/lib/themes ( have: ${ themes.join( ', ' ) } )` )

	if ( problems.length )
		throw new Error( `config/clients/${ name }.ts: ${ problems.join( '; ' ) }. Modules: ${ MODULE_IDS.join( ', ' ) }.` )

	return { name, modules, theme }
}
