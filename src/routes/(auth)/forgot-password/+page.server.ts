import { error } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { forgotSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { auth } from '$lib/server/auth'
import { validateForm } from '$lib/server/forms'
import { mailReady } from '$lib/server/mail'
import type { Actions, PageServerLoad } from './$types'

// Only when the workspace can send the link; otherwise this page doesn't exist.
async function ensureMail() : Promise<void> {
	if ( !await mailReady() )
		error( 404, 'Not found' )
}

export const load : PageServerLoad = async() => {
	await ensureMail()

	return { form: await superValidate( valibot( forgotSchema ) ) }
}

export const actions : Actions = {
	default: async( event ) => {
		await ensureMail()

		return validateForm( event, forgotSchema, async( form ) => {
			// The same answer whether or not the email has an account here.
			await auth().api.requestPasswordReset( { body: { email: form.data.email }, headers: event.request.headers } )
				.catch( ( caught ) => console.error( '[auth] reset request failed', caught ) )

			return message( form, m.auth_forgot_sent() )
		} )
	}
}
