import { redirect } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { loginSchema } from '$lib/auth-schemas'
import { auth, signUpEnabled } from '$lib/server/auth'
import { authErrorMessage } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { safeRedirect } from '$lib/server/guards'
import { mailReady } from '$lib/server/mail/gate'
import type { Actions, PageServerLoad } from './$types'

export const load : PageServerLoad = async( event ) => {
	if ( await event.locals.session() )
		redirect( 303, safeRedirect( event.url.searchParams.get( 'redirectTo' ) ) )

	const mail = await mailReady()

	return {
		form     : await superValidate( valibot( loginSchema ) ),
		// With the mail module, sign-up sends a verification email, so it needs mail too.
		signUp   : signUpEnabled() && ( !MODULES.mail || mail ),
		forgot   : mail,
		// Back from a verification link that had expired ( better-auth adds ?error= ).
		linkError: event.url.searchParams.has( 'error' )
	}
}

export const actions : Actions = {
	default: ( event ) => validateForm( event, loginSchema, async( form ) => {
		try {
			// Sets the session cookie on this response ( sveltekitCookies plugin ).
			await auth().api.signInEmail( { body: form.data, headers: event.request.headers } )
		} catch ( caught ) {
			// Never send the password back to the browser.
			form.data.password = ''

			return message( form, authErrorMessage( caught ), { status: 400 } )
		}

		redirect( 303, safeRedirect( event.url.searchParams.get( 'redirectTo' ) ) )
	} )
}
