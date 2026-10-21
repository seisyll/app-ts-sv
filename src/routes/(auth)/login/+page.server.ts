import { fail, redirect } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { loginSchema } from '$lib/auth-schemas'
import { auth, signUpEnabled } from '$lib/server/auth'
import { authErrorMessage } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { safeRedirect } from '$lib/server/guards'
import { mailReady } from '$lib/server/mail/gate'
import { authHeaders, signInCaptcha } from '$lib/server/sign-in-guard'
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
		linkError: event.url.searchParams.has( 'error' ),
		// Shown from the start in always-mode, or when this address already failed often.
		captcha  : await signInCaptcha( event )
	}
}

export const actions : Actions = {
	default: ( event ) => validateForm( event, loginSchema, async( form ) => {
		const { email, password, captcha } = form.data

		try {
			// Sets the session cookie on this response ( sveltekitCookies plugin ).
			await auth().api.signInEmail( { body: { email, password }, headers: authHeaders( event, captcha ) } )
		} catch ( caught ) {
			// Never send the password back to the browser; a captcha answer counts once.
			form.data.password = ''
			form.data.captcha = ''
			form.message = authErrorMessage( caught )

			// After a failure the next attempt may need the captcha ( sign-in guard ).
			return fail( 400, { form, captcha: await signInCaptcha( event, email ) } )
		}

		redirect( 303, safeRedirect( event.url.searchParams.get( 'redirectTo' ) ) )
	} )
}
