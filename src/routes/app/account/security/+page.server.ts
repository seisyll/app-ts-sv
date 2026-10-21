import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { passwordSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { audit } from '$lib/server/audit'
import { auth } from '$lib/server/auth'
import { authErrorMessage, isAuthError } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import type { Actions, PageServerLoad } from './$types'

export const load : PageServerLoad = async() => ( { form: await superValidate( valibot( passwordSchema ) ) } )

export const actions : Actions = {
	default: ( event ) => validateForm( event, passwordSchema, async( form ) => {
		const { currentPassword, newPassword, revokeOtherSessions } = form.data

		// Passwords never travel back to the browser, whatever happens.
		form.data = { ...form.data, currentPassword: '', newPassword: '', confirmPassword: '' }

		try {
			await auth().api.changePassword( { body: { currentPassword, newPassword, revokeOtherSessions }, headers: event.request.headers } )
		} catch ( caught ) {
			if ( isAuthError( caught, 'INVALID_PASSWORD' ) )
				return setError( form, 'currentPassword', m.auth_wrong_password() )

			return message( form, authErrorMessage( caught ), { status: 400 } )
		}

		await audit( event, { action: 'account.password' } )

		return message( form, m.app_password_changed() )
	} )
}
