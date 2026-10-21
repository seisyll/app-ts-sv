import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { profileSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { auth } from '$lib/server/auth'
import { authErrorMessage } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { requireUser } from '$lib/server/guards'
import type { Actions, PageServerLoad } from './$types'

export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )

	return { form: await superValidate( { name: user.name }, valibot( profileSchema ) ) }
}

export const actions : Actions = {
	default: ( event ) => validateForm( event, profileSchema, async( form ) => {
		try {
			await auth().api.updateUser( { body: form.data, headers: event.request.headers } )
		} catch ( caught ) {
			return message( form, authErrorMessage( caught ), { status: 400 } )
		}

		return message( form, m.app_profile_saved() )
	} )
}
