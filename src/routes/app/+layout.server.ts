import { SIDEBAR_COOKIE_NAME } from '#lib/components/ui/sidebar/constants.js'
import { DEFAULT_ROLE } from '#lib/permissions.js'
import { loadAppearance, rememberAppearance } from '#lib/server/appearance.js'
import { avatarUrl } from '#lib/server/avatars.js'
import { requireUser } from '#lib/server/guards.js'
import { activeModules } from '#lib/server/modules.js'
import { firstPage } from '#lib/server/notifications/gate.js'
import type { LayoutServerLoad } from './$types'

// hooks.server.ts already turned away signed-out requests; this just reads the user.
export const load : LayoutServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const [ tenant, modules ] = await Promise.all( [ event.locals.tenant(), activeModules() ] )
	const [ appearance, notifications ] = await Promise.all( [
		loadAppearance( user.id ),
		modules.includes( 'notifications' ) ? firstPage( user.id ) : null
	] )

	// The cookie is only a cache of this answer: heal it when it drifted ( another device,
	// an admin changed the default ). Read at render time, so this response is right too.
	rememberAppearance( event.cookies, appearance.resolved )

	return {
		// What this workspace has on ( #lib/modules ): the nav and shared pieces check it.
		modules,
		appearance,
		// The bell's first page, so the badge is right on the first paint. Null: no bell.
		notifications,
		user       : { name: user.name, email: user.email, image: avatarUrl( user ) ?? undefined, role: user.role ?? DEFAULT_ROLE },
		tenant     : { name: tenant.name },
		sidebarOpen: event.cookies.get( SIDEBAR_COOKIE_NAME ) !== 'false'
	}
}
