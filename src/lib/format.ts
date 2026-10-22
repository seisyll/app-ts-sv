import { APP } from '#lib/config.js'
import { getLocale } from '#lib/paraglide/runtime.js'

export const money = ( value : number, currency : string = APP.currency, options : Intl.NumberFormatOptions = {} ) =>
	new Intl.NumberFormat( getLocale(), { style: 'currency', currency, ...options } ).format( value )

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

// A URL-safe slug: "Café Déjà Vu!" → "cafe-deja-vu". NFKD splits an accent off its letter, so
// the accent is dropped and the letter kept.
export const slugify = ( text : string ) => text
	.normalize( 'NFKD' )
	.replace( /\p{M}/gu, '' )
	.toLowerCase()
	.replace( /[^a-z0-9]+/g, '-' )
	.replace( /^-|-$/g, '' )

/* ―― » Personal details shown where they shouldn't be read in full ( the fundraiser app's
        Mask.ts ): a public receipt page, a support view. Mask on the SERVER, before the value
        leaves the load function — masked in the browser, the whole value still sits in the
        page data. The run is a fixed four dots, so it never tells how much it hides. */
const HIDDEN = '•'.repeat( 4 )

// '081234567890' → '••••890'
export const maskPhone = ( phone : string | null | undefined ) => ( phone?.trim() ? HIDDEN + phone.trim().slice( -3 ) : '' )

// 'john.doe@mail.com' → 'j••••@mail.com'
export const maskEmail = ( email : string | null | undefined ) => {
	const value = email?.trim() ?? ''
	const at = value.lastIndexOf( '@' )

	return !value ? '' : value.slice( 0, 1 ) + HIDDEN + ( at < 0 ? '' : value.slice( at ) )
}

// 'Budi Santoso' → 'B•••• S••••'
export const maskName = ( name : string | null | undefined ) => ( name ?? '' )
	.trim()
	.split( /\s+/ )
	.filter( Boolean )
	.map( ( word ) => Array.from( word )[ 0 ] + HIDDEN )
	.join( ' ' )
