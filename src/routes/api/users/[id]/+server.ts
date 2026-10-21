import { json } from '@sveltejs/kit'
import type { Permission } from '$lib/permissions'
import { auth } from '$lib/server/auth'
import { rethrowAuthError } from '$lib/server/auth-errors'
import { readJson } from '$lib/server/forms'
import { requireApiPermission, requireApiUser } from '$lib/server/guards'
import { notify } from '$lib/server/notifications/gate'
import { changeUser, deleteUser } from '$lib/server/users'
import { userChangeSchema, type UserChange } from '$lib/users'
import type { RequestHandler } from './$types'

// One user's role, ban and sessions ( PATCH { action, … } ), and removal ( DELETE ).
const NEEDS : Record<UserChange[ 'action' ], Permission> = {
	'set-role'       : { user: [ 'set-role' ] },
	'ban'            : { user: [ 'ban' ] },
	'unban'          : { user: [ 'ban' ] },
	'revoke-sessions': { session: [ 'revoke' ] }
}

export const PATCH : RequestHandler = async( event ) => {
	await requireApiUser( event )
	const change = await readJson( event.request, userChangeSchema )
	const { user } = await requireApiPermission( event, NEEDS[ change.action ] )

	await changeUser( auth(), event.request.headers, user.id, event.params.id, change ).catch( rethrowAuthError )

	if ( change.action === 'set-role' )
		await notify( { type: 'role.changed', params: { role: change.role, by: user.name }, to: { users: [ event.params.id ] } } )

	return json( { ok: true } )
}

export const DELETE : RequestHandler = async( event ) => {
	const { user } = await requireApiPermission( event, { user: [ 'delete' ] } )

	await deleteUser( auth(), event.request.headers, user.id, event.params.id ).catch( rethrowAuthError )

	return json( { ok: true } )
}
