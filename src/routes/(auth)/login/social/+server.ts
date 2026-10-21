import { error, redirect } from '@sveltejs/kit'
import { isSocialProvider } from '$lib/social'
import { auth } from '$lib/server/auth'
import { safeRedirect } from '$lib/server/guards'
import { authHeaders } from '$lib/server/sign-in-guard'
import { enabledSocialProviders } from '$lib/server/social'
import type { RequestHandler } from './$types'

// A provider button ( a plain form, so it works without JavaScript ): off to the provider,
// back through /api/auth/callback/<provider>, then on to where the person was going. A
// refusal comes back to /login?social&error=<code>.
export const POST : RequestHandler = async( event ) => {
	const form = await event.request.formData()
	const provider = form.get( 'provider' )

	if ( !isSocialProvider( provider ) || !enabledSocialProviders().includes( provider ) )
		error( 404, 'Not found' )

	const { url } = await auth().api.signInSocial( {
		body   : { provider, callbackURL: safeRedirect( form.get( 'redirectTo' ) as string | null ), errorCallbackURL: '/login?social' },
		headers: authHeaders( event )
	} )

	if ( !url )
		error( 500, 'No authorization URL' )

	redirect( 303, url )
}
