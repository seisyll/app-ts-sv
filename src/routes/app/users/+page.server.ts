import { fromUrlParams, toPageQuery } from '$lib/components/data-table'
import { requirePermission } from '$lib/server/guards'
import { mailReady } from '$lib/server/mail/gate'
import { listUsers } from '$lib/server/users'
import type { PageServerLoad } from './$types'

// The first page comes with the server render — the one the address asks for ( the table
// syncs its query to the URL ); later pages from /api/users.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { user: [ 'list' ] } )

	return { users: await listUsers( toPageQuery( fromUrlParams( event.url.searchParams ) ) ), me: user.id, canInvite: await mailReady() }
}
