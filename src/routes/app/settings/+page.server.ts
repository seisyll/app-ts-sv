import { signUpEnabled } from '$lib/server/auth'
import { requirePermission } from '$lib/server/guards'
import { tenancy } from '$lib/server/tenant'
import type { PageServerLoad } from './$types'

// Admin-only: a member gets a 404, as if the page didn't exist.
export const load : PageServerLoad = async( event ) => {
	await requirePermission( event, { settings: [ 'update' ] } )

	return { tenancy: tenancy(), signUp: signUpEnabled() }
}
