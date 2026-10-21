import type { Component } from 'svelte'

// One sidebar entry. A leaf has `href` ( a full path, base included — it's compared with
// page.url.pathname as-is ); a parent has `items` ( one collapsible level ).
export type NavItem = {
	title     : string
	href ?    : string
	icon ?    : Component
	// Extra command-palette terms: synonyms, other-language words.
	keywords ?: string[]
	items ?   : NavItem[]
}

// A labelled block of the sidebar. The whole sidebar is `NavGroup[]`.
export type NavGroup = {
	label ?: string
	items  : NavItem[]
}

export type NavSearchEntry = {
	title    : string
	href     : string
	icon ?   : Component
	// Sits directly in a group, not under a parent — wins ties against deeper pages.
	topLevel : boolean
	keywords : string[]
}

export type NavSearchGroup = {
	heading : string
	entries : NavSearchEntry[]
}

// Breadcrumb trail for a path: [ parent?, leaf ]. Empty when the path isn't in the nav.
export function navTrail( groups : NavGroup[], path : string ) : NavItem[] {
	for ( const group of groups ) {
		for ( const item of group.items ) {
			if ( item.href === path )
				return [ item ]

			const child = item.items?.find( ( sub ) => sub.href === path )

			if ( child )
				return [ item, child ]
		}
	}

	return []
}

const segmentsOf = ( href : string ) => href.split( '/' ).filter( Boolean ).flatMap( ( part ) => part.split( '-' ) )

function entryOf( item : NavItem & { href : string }, icon : Component | undefined, topLevel : boolean ) : NavSearchEntry {
	return {
		title   : item.title,
		href    : item.href,
		icon,
		topLevel,
		// Title included: the palette keys items by href, so the title must be a keyword to be searched.
		keywords: [ ...new Set( [ item.title, ...item.keywords ?? [], ...segmentsOf( item.href ) ] ) ]
	}
}

const hasHref = ( item : NavItem ) : item is NavItem & { href : string } => !!item.href

// Command-palette catalogue, built from the same config the sidebar renders so the two
// can never disagree. Direct links group under their group label ( or `fallbackHeading` );
// each parent becomes its own heading. Same-heading groups merge.
export function navSearchGroups( groups : NavGroup[], fallbackHeading : string ) : NavSearchGroup[] {
	const byHeading = new Map<string, NavSearchEntry[]>()
	const add = ( heading : string, entries : NavSearchEntry[] ) => {
		if ( entries.length )
			byHeading.set( heading, [ ...byHeading.get( heading ) ?? [], ...entries ] )
	}

	for ( const group of groups ) {
		add( group.label ?? fallbackHeading, group.items.filter( hasHref ).map( ( item ) => entryOf( item, item.icon, true ) ) )

		for ( const item of group.items )
			add( item.title, ( item.items ?? [] ).filter( hasHref ).map( ( sub ) => entryOf( sub, item.icon, false ) ) )
	}

	return [ ...byHeading ].map( ( [ heading, entries ] ) => ( { heading, entries } ) )
}
