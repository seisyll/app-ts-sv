import type { MediaRow } from '$lib/media'
import type { NotificationItem } from '$lib/notifications'

// Deterministic fake customers for the playground ( no faker: same rows every run ).
export type Customer = {
	id        : string
	name      : string
	email     : string
	plan      : 'free' | 'pro' | 'team'
	status    : 'active' | 'trial' | 'churned'
	mrr       : number
	createdAt : string
}

const FIRST = [ 'Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Tim', 'Hedy', 'Edsger', 'Frances', 'John', 'Katherine', 'Donald', 'Sophie', 'Guido', 'Anita', 'Bjarne' ]
const LAST = [ 'Lovelace', 'Hopper', 'Turing', 'Torvalds', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Perlman', 'Berners-Lee', 'Lamarr', 'Dijkstra', 'Allen', 'McCarthy', 'Johnson', 'Knuth', 'Wilson', 'van Rossum', 'Borg', 'Stroustrup' ]
const PLANS = [ 'free', 'pro', 'pro', 'team' ] as const
const STATUSES = [ 'active', 'active', 'active', 'trial', 'churned' ] as const
const PRICE = { free: 0, pro: 29, team: 99 }
const START = Date.UTC( 2026, 0, 1 )
const HOUR = 3_600_000

export const CUSTOMERS : Customer[] = Array.from( { length: 137 }, ( _, index ) => {
	const first = FIRST[ index % FIRST.length ]
	// Shifted per round of first names, so name pairs don't repeat every 20 rows.
	const last = LAST[ ( index * 7 + Math.floor( index / FIRST.length ) ) % LAST.length ]
	const plan = PLANS[ ( index * 3 ) % PLANS.length ]

	return {
		id       : `cus_${ String( index + 1 ).padStart( 3, '0' ) }`,
		name     : `${ first } ${ last }`,
		email    : `${ first }.${ last }`.toLowerCase().replace( /[^a-z.]/g, '' ) + `${ index }@example.test`,
		plan,
		status   : STATUSES[ ( index * 3 ) % STATUSES.length ],
		mrr      : PRICE[ plan ] * ( 1 + ( index % 3 ) ),
		// Spread over the year at varied hours, so date filtering has edges to test.
		createdAt: new Date( START + index * 61 * HOUR ).toISOString()
	}
} )

// Mock media rows for the playground's media pages: generated pictures, nothing stored.
const SHAPES = [ [ 1600, 1200 ], [ 1200, 1800 ], [ 1920, 1080 ], [ 1000, 1000 ], [ 900, 1400 ], [ 2000, 900 ] ]
const NAMES = [ 'Harbour', 'Lighthouse', 'Market', 'Orchard', 'Canyon', 'Glacier', 'Terrace', 'Delta', 'Summit', 'Lagoon', 'Prairie', 'Dunes' ]

export const mockMedia = ( n : number, name = `${ NAMES[ n % NAMES.length ] }.jpg` ) : MediaRow => {
	const [ width, height ] = SHAPES[ n % SHAPES.length ]

	return {
		id       : `00000000-0000-7000-8000-${ String( n ).padStart( 12, '0' ) }`,
		kind     : 'image',
		name,
		mime     : 'image/svg+xml',
		size     : 40_000 + n * 1_337,
		width,
		height,
		createdAt: new Date( Date.UTC( 2026, 9, 21 - n ) ).toISOString(),
		uploader : 'Ada Lovelace',
		url      : `/api/hello/media/${ n }`,
		thumbUrl : `/api/hello/media/${ n }`
	}
}

// Mock notifications for the playground's bell, held in memory.
const freshNotifications = () : NotificationItem[] => [
	{ type: 'role.changed', title: 'You\'re now Admin', body: 'Changed by Grace Hopper', href: null, minutes: 2 },
	{ type: 'user.joined', title: 'Linus Torvalds joined the workspace', body: 'linus@example.test', href: null, minutes: 45 },
	{ type: 'user.joined', title: 'Margaret Hamilton joined the workspace', body: 'margaret@example.test', href: null, minutes: 60 * 26 }
].map( ( { minutes, ...item }, index ) => ( { ...item, id: `00000000-0000-7000-9000-00000000000${ index }`, readAt: null, createdAt: new Date( Date.now() - minutes * 60_000 ).toISOString() } ) )

export const mockNotifications = {
	items: freshNotifications(),
	reset() {
		this.items = freshNotifications()
	},
	markRead( ids ?: string[] ) {
		let count = 0

		this.items = this.items.map( ( item ) => ( item.readAt || ( ids?.length && !ids.includes( item.id ) ) ? item : ( count++, { ...item, readAt: new Date().toISOString() } ) ) )

		return count
	}
}
