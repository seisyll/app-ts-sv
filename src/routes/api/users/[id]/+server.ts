import { json } from '@sveltejs/kit'
import type { Permission } from '$lib/permissions'
import type { AuditAction } from '$lib/audit'
import { audit } from '$lib/server/audit'
import { auth } from '$lib/server/auth'
import { rethrowAuthError } from '$lib/server/auth-errors'
import { db } from '$lib/server/db'
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
	'revoke-sessions': { session: [ 'revoke' ] },
	'remove-avatar'  : { user: [ 'update' ] }
}

const ACTION : Record<UserChange[ 'action' ], AuditAction> = { 'set-role': 'user.role', 'ban': 'user.ban', 'unban': 'user.unban', 'revoke-sessions': 'user.sessions', 'remove-avatar': 'user.avatar-remove' }

// Who it was, for the trail: read before the change ( or the removal ) happens.
const subject = ( id : string ) => db.user.findUnique( { where: { id }, select: { id: true, name: true, email: true, role: true } } )
const label = ( user : { name : string, email : string } | null, id : string ) => ( user ? `${ user.name } <${ user.email }>` : id )

export const PATCH : RequestHandler = async( event ) => {
	await requireApiUser( event )
	const change = await readJson( event.request, userChangeSchema )
	const { user } = await requireApiPermission( event, NEEDS[ change.action ] )

	const before = await subject( event.params.id )

	await changeUser( auth(), event.request.headers, user.id, event.params.id, change ).catch( rethrowAuthError )
	await audit( event, {
		action : ACTION[ change.action ],
		target : { id: event.params.id, label: label( before, event.params.id ) },
		changes: change.action === 'set-role' ? { role: [ before?.role ?? null, change.role ] } : null
	} )

	if ( change.action === 'set-role' )
		await notify( { type: 'role.changed', params: { role: change.role, by: user.name }, to: { users: [ event.params.id ] } } )

	return json( { ok: true } )
}

export const DELETE : RequestHandler = async( event ) => {
	const { user } = await requireApiPermission( event, { user: [ 'delete' ] } )

	const before = await subject( event.params.id )

	await deleteUser( auth(), event.request.headers, user.id, event.params.id ).catch( rethrowAuthError )
	await audit( event, { action: 'user.delete', target: { id: event.params.id, label: label( before, event.params.id ) } } )

	return json( { ok: true } )
}
