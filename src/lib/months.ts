import { getLocale } from '$lib/paraglide/runtime'

/* ―― » Calendar months, for month pickers and charts bucketed by month ( billing-app's ). In
        UTC, as the app's dates are ( APP.timeZone ): in local time the first hours of a month
        would land in the one before for anyone east of Greenwich. Plain functions, so loads
        and components share them. */

export type MonthWindow = {
	// 'YYYY-MM'.
	key   : string
	// The first instant of the month and of the next: [ start, end ).
	start : Date
	end   : Date
}

const KEY = /^(\d{4})-(0[1-9]|1[0-2])$/

export function monthWindow( year : number, month : number ) : MonthWindow {
	const start = new Date( Date.UTC( year, month - 1, 1 ) )

	return {
		key  : `${ start.getUTCFullYear() }-${ String( start.getUTCMonth() + 1 ).padStart( 2, '0' ) }`,
		start,
		end  : new Date( Date.UTC( start.getUTCFullYear(), start.getUTCMonth() + 1, 1 ) )
	}
}

export const currentMonth = ( now = new Date() ) : MonthWindow => monthWindow( now.getUTCFullYear(), now.getUTCMonth() + 1 )

export function shiftMonth( window : MonthWindow, delta : number ) : MonthWindow {
	return monthWindow( window.start.getUTCFullYear(), window.start.getUTCMonth() + 1 + delta )
}

// A 'YYYY-MM' from a URL; anything else, or a month still to come, is the current one.
export function monthFromKey( key : string | null | undefined, now = new Date() ) : MonthWindow {
	const match = KEY.exec( key ?? '' )
	const month = match ? monthWindow( Number( match[ 1 ] ), Number( match[ 2 ] ) ) : currentMonth( now )

	return month.key > currentMonth( now ).key ? currentMonth( now ) : month
}

// The `count` months ending with `last`, oldest first: calendar months, so a quiet one is a
// zero bar rather than a gap that closes up.
export function lastMonths( count : number, last : MonthWindow = currentMonth() ) : MonthWindow[] {
	return Array.from( { length: count }, ( _, index ) => shiftMonth( last, index - count + 1 ) )
}

// "October 2026", or "Oct" with { month: 'short' }, in the current language.
export const monthLabel = ( window : MonthWindow, options : Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' } ) =>
	new Intl.DateTimeFormat( getLocale(), { ...options, timeZone: 'UTC' } ).format( window.start )
