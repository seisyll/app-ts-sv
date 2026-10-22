import { lastMonths, type MonthWindow } from '#lib/months.js'
import { db } from '#lib/server/db/index.js'
import { log } from '#lib/server/log.js'
import { moduleActive } from '#lib/server/modules.js'

/* ―― » The workspace's figures for /app ( under RLS: this workspace only ). Each is its own
        read, and a read that fails is null — the page shows a dash there, never a zero
        that would claim something nobody measured ( billing-app's degraded reads ). A figure
        whose module is off is undefined: the page leaves its card out. */

// One read: its value, or null if it threw ( logged ).
async function read<T>( name : string, fn : () => Promise<T> ) : Promise<T | null> {
	try {
		return await fn()
	} catch ( caught ) {
		log.error( { err: caught, scope: 'dashboard', figure: name }, 'a figure failed' )

		return null
	}
}

const notBanned = { OR: [ { banned: false }, { banned: null } ] }

// The users table's status facets, counted ( src/lib/server/users.ts ).
async function people() {
	const [ roles, active, invited, banned ] = await Promise.all( [
		db.user.groupBy( { by: [ 'role' ], _count: { _all: true } } ),
		db.user.count( { where: { ...notBanned, accounts: { some: {} } } } ),
		db.user.count( { where: { ...notBanned, accounts: { none: {} } } } ),
		db.user.count( { where: { banned: true } } )
	] )
	const byRole = Object.fromEntries( roles.map( ( row ) => [ row.role ?? 'member', row._count._all ] ) )

	return { active, invited, banned, admins: byRole.admin ?? 0, members: byRole.member ?? 0 }
}

// New accounts per calendar month, the last six ending with `month`.
const signups = ( month : MonthWindow ) => Promise.all( lastMonths( 6, month ).map( async( window ) => ( {
	month: window.key,
	count: await db.user.count( { where: { createdAt: { gte: window.start, lt: window.end } } } )
} ) ) )

async function media() {
	const kinds = await db.media.groupBy( { by: [ 'kind' ], _count: { _all: true }, _sum: { size: true } } )
	const of = ( kind : string ) => kinds.find( ( row ) => row.kind === kind )

	return {
		images   : of( 'image' )?._count._all ?? 0,
		documents: of( 'document' )?._count._all ?? 0,
		bytes    : kinds.reduce( ( sum, row ) => sum + ( row._sum.size ?? 0 ), 0 )
	}
}

export async function loadDashboard( userId : string, month : MonthWindow, { people: withPeople = false } = {} ) {
	const [ mediaOn, notificationsOn ] = await Promise.all( [ MODULES.media && moduleActive( 'media' ), MODULES.notifications && moduleActive( 'notifications' ) ] )

	const [ peopleRead, signupsRead, mediaRead, unread ] = await Promise.all( [
		withPeople ? read( 'people', people ) : undefined,
		read( 'signups', () => signups( month ) ),
		mediaOn ? read( 'media', media ) : undefined,
		notificationsOn ? read( 'unread', () => db.notificationRecipient.count( { where: { userId, readAt: null } } ) ) : undefined
	] )

	return { month: month.key, people: peopleRead, signups: signupsRead, media: mediaRead, unread }
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>
