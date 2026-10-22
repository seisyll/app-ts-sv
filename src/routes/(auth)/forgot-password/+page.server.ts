import { error } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { forgotSchema } from '#lib/auth-schemas.js'
import { m } from '#lib/paraglide/messages.js'
import { auth } from '#lib/server/auth.js'
import { validateForm } from '#lib/server/forms.js'
import { authErrorMessage } from '#lib/server/auth-errors.js'
import { log } from '#lib/server/log.js'
import { mailReady } from '#lib/server/mail/index.js'
import { authHeaders, captchaWidget } from '#lib/server/sign-in-guard.js'
import type { Actions, PageServerLoad } from './$types'

// Only when the workspace can send the link; otherwise this page doesn't exist.
async function ensureMail() : Promise<void> {
	if ( !await mailReady() )
		error( 404, 'Not found' )
}

export const load : PageServerLoad = async() => {
	await ensureMail()

	return { form: await superValidate( valibot( forgotSchema ) ), captcha: await captchaWidget() }
}

export const actions : Actions = {
	default: async( event ) => {
		await ensureMail()

		return validateForm( event, forgotSchema, async( form ) => {
			try {
				await auth().api.requestPasswordReset( { body: { email: form.data.email }, headers: authHeaders( event, form.data.captcha ) } )
			} catch ( caught ) {
				form.data.captcha = ''

				// Refused by the sign-in guard ( the captcha, too many requests ): say so. Anything
				// else gets the same answer as success, whether or not the email has an account.
				if ( caught instanceof APIError && ( caught.statusCode === 403 || caught.statusCode === 429 ) )
					return message( form, authErrorMessage( caught ), { status: 400 } )

				log.error( { err: caught, scope: 'auth' }, 'reset request failed' )
			}

			return message( form, m.auth_forgot_sent() )
		} )
	}
}
