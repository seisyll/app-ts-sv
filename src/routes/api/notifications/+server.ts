import { json } from '@sveltejs/kit'
import { requireApiUser } from '$lib/server/guards'
import { listNotifications } from '$lib/server/notifications'
import type { RequestHandler } from './$types'

// GET — the caller's newest notifications and unread count ( ?limit=, at most 50 ).
export const GET : RequestHandler = async( event ) => {
	const { user } = await requireApiUser( event )

	return json( await listNotifications( user.id, Number( event.url.searchParams.get( 'limit' ) ) || 20 ) )
}
