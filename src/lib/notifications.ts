import { getLocale } from '#lib/paraglide/runtime.js'

// A notification as the bell and the inbox see it: already rendered, in the reader's locale.
export type NotificationItem = {
	id        : string
	type      : string
	title     : string
	body      : string | null
	href      : string | null
	readAt    : string | null
	createdAt : string
}

export type NotificationPage = { items : NotificationItem[], unread : number }

const STEPS : [ Intl.RelativeTimeFormatUnit, number ][] = [ [ 'second', 60 ], [ 'minute', 60 ], [ 'hour', 24 ], [ 'day', 7 ] ]

// "2 minutes ago", "yesterday" — in the reader's language; a date once it's over a week old.
export function relativeTime( iso : string, now = Date.now() ) : string {
	const then = new Date( iso ).getTime()

	if ( !Number.isFinite( then ) )
		return ''

	let value = ( then - now ) / 1000

	if ( Math.abs( value ) < 45 )
		return new Intl.RelativeTimeFormat( getLocale(), { numeric: 'auto' } ).format( 0, 'second' )

	for ( const [ unit, size ] of STEPS ) {
		if ( Math.abs( value ) < size )
			return new Intl.RelativeTimeFormat( getLocale(), { numeric: 'auto' } ).format( Math.round( value ), unit )

		value /= size
	}

	return new Intl.DateTimeFormat( getLocale(), { dateStyle: 'medium' } ).format( then )
}
