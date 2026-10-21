import { computeCommandScore } from 'bits-ui'
import type { NavSearchEntry } from './nav'

/* ―― » Command-palette scoring, ported from billing-app where it was tuned on 62 pages.

        computeCommandScore matches subsequences, so it almost never returns 0 ( "ee"
        "matched" 59 of 62 pages ). Its ranking is fine; recall isn't. Junk piles up at
        exactly 0.1 ( its transposition score ), so the floor cuts there. Cost: swapped-
        letter typos stop matching; missing letters still do. A relative floor would be
        better but Command scores items one at a time and never reveals the best score. */
const MIN_SCORE = 0.1

/* ―― » Title bands above the plain score, because subsequence scoring can't tell which
        page is actually NAMED what was typed ( "rp" tied five pages; "sla" preferred the
        page where it happened to end the string ). Order: exact title > a top-level
        page containing the word > first word > acronym > everything else. Each band is
        0.009 wide so bands never overlap; the plain score only orders WITHIN a band. */
const EXACT_TITLE = 0.99
const TOP_LEVEL_WORD = 0.97
const FIRST_WORD = 0.95
const ACRONYM = 0.93
const BAND_SPAN = 0.009
const PLAIN_SCALE = 0.88

// Title words without punctuation: "Members (Team)" → [ 'members', 'team' ].
const wordsOf = ( title : string ) => title
	.split( /\s+/ )
	.map( ( word ) => word.replace( /[^\p{L}\p{N}]/gu, '' ) )
	.filter( Boolean )

// Builds the filter for <Command.Root filter>. Items are keyed by href ( titles repeat ).
export function navSearchFilter( entries : NavSearchEntry[] ) {
	const titleOf = new Map( entries.map( ( entry ) => [ entry.href, entry.title.toLowerCase() ] ) )
	const topLevel = new Set( entries.filter( ( entry ) => entry.topLevel ).map( ( entry ) => entry.href ) )

	return function navSearchScore( value : string, search : string, keywords ?: string[] ) : number {
		// `keywords` must be passed on, or every synonym is silently ignored.
		const base = computeCommandScore( value, search, keywords )

		if ( base <= MIN_SCORE )
			return 0

		const query = search.trim().toLowerCase()
		const title = titleOf.get( value )

		if ( title === undefined || query === '' )
			return base * PLAIN_SCALE

		if ( title === query )
			return EXACT_TITLE

		const words = wordsOf( title )

		if ( topLevel.has( value ) && words.includes( query ) )
			return TOP_LEVEL_WORD + base * BAND_SPAN

		if ( words[ 0 ] === query )
			return FIRST_WORD + base * BAND_SPAN

		const acronym = words.map( ( word ) => word[ 0 ] ).join( '' )

		if ( acronym.length >= 2 && acronym === query )
			return ACRONYM + base * BAND_SPAN

		return base * PLAIN_SCALE
	}
}
