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
	image     : string | null
	role      : string
	banned    : boolean
	createdAt : string
}

export const newUserSchema = v.object( { name, email, password: newPassword, role: v.picklist( ROLE_NAMES ) } )

export type NewUser = v.InferOutput<typeof newUserSchema>

export const userChangeSchema = v.variant( 'action', [
	v.object( { action: v.literal( 'set-role' ), role: v.picklist( ROLE_NAMES ) } ),
	v.object( { action: v.literal( 'ban' ), reason: v.optional( v.pipe( v.string(), v.trim(), v.maxLength( 200 ) ) ) } ),
	v.object( { action: v.literal( 'unban' ) } ),
	v.object( { action: v.literal( 'revoke-sessions' ) } )
] )

export type UserChange = v.InferOutput<typeof userChangeSchema>
