import { error, redirect } from '@sveltejs/kit'
import { message, setError, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { signupSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { auth, signUpEnabled } from '$lib/server/auth'
import { authErrorMessage, isAuthError } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { notify } from '$lib/server/notifications'
import type { Actions, PageServerLoad } from './$types'

// Off unless AUTH_SIGNUP=true: then this page doesn't exist.
function ensureOpen() : void {
	if ( !signUpEnabled() )
		error( 404, 'Not found' )
}

export const load : PageServerLoad = async( event ) => {
	ensureOpen()

	if ( await event.locals.session() )
		redirect( 303, '/app' )

	return { form: await superValidate( valibot( signupSchema ) ) }
}

export const actions : Actions = {
	default: ( event ) => {
		ensureOpen()

		return validateForm( event, signupSchema, async( form ) => {
			try {
				// Creates the account and signs in ( session cookie via sveltekitCookies ).
				const { user } = await auth().api.signUpEmail( { body: form.data, headers: event.request.headers } )

				await notify( { type: 'user.joined', params: { name: user.name, email: user.email }, to: { roles: [ 'admin' ], except: [ user.id ] } } )
			} catch ( caught ) {
				form.data.password = ''

				if ( isAuthError( caught, 'USER_ALREADY_EXISTS' ) || isAuthError( caught, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ) )
					return setError( form, 'email', m.auth_email_taken() )

				return message( form, authErrorMessage( caught ), { status: 400 } )
			}

			redirect( 303, '/app' )
		} )
	}
}
