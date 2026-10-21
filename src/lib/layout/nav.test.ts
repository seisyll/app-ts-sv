import { describe, expect, it } from 'vitest'
import { filterNav, navSearchGroups, navTrail, type NavGroup } from './nav'
import { navSearchFilter } from './search-score'

const nav : NavGroup[] = [
	{ items: [ { title: 'Dashboard', href: '/' } ] },
	{
		label: 'Workspace',
		items: [
			{ title: 'Reports', href: '/reports' },
			{
				title: 'Team',
				items: [
					{ title: 'Team members', href: '/team/members', keywords: [ 'staff' ] },
					{ title: 'Roles', href: '/team/roles' }
				]
			}
		]
	},
	{ items: [ { title: 'Help', href: '/help' } ] }
]

describe( 'navTrail', () => {
	it( 'finds a top-level leaf and a nested leaf with its parent', () => {
		expect( navTrail( nav, '/reports' ).map( ( item ) => item.title ) ).toEqual( [ 'Reports' ] )
		expect( navTrail( nav, '/team/roles' ).map( ( item ) => item.title ) ).toEqual( [ 'Team', 'Roles' ] )
	} )

	it( 'is empty for a path outside the nav', () => {
		expect( navTrail( nav, '/nowhere' ) ).toEqual( [] )
	} )
} )

describe( 'navSearchGroups', () => {
	const groups = navSearchGroups( nav, 'General' )

	it( 'groups direct links by label, parents by title, and merges unlabelled groups', () => {
		expect( groups.map( ( group ) => group.heading ) ).toEqual( [ 'General', 'Workspace', 'Team' ] )
		expect( groups[ 0 ].entries.map( ( entry ) => entry.href ) ).toEqual( [ '/', '/help' ] )
	} )

	it( 'marks top-level entries and folds title, synonyms and URL words into keywords', () => {
		const members = groups[ 2 ].entries[ 0 ]

		expect( members.topLevel ).toBe( false )
		expect( members.keywords ).toEqual( expect.arrayContaining( [ 'Team members', 'staff', 'team', 'members' ] ) )
		expect( groups[ 1 ].entries[ 0 ].topLevel ).toBe( true )
	} )
} )

describe( 'navSearchFilter', () => {
	const entries = navSearchGroups( nav, 'General' ).flatMap( ( group ) => group.entries )
	const score = navSearchFilter( entries )
	const scoreOf = ( href : string, query : string ) =>
		score( href, query, entries.find( ( entry ) => entry.href === href )?.keywords )

	it( 'ranks an exact title above a partial match', () => {
		expect( scoreOf( '/reports', 'reports' ) ).toBeGreaterThan( scoreOf( '/team/roles', 'reports' ) )
	} )

	it( 'ranks a first-word match above a later-word match', () => {
		expect( scoreOf( '/team/members', 'team' ) ).toBeGreaterThan( scoreOf( '/team/roles', 'team' ) )
	} )

	it( 'matches synonyms through keywords and drops junk below the floor', () => {
		expect( scoreOf( '/team/members', 'staff' ) ).toBeGreaterThan( 0 )
		expect( scoreOf( '/help', 'zzz' ) ).toBe( 0 )
	} )
} )

describe( 'filterNav', () => {
	const gated : NavGroup[] = [
		{ items: [ { title: 'Home', href: '/' } ] },
		{ label: 'Admin', items: [ { title: 'Settings', href: '/settings', permission: { settings: [ 'update' ] } } ] },
		{ items: [ { title: 'Team', items: [ { title: 'Roles', href: '/roles', permission: { settings: [ 'update' ] } }, { title: 'Members', href: '/members' } ] } ] }
	]

	it( 'drops items the user lacks, then empty parents and groups', () => {
		const visible = filterNav( gated, () => false )

		expect( visible.map( ( group ) => group.label ?? group.items[ 0 ].title ) ).toEqual( [ 'Home', 'Team' ] )
		expect( visible[ 1 ].items[ 0 ].items?.map( ( item ) => item.title ) ).toEqual( [ 'Members' ] )
		expect( filterNav( gated, () => true ) ).toHaveLength( 3 )
	} )
} )
