import { error, redirect } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit/hooks'
import { moduleDefinition, routeIsUnder, routeOwner, withRequirements } from '#config/modules.js'
import { BUILT_MODULES, isBuilt, MODULE_IDS, type ModuleId } from '#lib/modules.js'
import { currentTenant } from '#lib/server/db/index.js'

/* ―― » Modules for the current workspace: what the build ships, minus what this tenant has
        switched off ( tenants.modules_off ), minus anything left without a module it
        requires. Read from the tenant ref, which tenant resolution caches — a change made
        with `bun run tenant:modules` lands within a minute. */
export async function activeModules() : Promise<ModuleId[]> {
	const { modulesOff = [] } = await currentTenant()
	const kept = withRequirements( BUILT_MODULES.filter( ( id ) => !modulesOff.includes( id ) ) )

	return MODULE_IDS.filter( ( id ) => kept.has( id ) )
}

export const moduleActive = async( id : ModuleId ) : Promise<boolean> => ( await activeModules() ).includes( id )

// A page or endpoint the module doesn't own but can't work without it.
export async function requireModule( id : ModuleId ) : Promise<void> {
	if ( !await moduleActive( id ) )
		error( 404, 'Not found' )
}

/* ―― » A module's routes for a workspace that switched it off: 404, or its `whenOff`. ( Off in
        the build, they are stubs already. ) The playground has no workspace, so it goes by
        the build alone, which the stubs cover. So does a request whose workspace can't be
        resolved — no database yet, a shared deployment's bare domain — where the public
        site must still render; /app's own loads need the tenant and fail there as before. */
export const handleModules : Handle = async( { event, resolve } ) => {
	const owner = routeOwner( event.route.id )

	if ( owner && !routeIsUnder( event.route.id!, '/(dev)' ) && !await moduleActive( owner ).catch( () => isBuilt( owner ) ) ) {
		const whenOff = moduleDefinition( owner ).whenOff

		if ( whenOff )
			redirect( 307, whenOff )

		error( 404, 'Not found' )
	}

	return resolve( event )
}
