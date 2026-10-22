import { fail, redirect } from '@sveltejs/kit'
import { superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { loginSchema } from '#lib/auth-schemas.js'
import { auth, signUpEnabled } from '#lib/server/auth.js'
import { authErrorMessage } from '#lib/server/auth-errors.js'
import { validateForm } from '#lib/server/forms.js'
import { safeRedirect } from '#lib/server/guards.js'
import { mailReady } from '#lib/server/mail/gate.js'
import { authHeaders, signInCaptcha } from '#lib/server/sign-in-guard.js'
import { enabledSocialProviders } from '#lib/server/social.js'
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
		// Back from a verification link that had expired ( better-auth adds ?error= ) — or from a
		// provider that refused ( ?social&error= ).
		linkError  : event.url.searchParams.has( 'error' ) && !event.url.searchParams.has( 'social' ),
		socialError: event.url.searchParams.has( 'social' ) && event.url.searchParams.has( 'error' ),
		social     : enabledSocialProviders(),
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
