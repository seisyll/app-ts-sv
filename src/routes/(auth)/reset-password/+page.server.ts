import { redirect } from '@sveltejs/kit'
import { message, superValidate } from 'sveltekit-superforms'
import { valibot } from 'sveltekit-superforms/adapters'
import { resetSchema } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { auth } from '$lib/server/auth'
import { audit } from '$lib/server/audit'
import { authErrorMessage, isAuthError } from '$lib/server/auth-errors'
import { db } from '$lib/server/db'
import { validateForm } from '$lib/server/forms'
import type { Actions, PageServerLoad } from './$types'

/* ―― » Choose a password from an emailed link: a password reset, or accepting an invite ( the
        same better-auth token, see createUser ). Who it is for comes from the token, so the
        page can greet them, and sign them straight in afterwards. */
async function tokenOwner( token : string ) {
	const verification = token
		? await db.verification.findFirst( { where: { identifier: `reset-password:${ token }`, expiresAt: { gt: new Date() } }, select: { value: true } } )
		: null

	return verification
		? db.user.findUnique( { where: { id: verification.value }, select: { id: true, email: true, name: true, _count: { select: { accounts: true } } } } )
		: null
}

export const load : PageServerLoad = async( { url } ) => {
	const token = url.searchParams.get( 'token' ) ?? ''
	const owner = await tokenOwner( token )

	return {
		form  : await superValidate( { token, newPassword: '', confirmPassword: '' }, valibot( resetSchema ), { errors: false } ),
		valid : !!owner,
		// No way to sign in yet: accepting an invite, not a reset.
		invite: owner ? !owner._count.accounts : false,
		name  : owner?.name ?? ''
	}
}

export const actions : Actions = {
	default: ( event ) => validateForm( event, resetSchema, async( form ) => {
		const { token, newPassword } = form.data
		const owner = await tokenOwner( token )

		// Never send a password back to the browser.
		form.data.newPassword = form.data.confirmPassword = ''

		if ( !owner )
			return message( form, m.auth_link_expired(), { status: 400 } )

		try {
			// Also ends their other sessions and marks the email verified ( $lib/server/auth ).
			await auth().api.resetPassword( { body: { token, newPassword }, headers: event.request.headers } )
		} catch ( caught ) {
			return message( form, isAuthError( caught, 'INVALID_TOKEN' ) ? m.auth_link_expired() : authErrorMessage( caught ), { status: 400 } )
		}

		await audit( event, { action: 'account.password-reset', actor: { id: owner.id, name: owner.name } } )

		// Straight in with the new password. Refused ( banned )? The login page says why.
		try {
			await auth().api.signInEmail( { body: { email: owner.email, password: newPassword }, headers: event.request.headers } )
		} catch {
			redirect( 303, '/login' )
		}

		redirect( 303, '/app' )
	} )
}
