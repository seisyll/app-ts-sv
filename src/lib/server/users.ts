import { error } from '@sveltejs/kit'
import type { Paged, PageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import type { createAuth } from '$lib/server/auth'
import { db } from '$lib/server/db'
import { listArgs, type ListSpec } from '$lib/server/list'
import type { NewUser, UserChange, UserRow } from '$lib/users'

// The current tenant's users ( RLS scopes `db` ), for the Users table.
const USERS : ListSpec = {
	search: [ 'name', 'email' ],
	facets: {
		role  : ( values ) => ( { role: { in: values } } ),
		status: ( values ) => ( { OR: values.map( ( value ) => ( value === 'banned' ? { banned: true } : { OR: [ { banned: false }, { banned: null } ] } ) ) } )
	},
	sort       : [ 'name', 'email', 'role', 'createdAt' ],
	defaultSort: { createdAt: 'desc' },
	date       : 'createdAt'
}

export async function listUsers( query : PageQuery ) : Promise<Paged<UserRow>> {
	const args = listArgs( query, USERS )
	const [ rows, total ] = await Promise.all( [
		db.user.findMany( { ...args, select: { id: true, name: true, email: true, image: true, role: true, banned: true, createdAt: true } } ),
		db.user.count( { where: args.where } )
	] )

	return {
		rows: rows.map( ( row ) => ( { ...row, role: row.role ?? 'member', banned: row.banned ?? false, createdAt: row.createdAt.toISOString() } ) ),
		total
	}
}

type Auth = ReturnType<typeof createAuth>

/* ―― » Changes go through better-auth's admin API: it hashes passwords, ends a banned user's
        sessions, and checks the caller's permission itself. The one rule added here — never
        on your own account — is what keeps a tenant from locking itself out: the acting
        admin always remains.
        ponytail: assumes only admins manage users; if another role gets user permissions,
        also refuse to demote / ban / delete the last admin. */
function notYourself( actorId : string, userId : string ) : void {
	if ( actorId === userId )
		error( 400, m.users_not_yourself() )
}

export async function changeUser( auth : Auth, headers : Headers, actorId : string, userId : string, change : UserChange ) : Promise<void> {
	notYourself( actorId, userId )

	if ( change.action === 'set-role' )
		await auth.api.setRole( { body: { userId, role: change.role }, headers } )
	else if ( change.action === 'ban' )
		await auth.api.banUser( { body: { userId, banReason: change.reason || undefined }, headers } )
	else if ( change.action === 'unban' )
		await auth.api.unbanUser( { body: { userId }, headers } )
	else
		await auth.api.revokeUserSessions( { body: { userId }, headers } )
}

export async function deleteUser( auth : Auth, headers : Headers, actorId : string, userId : string ) : Promise<void> {
	notYourself( actorId, userId )
	await auth.api.removeUser( { body: { userId }, headers } )
}

export async function createUser( auth : Auth, headers : Headers, input : NewUser ) : Promise<void> {
	await auth.api.createUser( { body: input, headers } )
}
