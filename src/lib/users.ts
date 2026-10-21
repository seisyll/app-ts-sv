import * as v from 'valibot'
import { email, name, newPassword } from '$lib/auth-schemas'
import { m } from '$lib/paraglide/messages'
import { roles, type RoleName } from '$lib/permissions'

// User administration: shared by the Users page ( browser ) and its endpoints ( server ).

export const ROLE_NAMES = Object.keys( roles ) as [ RoleName, ...RoleName[] ]

export const roleLabel = ( role : string ) : string => ( { admin: m.users_role_admin(), member: m.users_role_member() } as Record<string, string> )[ role ] ?? role

export type UserRow = {
	id        : string
	name      : string
	email     : string
	// The picture to show: an uploaded avatar, else the sign-in provider's.
	image     : string | null
	// An uploaded one, which an admin may remove.
	avatar    : boolean
	role      : string
	banned    : boolean
	// Added without a password and hasn't accepted the invite yet.
	invited   : boolean
	createdAt : string
}

// No password: invite them by email to choose their own ( needs the workspace's mail ).
export const newUserSchema = v.object( { name, email, password: v.union( [ v.literal( '' ), newPassword ] ), role: v.picklist( ROLE_NAMES ) } )

export type NewUser = v.InferOutput<typeof newUserSchema>

export const userChangeSchema = v.variant( 'action', [
	v.object( { action: v.literal( 'set-role' ), role: v.picklist( ROLE_NAMES ) } ),
	v.object( { action: v.literal( 'ban' ), reason: v.optional( v.pipe( v.string(), v.trim(), v.maxLength( 200 ) ) ) } ),
	v.object( { action: v.literal( 'unban' ) } ),
	v.object( { action: v.literal( 'revoke-sessions' ) } ),
	// An uploaded avatar that shouldn't be there ( the media module's ).
	v.object( { action: v.literal( 'remove-avatar' ) } )
] )

export type UserChange = v.InferOutput<typeof userChangeSchema>
