import { randomBytes } from 'node:crypto'
import { error } from '@sveltejs/kit'
import type { Paged, PageQuery } from '$lib/components/data-table'
import { m } from '$lib/paraglide/messages'
import type { createAuth } from '$lib/server/auth'
import { avatarUrl, removeAvatar } from '$lib/server/avatars'
import { db } from '$lib/server/db'
import { listArgs, type ListSpec } from '$lib/server/list'
import { sendMail } from '$lib/server/mail/gate'
import { appUrl } from '$lib/server/url'
import type { NewUser, UserChange, UserRow } from '$lib/users'

// The current tenant's users ( RLS scopes `db` ), for the Users table.
const USERS : ListSpec = {
	search: [ 'name', 'email' ],
	facets: {
		role  : ( values ) => ( { role: { in: values } } ),
		// Invited: no way to sign in yet ( no password, no other account ).
		status: ( values ) => ( { OR: values.map( ( value ) => ( value === 'banned'
			? { banned: true }
			: value === 'invited'
				? { accounts: { none: {} } }
				: { OR: [ { banned: false }, { banned: null } ], accounts: { some: {} } } ) ) } )
	},
	sort       : [ 'name', 'email', 'role', 'createdAt' ],
	defaultSort: { createdAt: 'desc' },
	date       : 'createdAt'
}

export async function listUsers( query : PageQuery ) : Promise<Paged<UserRow>> {
	const args = listArgs( query, USERS )
	const [ rows, total ] = await Promise.all( [
		db.user.findMany( { ...args, select: { id: true, name: true, email: true, image: true, avatarId: true, role: true, banned: true, createdAt: true, _count: { select: { accounts: true } } } } ),
		db.user.count( { where: args.where } )
	] )

	return {
		rows: rows.map( ( { _count, avatarId, ...row } ) => ( { ...row, image: avatarUrl( { avatarId, image: row.image } ), avatar: !!avatarId, role: row.role ?? 'member', banned: row.banned ?? false, invited: !_count.accounts, createdAt: row.createdAt.toISOString() } ) ),
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

	if ( change.action === 'remove-avatar' ) {
		// Uploaded avatars are the media module's.
		if ( !MODULES.media )
			error( 404, 'Not found' )

		await removeAvatar( userId )
	} else if ( change.action === 'set-role' )
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

const INVITE_DAYS = 7

/* ―― » Add a person. With a password the admin vouches for them, so their email counts as
        verified. Without one they're INVITED: an email with a link to choose a password.
        The link is a better-auth reset token that lives a week instead of an hour, so
        accepting is the reset page and "forgot password" sends a fresh one. An invite that
        can't be sent takes the account back out, so the admin can simply try again. */
export async function createUser( auth : Auth, headers : Headers, input : NewUser, inviter : string ) : Promise<void> {
	const { password, ...rest } = input
	const { user } = await auth.api.createUser( { body: { ...rest, ...( password ? { password, data: { emailVerified: true } } : {} ) }, headers } )

	// Without the mail module the endpoint never gets here without a password.
	if ( password || !MODULES.mail )
		return

	try {
		const token = randomBytes( 24 ).toString( 'base64url' )

		await db.verification.create( { data: { identifier: `reset-password:${ token }`, value: user.id, expiresAt: new Date( Date.now() + INVITE_DAYS * 86_400_000 ) } } )
		await sendMail( { to: user, template: 'user.invite', values: { inviter, link: appUrl( `/reset-password?token=${ token }` ) } } )
	} catch ( caught ) {
		await auth.api.removeUser( { body: { userId: user.id }, headers } )

		throw caught
	}
}
