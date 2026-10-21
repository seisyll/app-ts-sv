import { error, redirect } from '@sveltejs/kit'
import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { signupSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { auth, signUpEnabled } from '$lib/server/auth'
import { audit } from '$lib/server/audit'
import { authErrorMessage, isAuthError } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { mailReady } from '$lib/server/mail/gate'
import { notify } from '$lib/server/notifications/gate'
import { authHeaders, captchaWidget } from '$lib/server/sign-in-guard'
import { enabledSocialProviders } from '$lib/server/social'
import type { Actions, PageServerLoad } from './$types'

// Off unless AUTH_SIGNUP=true. With the mail module a new account verifies its email, so the
// workspace's mail must be set up too. Otherwise this page doesn't exist.
async function ensureOpen() : Promise<void> {
	if ( !signUpEnabled() || ( MODULES.mail && !await mailReady() ) )
		error( 404, 'Not found' )
}

export const load : PageServerLoad = async( event ) => {
	await ensureOpen()

	if ( await event.locals.session() )
		redirect( 303, '/app' )

	// ?sent: signed up, now check your inbox.
	return { form: await superValidate( valibot( signupSchema ) ), sent: event.url.searchParams.has( 'sent' ), captcha: await captchaWidget(), social: enabledSocialProviders() }
}

export const actions : Actions = {
	default: async( event ) => {
		await ensureOpen()

		return validateForm( event, signupSchema, async( form ) => {
			try {
				// Creates the account and emails a verification link, which signs them in and
				// lands on /login ( → /app ). No session until then.
				const { captcha, ...body } = form.data
				const { user } = await auth().api.signUpEmail( { body: { ...body, callbackURL: '/login' }, headers: authHeaders( event, captcha ) } )

				await notify( { type: 'user.joined', params: { name: user.name, email: user.email }, to: { roles: [ 'admin' ], except: [ user.id ] } } )
				await audit( event, { action: 'user.signup', actor: { id: user.id, name: user.name }, target: { id: user.id, label: `${ user.name } <${ user.email }>` } } )
			} catch ( caught ) {
				form.data.password = ''
				form.data.captcha = ''

				if ( isAuthError( caught, 'USER_ALREADY_EXISTS' ) || isAuthError( caught, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ) )
					return setError( form, 'email', m.auth_email_taken() )

				return message( form, authErrorMessage( caught ), { status: 400 } )
			}

			// Verifying first ( mail module ): no session yet. Otherwise they're signed in.
			redirect( 303, MODULES.mail ? '/signup?sent' : '/app' )
		} )
	}
}
