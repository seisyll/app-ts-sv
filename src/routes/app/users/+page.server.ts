import { parsePageQuery } from '$lib/components/data-table'
import { requirePermission } from '$lib/server/guards'
import { listUsers } from '$lib/server/users'
import type { PageServerLoad } from './$types'

// The first page comes with the server render; later pages from /api/users.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requirePermission( event, { user: [ 'list' ] } )

	return { users: await listUsers( parsePageQuery( new URLSearchParams() ) ), me: user.id }
}
