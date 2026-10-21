import * as v from 'valibot'
import type { Prisma } from '$lib/server/db/generated/client'
import type { RoleName } from '$lib/permissions'
import type { NotificationItem, NotificationPage } from '$lib/notifications'
import { db, tenantTransaction } from '$lib/server/db'
import { appUrl, mailReady, sendMail } from '$lib/server/mail'
import { isNotificationType, NOTIFICATION_TYPES, NOTIFICATIONS, renderNotification, type NotificationParams, type NotificationType } from './catalog'

export { NOTIFICATION_TYPES, NOTIFICATIONS, type NotificationType } from './catalog'

type Audience = {
	// Everyone in the workspace with one of these roles.
	roles ?: RoleName[]
	// These users ( nullish ones skipped ), e.g. the person a change was about.
	users ?: ( string | null | undefined )[]
	// Never these — usually whoever did the thing.
	except ?: ( string | null | undefined )[]
}

/* ―― » Send a notification ( the fundraiser app's emit ): ONE event row, one recipient row
        per reader — the audience resolved in the current workspace, minus anyone who turned
        the type off — and an email to each reader who wants one. Best effort by design: it
        never throws, so a notification failing can never fail the action that triggered
        it. It logs instead. The inbox is read by polling. */
export async function notify<T extends NotificationType>( { type, params, to } : { type : T, params : NotificationParams<T>, to : Audience } ) : Promise<void> {
	try {
		const parsed = v.safeParse( NOTIFICATIONS[ type ].schema, params )

		if ( !parsed.success ) {
			console.error( `[notify] ${ type }: params don't fit the catalog`, v.flatten( parsed.issues ).nested )

			return
		}

		const ids = new Set( ( to.users ?? [] ).filter( ( id ) : id is string => !!id ) )

		// Roles are a comma-separated column, so match them here rather than with LIKE.
		if ( to.roles?.length ) {
			const users = await db.user.findMany( { where: { role: { not: null } }, select: { id: true, role: true } } )

			for ( const user of users ) {
				if ( user.role!.split( ',' ).some( ( role ) => to.roles!.includes( role.trim() as RoleName ) ) )
					ids.add( user.id )
			}
		}

		for ( const id of to.except ?? [] )
			ids.delete( id! )

		if ( !ids.size )
			return

		// Only users this workspace can see ( RLS ): an id from elsewhere, or a deleted user,
		// gets nothing — foreign keys alone would let a row point across tenants.
		const [ visible, stored ] = await Promise.all( [
			db.user.findMany( { where: { id: { in: [ ...ids ] } }, select: { id: true, name: true, email: true } } ),
			db.notificationPreference.findMany( { where: { type, userId: { in: [ ...ids ] } }, select: { userId: true, enabled: true, email: true } } )
		] )
		const preference = new Map( stored.map( ( row ) => [ row.userId, row ] ) )
		const inApp = visible.filter( ( user ) => preference.get( user.id )?.enabled ?? true )
		const byEmail = visible.filter( ( user ) => preference.get( user.id )?.email ?? NOTIFICATIONS[ type ].email )

		if ( byEmail.length )
			void emailNotification( type, parsed.output, byEmail )

		if ( !inApp.length )
			return

		await tenantTransaction( async( tx ) => {
			const event = await tx.notificationEvent.create( { data: { type, params: parsed.output as Prisma.InputJsonValue }, select: { id: true } } )

			await tx.notificationRecipient.createMany( { data: inApp.map( ( user ) => ( { eventId: event.id, userId: user.id } ) ), skipDuplicates: true } )
		} )
	} catch ( caught ) {
		console.error( `[notify] ${ type } failed`, caught )
	}
}

/* ―― » The email copies. Not awaited by notify(): the action that notified shouldn't wait on a
        mail server. Without mail set up ( outside dev ) there is nothing to send.
        ponytail: worded in the language of the request that caused it ( users have no stored
        language yet ); store one per user when that matters. */
async function emailNotification( type : NotificationType, params : unknown, readers : { name : string, email : string }[] ) : Promise<void> {
	try {
		if ( !await mailReady() )
			return

		const { title, body, href } = renderNotification( type, params )
		const values = { title, body: body ?? '', link: appUrl( href ?? '/app/notifications' ) }

		await Promise.all( readers.map( ( reader ) => sendMail( { to: reader, template: 'notification', values } )
			.catch( ( caught ) => console.error( `[notify] ${ type }: an email failed`, caught ) ) ) )
	} catch ( caught ) {
		console.error( `[notify] ${ type }: emails failed`, caught )
	}
}

const MAX_LIMIT = 50

// A reader's newest notifications, rendered, and how many are unread. Newest first by id:
// uuidv7 sorts by time.
export async function listNotifications( userId : string, limit = 20 ) : Promise<NotificationPage> {
	const [ rows, unread ] = await Promise.all( [
		db.notificationRecipient.findMany( {
			where  : { userId },
			orderBy: { id: 'desc' },
			take   : Math.min( Math.max( limit, 1 ), MAX_LIMIT ),
			select : { id: true, readAt: true, event: { select: { type: true, params: true, createdAt: true } } }
		} ),
		db.notificationRecipient.count( { where: { userId, readAt: null } } )
	] )

	const items : NotificationItem[] = rows.map( ( row ) => ( {
		id       : row.id,
		type     : row.event.type,
		...renderNotification( row.event.type, row.event.params ),
		readAt   : row.readAt?.toISOString() ?? null,
		createdAt: row.event.createdAt.toISOString()
	} ) )

	return { items, unread }
}

// Mark the reader's own notifications read: these ids, or all of them. Returns how many.
export async function markRead( userId : string, ids ?: string[] ) : Promise<number> {
	const { count } = await db.notificationRecipient.updateMany( {
		where: { userId, readAt: null, ...( ids?.length ? { id: { in: ids } } : {} ) },
		data : { readAt: new Date() }
	} )

	return count
}

export type NotificationPreferenceView = { type : NotificationType, label : string, description : string, enabled : boolean, email : boolean }

// One entry per catalog type; no stored row means in-app on and email as the catalog says.
export async function listPreferences( userId : string ) : Promise<NotificationPreferenceView[]> {
	const rows = await db.notificationPreference.findMany( { where: { userId }, select: { type: true, enabled: true, email: true } } )
	const stored = new Map( rows.map( ( row ) => [ row.type, row ] ) )

	return NOTIFICATION_TYPES.map( ( type ) => ( {
		type,
		label      : NOTIFICATIONS[ type ].label(),
		description: NOTIFICATIONS[ type ].description(),
		enabled    : stored.get( type )?.enabled ?? true,
		email      : stored.get( type )?.email ?? NOTIFICATIONS[ type ].email
	} ) )
}

export type NotificationChoice = { enabled : boolean, email ?: boolean }

// Types the catalog doesn't know are ignored, so a stale form can't write junk. Leaving
// `email` out keeps what's stored ( the form has no email switches without mail ).
export async function setPreferences( userId : string, preferences : Record<string, NotificationChoice> ) : Promise<void> {
	const known = Object.entries( preferences ).filter( ( [ type ] ) => isNotificationType( type ) )

	await tenantTransaction( async( tx ) => {
		for ( const [ type, { enabled, email } ] of known )
			await tx.notificationPreference.upsert( { where: { userId_type: { userId, type } }, create: { userId, type, enabled, email }, update: { enabled, email } } )
	} )
}
