import { error, json } from '@sveltejs/kit'
import { APIError } from 'better-auth/api'
import { parsePageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import { auth } from '$lib/server/auth'
import { isAuthError, rethrowAuthError } from '$lib/server/auth-errors'
import { readJson } from '$lib/server/forms'
import { requireApiPermission } from '$lib/server/guards'
import { mailReady } from '$lib/server/mail'
import { notify } from '$lib/server/notifications'
import { createUser, listUsers } from '$lib/server/users'
import { newUserSchema } from '$lib/users'
import type { RequestHandler } from './$types'

// The Users table's data source ( TableSource ) and its Add user dialog.
export const GET : RequestHandler = async( event ) => {
	await requireApiPermission( event, { user: [ 'list' ] } )

	return json( await listUsers( parsePageQuery( event.url.searchParams ) ) )
}

export const POST : RequestHandler = async( event ) => {
	const { user } = await requireApiPermission( event, { user: [ 'create' ] } )
	const input = await readJson( event.request, newUserSchema )

	// No password means an invite, which needs a way to send it.
	if ( !input.password && !await mailReady() )
		error( 400, { message: m.validation_failed(), errors: { password: [ m.users_password_needed() ] } } )

	await createUser( auth(), event.request.headers, input, user.name ).catch( ( caught ) => {
		if ( isAuthError( caught, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ) || isAuthError( caught, 'USER_ALREADY_EXISTS' ) )
			error( 409, { message: m.validation_failed(), errors: { email: [ m.auth_email_taken() ] } } )

		if ( caught instanceof APIError )
			rethrowAuthError( caught )

		// The invite email didn't go ( createUser already took the account back out ).
		console.error( '[users] invite failed', caught )
		error( 502, { message: m.users_invite_failed() } )
	} )

	// The other admins hear about it; the one who added them already knows.
	await notify( { type: 'user.joined', params: { name: input.name, email: input.email }, to: { roles: [ 'admin' ], except: [ user.id ] } } )

	return json( { ok: true }, { status: 201 } )
}
