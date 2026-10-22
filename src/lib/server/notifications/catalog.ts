import * as v from 'valibot'
import { m } from '#lib/paraglide/messages.js'
import { roleLabel } from '#lib/users.js'

/* ―― » What each notification type MEANS ( the fundraiser app's catalog ). The database
        stores only `type` + `params`; this turns them into the title, body and link a
        reader sees — at read time, in the reader's language. Rewording is an edit here:
        no migration, and old rows read the new words at once.

        Adding a type: one entry here ( a params schema, labels for the preferences page,
        a render, whether email is on until a reader says otherwise ), then
        notify( { type, params, to } ) where it happens. Give it an icon
        in src/lib/components/notifications/icons.ts if the bell should show one. */

export type Rendered = { title : string, body : string | null, href : string | null }

type Definition<S extends v.GenericSchema> = {
	label       : () => string
	description : () => string
	schema      : S
	render      : ( params : v.InferOutput<S> ) => Rendered
	// Emailed too, for readers who haven't chosen ( and only once mail is set up ).
	email       : boolean
}

// Keeps each entry's exact schema type for `notify()`'s params.
const define = <S extends v.GenericSchema>( definition : Definition<S> ) => definition

export const NOTIFICATIONS = {
	'user.joined': define( {
		label      : () => m.notif_user_joined_label(),
		description: () => m.notif_user_joined_desc(),
		schema     : v.object( { name: v.string(), email: v.string() } ),
		render     : ( p ) => ( { title: m.notif_user_joined_title( { name: p.name } ), body: p.email, href: '/app/users' } ),
		email      : false
	} ),
	'role.changed': define( {
		label      : () => m.notif_role_changed_label(),
		description: () => m.notif_role_changed_desc(),
		schema     : v.object( { role: v.string(), by: v.string() } ),
		render     : ( p ) => ( { title: m.notif_role_changed_title( { role: roleLabel( p.role ) } ), body: m.notif_role_changed_body( { name: p.by } ), href: null } ),
		email      : true
	} )
} as const

export type NotificationType = keyof typeof NOTIFICATIONS
export type NotificationParams<T extends NotificationType> = v.InferInput<( typeof NOTIFICATIONS )[ T ][ 'schema' ]>

export const NOTIFICATION_TYPES = Object.keys( NOTIFICATIONS ) as NotificationType[]

export const isNotificationType = ( type : string ) : type is NotificationType => Object.hasOwn( NOTIFICATIONS, type )

// One bad row ( a type since renamed, params that no longer fit ) must never break the
// inbox: it reads as a plain "Notification" instead.
export function renderNotification( type : string, params : unknown ) : Rendered {
	const parsed = isNotificationType( type ) ? v.safeParse( NOTIFICATIONS[ type ].schema, params ) : undefined

	return parsed?.success
		? ( NOTIFICATIONS[ type as NotificationType ].render as ( p : unknown ) => Rendered )( parsed.output )
		: { title: m.notif_fallback(), body: null, href: null }
}
