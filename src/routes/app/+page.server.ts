import { monthFromKey } from '$lib/months'
import { hasPermission } from '$lib/permissions'
import { loadDashboard } from '$lib/server/dashboard'
import { requireUser } from '$lib/server/guards'
import { moduleActive } from '$lib/server/modules'
import type { PageServerLoad } from './$types'

// The dashboard, for the month in ?month=YYYY-MM ( default: this one ). People figures are for
// those who may open the users table they link to.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const month = monthFromKey( event.url.searchParams.get( 'month' ) )
	const people = MODULES.users && hasPermission( user.role, { user: [ 'list' ] } ) && await moduleActive( 'users' )

	return { dashboard: await loadDashboard( user.id, month, { people } ) }
}
