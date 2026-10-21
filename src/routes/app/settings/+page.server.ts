import { signUpEnabled } from '$lib/server/auth'
import { CLIENT, isBuilt, MODULE_IDS } from '$lib/modules'
import { requirePermission } from '$lib/server/guards'
import { activeModules } from '$lib/server/modules'
import { tenancy } from '$lib/server/tenant'
import type { PageServerLoad } from './$types'

// Admin-only: a member gets a 404, as if the page didn't exist.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { settings: [ 'update' ] } )

	const active = await activeModules()

	return {
		tenancy: tenancy(),
		signUp : signUpEnabled(),
		client : CLIENT,
		// on: active here; off: built, but off for this workspace ( or a module it needs is );
		// absent: not in this build.
		modules: MODULE_IDS.map( ( id ) => ( { id, state: active.includes( id ) ? 'on' : isBuilt( id ) ? 'off' : 'absent' } as const ) )
	}
}
