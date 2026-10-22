import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { passwordSchema } from '#lib/auth-schemas.js'
import { m } from '#lib/paraglide/messages.js'
import { audit } from '#lib/server/audit.js'
import { auth } from '#lib/server/auth.js'
import { authErrorMessage, isAuthError } from '#lib/server/auth-errors.js'
import { validateForm } from '#lib/server/forms.js'
import { requireUser } from '#lib/server/guards.js'
import { moduleActive } from '#lib/server/modules.js'
import { mySignIns } from '#lib/server/sign-ins.js'
import type { Actions, PageServerLoad } from './$types'

// The password form, and this person's latest sign-ins ( the sign-in log module ).
export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const signIns = MODULES.signins && await moduleActive( 'signins' ) ? await mySignIns( user.id ) : null

	return { form: await superValidate( valibot( passwordSchema ) ), signIns }
}

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
