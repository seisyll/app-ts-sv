import { APP } from '$lib/config'
import { getLocale } from '$lib/paraglide/runtime'

export const money = ( value : number, currency : string = APP.currency ) =>
	new Intl.NumberFormat( getLocale(), { style: 'currency', currency } ).format( value )

export const date = (
	value : Date | string | number,
	options : Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
) => new Intl.DateTimeFormat( getLocale(), { timeZone: APP.timeZone, ...options } ).format( new Date( value ) )

// Up to two initials for avatars and logos: "Ada Lovelace" → "AL", " acme " → "A".
// Array.from so an emoji or other astral character isn't split in half.
export const initials = ( name : string ) => name
	.trim()
	.split( /\s+/ )
	.filter( Boolean )
	.slice( 0, 2 )
	.map( ( word ) => Array.from( word )[ 0 ].toUpperCase() )
	.join( '' )

// Each language named in its own language ( "English", "Indonesia" ), no hardcoded labels.
export const languageName = ( locale : string ) =>
	new Intl.DisplayNames( [ locale ], { type: 'language' } ).of( locale ) ?? locale
