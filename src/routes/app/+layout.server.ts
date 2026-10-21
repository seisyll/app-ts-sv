import { SIDEBAR_COOKIE_NAME } from '$lib/components/ui/sidebar/constants'
import { DEFAULT_ROLE } from '$lib/permissions'
import { loadAppearance, rememberAppearance } from '$lib/server/appearance'
import { requireUser } from '$lib/server/guards'
import type { LayoutServerLoad } from './$types'

// hooks.server.ts already turned away signed-out requests; this just reads the user.
export const load : LayoutServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const [ tenant, appearance ] = await Promise.all( [ event.locals.tenant(), loadAppearance( user.id ) ] )

	// The cookie is only a cache of this answer: heal it when it drifted ( another device,
	// an admin changed the default ). Read at render time, so this response is right too.
	rememberAppearance( event.cookies, appearance.resolved )

	return {
		appearance,
		user       : { name: user.name, email: user.email, image: user.image ?? undefined, role: user.role ?? DEFAULT_ROLE },
		tenant     : { name: tenant.name },
		sidebarOpen: event.cookies.get( SIDEBAR_COOKIE_NAME ) !== 'false'
	}
}
