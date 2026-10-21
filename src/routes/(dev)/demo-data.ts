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
