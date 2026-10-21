import { SIDEBAR_COOKIE_NAME } from '$lib/components/ui/sidebar/constants'
import { DEFAULT_ROLE } from '$lib/permissions'
import { loadAppearance, rememberAppearance } from '$lib/server/appearance'
import { requireUser } from '$lib/server/guards'
import { listNotifications } from '$lib/server/notifications'
import type { LayoutServerLoad } from './$types'

// hooks.server.ts already turned away signed-out requests; this just reads the user.
export const load : LayoutServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const [ tenant, appearance, notifications ] = await Promise.all( [ event.locals.tenant(), loadAppearance( user.id ), listNotifications( user.id ) ] )

	// The cookie is only a cache of this answer: heal it when it drifted ( another device,
	// an admin changed the default ). Read at render time, so this response is right too.
	rememberAppearance( event.cookies, appearance.resolved )

	return {
		appearance,
		// The bell's first page, so the badge is right on the first paint.
		notifications,
		user       : { name: user.name, email: user.email, image: user.image ?? undefined, role: user.role ?? DEFAULT_ROLE },
		tenant     : { name: tenant.name },
		sidebarOpen: event.cookies.get( SIDEBAR_COOKIE_NAME ) !== 'false'
	}
}
