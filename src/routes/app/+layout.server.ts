import { SIDEBAR_COOKIE_NAME } from '$lib/components/ui/sidebar/constants'
import { DEFAULT_ROLE } from '$lib/permissions'
import { requireUser } from '$lib/server/guards'
import type { LayoutServerLoad } from './$types'

// hooks.server.ts already turned away signed-out requests; this just reads the user.
export const load : LayoutServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const tenant = await event.locals.tenant()

	return {
		user       : { name: user.name, email: user.email, image: user.image ?? undefined, role: user.role ?? DEFAULT_ROLE },
		tenant     : { name: tenant.name },
		sidebarOpen: event.cookies.get( SIDEBAR_COOKIE_NAME ) !== 'false'
	}
}
