import { error, json } from '@sveltejs/kit'
import { parsePageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import { auth } from '$lib/server/auth'
import { isAuthError, rethrowAuthError } from '$lib/server/auth-errors'
import { readJson } from '$lib/server/forms'
import { requireApiPermission } from '$lib/server/guards'
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

	await createUser( auth(), event.request.headers, input ).catch( ( caught ) => {
		if ( isAuthError( caught, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ) || isAuthError( caught, 'USER_ALREADY_EXISTS' ) )
			error( 409, { message: m.validation_failed(), errors: { email: [ m.auth_email_taken() ] } } )

		rethrowAuthError( caught )
	} )

	// The other admins hear about it; the one who added them already knows.
	await notify( { type: 'user.joined', params: { name: input.name, email: input.email }, to: { roles: [ 'admin' ], except: [ user.id ] } } )

	return json( { ok: true }, { status: 201 } )
}
