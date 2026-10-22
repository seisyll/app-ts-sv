import { fail } from '@sveltejs/kit'
import { requireUser } from '#lib/server/guards.js'
import { mailReady } from '#lib/server/mail/gate.js'
import { listPreferences, NOTIFICATION_TYPES, setPreferences } from '#lib/server/notifications/index.js'
import type { Actions, PageServerLoad } from './$types'

// Which notification types this person receives, in the app and by email.
export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )

	return { preferences: await listPreferences( user.id ), email: await mailReady() }
}

export const actions : Actions = {
	// Switches per catalog type ( <type>, <type>:email ); one left off isn't in the post.
	default: async( event ) => {
		const { user } = await requireUser( event )
		const form = await event.request.formData().catch( () => null )

		if ( !form )
			return fail( 400 )

		const email = await mailReady()

		await setPreferences( user.id, Object.fromEntries( NOTIFICATION_TYPES.map( ( type ) => [ type, { enabled: form.has( type ), email: email ? form.has( `${ type }:email` ) : undefined } ] ) ) )

		return { saved: true }
	}
}
