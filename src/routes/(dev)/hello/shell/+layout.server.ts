import { SIDEBAR_COOKIE_NAME } from '#lib/components/ui/sidebar/constants.js'
import type { LayoutServerLoad } from './$types'

// The sidebar writes its state to a cookie; reading it here keeps a collapsed sidebar
// collapsed across reloads instead of flashing open.
export const load : LayoutServerLoad = ( { cookies } ) => ( {
	sidebarOpen: cookies.get( SIDEBAR_COOKIE_NAME ) !== 'false'
} )
