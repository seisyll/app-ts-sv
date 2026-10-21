import { error, fail, redirect } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { profileSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { isSocialProvider, SOCIAL_LABELS } from '$lib/social'
import { auth } from '$lib/server/auth'
import { authErrorMessage } from '$lib/server/auth-errors'
import { validateForm } from '$lib/server/forms'
import { requireUser } from '$lib/server/guards'
import { enabledSocialProviders } from '$lib/server/social'
import type { Actions, PageServerLoad } from './$types'

export const load : PageServerLoad = async( event ) => {
	const { user } = await requireUser( event )
	const providers = enabledSocialProviders()
	// Every way this person signs in: the password ( 'credential' ) and any providers.
	const methods = providers.length ? ( await auth().api.listUserAccounts( { headers: event.request.headers } ) ).map( ( account ) => account.providerId ) : []

	return {
		form         : await superValidate( { name: user.name }, valibot( profileSchema ) ),
		accounts     : providers.map( ( provider ) => ( { provider, connected: methods.includes( provider ) } ) ),
		canDisconnect: methods.length > 1,
		// Back from a provider that refused, or whose account is someone else's here.
		linkError    : event.url.searchParams.has( 'link-error' )
	}
}

// The provider a sign-in form names, if this deployment offers it.
async function providerOf( request : Request ) {
	const provider = ( await request.formData() ).get( 'provider' )

	if ( !isSocialProvider( provider ) || !enabledSocialProviders().includes( provider ) )
		error( 404, 'Not found' )

	return provider
}

export const actions : Actions = {
	profile: ( event ) => validateForm( event, profileSchema, async( form ) => {
		try {
			await auth().api.updateUser( { body: form.data, headers: event.request.headers } )
		} catch ( caught ) {
			return message( form, authErrorMessage( caught ), { status: 400 } )
		}

		return message( form, m.app_profile_saved() )
	} ),
	// Off to the provider; it comes back here with the account connected.
	link: async( event ) => {
		await requireUser( event )

		const provider = await providerOf( event.request )
		const { url } = await auth().api.linkSocialAccount( {
			body   : { provider, callbackURL: '/app/account', errorCallbackURL: '/app/account?link-error' },
			headers: event.request.headers
		} )

		redirect( 303, url )
	},
	// better-auth refuses to remove the last way to sign in ( and wants a recent sign-in ).
	unlink: async( event ) => {
		await requireUser( event )

		const provider = await providerOf( event.request )
		const headers = event.request.headers

		try {
			const account = ( await auth().api.listUserAccounts( { headers } ) ).find( ( row ) => row.providerId === provider )

			if ( account )
				await auth().api.unlinkAccount( { body: { accountId: account.id }, headers } )
		} catch ( caught ) {
			return fail( 400, { social: authErrorMessage( caught ) } )
		}

		return { social: m.social_unlinked( { provider: SOCIAL_LABELS[ provider ] } ) }
	}
}
