import { error, fail, redirect } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { profileSchema } from '#lib/auth-schemas.js'
import { m } from '#lib/paraglide/messages.js'
import { isSocialProvider, SOCIAL_LABELS } from '#lib/social.js'
import { audit } from '#lib/server/audit.js'
import { auth } from '#lib/server/auth.js'
import { authErrorMessage } from '#lib/server/auth-errors.js'
import { validateForm } from '#lib/server/forms.js'
import { requireUser } from '#lib/server/guards.js'
import { enabledSocialProviders, PROVIDER_ORIGINS } from '#lib/server/social.js'
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
		// The picture showing is an upload ( the media module's ), which can be removed.
		avatarUploaded: MODULES.media && !!user.avatarId,
		// Back from a provider that refused, or whose account is someone else's here.
		linkError    : event.url.searchParams.has( 'link-error' )
	}
}

// The provider a sign-in form names, if this deployment offers it: none without the social
// module ( enabledSocialProviders is empty ), so link and unlink answer 404 there.
async function providerOf( request : Request ) {
	const provider = ( await request.formData() ).get( 'provider' )

	if ( !isSocialProvider( provider ) || !enabledSocialProviders().includes( provider ) )
		error( 404, 'Not found' )

	return provider
}

export const actions : Actions = {
	profile: ( event ) => validateForm( event, profileSchema, async( form ) => {
		const { user } = await requireUser( event )

		try {
			await auth().api.updateUser( { body: form.data, headers: event.request.headers } )
		} catch ( caught ) {
			return message( form, authErrorMessage( caught ), { status: 400 } )
		}

		await audit( event, { action: 'account.profile', changes: { name: [ user.name, form.data.name ] } } )

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

		redirect( 303, url, { external: PROVIDER_ORIGINS } )
	},
	// better-auth refuses to remove the last way to sign in ( and wants a recent sign-in ).
	unlink: async( event ) => {
		await requireUser( event )

		const provider = await providerOf( event.request )
		const headers = event.request.headers

		try {
			const account = ( await auth().api.listUserAccounts( { headers } ) ).find( ( row ) => row.providerId === provider )

			if ( account ) {
				await auth().api.unlinkAccount( { body: { accountId: account.id }, headers } )
				await audit( event, { action: 'account.unlink', target: { label: SOCIAL_LABELS[ provider ] } } )
			}
		} catch ( caught ) {
			return fail( 400, { social: authErrorMessage( caught ) } )
		}

		return { social: m.social_unlinked( { provider: SOCIAL_LABELS[ provider ] } ) }
	}
}
