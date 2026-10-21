import { fail } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { listPreferences, NOTIFICATION_TYPES, setPreferences } from '$lib/server/notifications'
import type { Actions, PageServerLoad } from './$types'

// Which notification types this person receives. Off is stored; on is the default.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )

	return { preferences: await listPreferences( user.id ) }
}

export const actions : Actions = {
	// One switch per catalog type; a switch left off isn't in the post.
	default: async( event ) => {
		const { user } = await requireUser( event )
		const form = await event.request.formData().catch( () => null )

		if ( !form )
			return fail( 400 )

		await setPreferences( user.id, Object.fromEntries( NOTIFICATION_TYPES.map( ( type ) => [ type, form.has( type ) ] ) ) )

		return { saved: true }
	}
}
