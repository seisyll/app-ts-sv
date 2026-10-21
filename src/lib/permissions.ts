import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

/* ―― » Roles and what they may do ( better-auth access control, from the fundraiser app ).
        Shared by the server guards and the nav filter, so the policy can't drift between
        what a page allows and what the sidebar offers. Add a resource here, then grant it:

          export const statements = { ...defaultStatements, invoice: [ 'create', 'list' ] } */
export const statements = {
	...defaultStatements,
	settings: [ 'read', 'update' ],
	// publish: make a file public ( served without a session ) or private again.
	media   : [ 'list', 'create', 'delete', 'publish' ],
	// The audit trail: read only — nobody edits it, not even an admin.
	audit   : [ 'list' ]
} as const

export const ac = createAccessControl( statements )

export const member = ac.newRole( {
	settings: [ 'read' ],
	media   : [ 'list', 'create' ]
} )

export const admin = ac.newRole( {
	...adminAc.statements,
	settings: [ 'read', 'update' ],
	media   : [ 'list', 'create', 'delete', 'publish' ],
	audit   : [ 'list' ]
} )

export const roles = { admin, member } as const

export type RoleName = keyof typeof roles

export const DEFAULT_ROLE : RoleName = 'member'

// e.g. { settings: [ 'update' ] }
export type Permission = Parameters<typeof admin.authorize>[0]

// Does a user with `role` ( comma-separated for several ) have `permission`? Unknown roles have none.
export function hasPermission( role : string | null | undefined, permission : Permission ) : boolean {
	return ( role ?? DEFAULT_ROLE )
		.split( ',' )
		.map( ( name ) => name.trim() )
		.some( ( name ) => roles[ name as RoleName ]?.authorize( permission ).success ?? false )
}
