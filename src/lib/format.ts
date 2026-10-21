import { APP } from '$lib/config'
import { getLocale } from '$lib/paraglide/runtime'

export const money = ( value : number, currency : string = APP.currency ) =>
	new Intl.NumberFormat( getLocale(), { style: 'currency', currency } ).format( value )

export const date = (
	value : Date | string | number,
	options : Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
) => new Intl.DateTimeFormat( getLocale(), { timeZone: APP.timeZone, ...options } ).format( new Date( value ) )

// Each language named in its own language ( "English", "Indonesia" ), no hardcoded labels.
export const languageName = ( locale : string ) =>
	new Intl.DisplayNames( [ locale ], { type: 'language' } ).of( locale ) ?? locale
