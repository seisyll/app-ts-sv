import { m } from '#lib/paraglide/messages.js'

/* ―― » The sign-in log's vocabulary, shared by the server ( src/lib/server/sign-ins.ts ) and
        its pages. */

export const SIGN_IN_OUTCOMES = [ 'success', 'wrong-password', 'locked', 'captcha', 'unverified', 'banned', 'refused' ] as const
export type SignInOutcome = ( typeof SIGN_IN_OUTCOMES )[ number ]

export const SIGN_IN_METHODS = [ 'password', 'google', 'apple' ] as const
export type SignInMethod = ( typeof SIGN_IN_METHODS )[ number ]

export type SignInRow = {
	id        : string
	at        : string
	userId    : string | null
	name      : string | null
	email     : string
	outcome   : string
	method    : string
	ip        : string | null
	userAgent : string | null
}

export const outcomeLabel = ( outcome : string ) : string => ( {
	'success'       : m.signins_success(),
	'wrong-password': m.signins_wrong_password(),
	'locked'        : m.signins_locked(),
	'captcha'       : m.signins_captcha(),
	'unverified'    : m.signins_unverified(),
	'banned'        : m.signins_banned(),
	'refused'       : m.signins_refused()
} as Record<string, string> )[ outcome ] ?? outcome

export const methodLabel = ( method : string ) : string => ( { password: m.signins_password(), google: 'Google', apple: 'Apple' } as Record<string, string> )[ method ] ?? method

/* ―― » "Chrome · Windows" from a user agent: enough to recognise one's own device, no more.
        ponytail: a handful of patterns; a UA library if the long tail matters. */
export function deviceLabel( userAgent : string | null ) : string {
	if ( !userAgent )
		return '—'

	const browser = /Edg\//.test( userAgent ) ? 'Edge' : /OPR\//.test( userAgent ) ? 'Opera' : /Firefox\//.test( userAgent ) ? 'Firefox' : /Chrome\//.test( userAgent ) ? 'Chrome' : /Safari\//.test( userAgent ) ? 'Safari' : null
	const system = /iPhone|iPad/.test( userAgent ) ? 'iOS' : /Android/.test( userAgent ) ? 'Android' : /Windows/.test( userAgent ) ? 'Windows' : /Mac OS X/.test( userAgent ) ? 'macOS' : /Linux/.test( userAgent ) ? 'Linux' : null

	return [ browser, system ].filter( Boolean ).join( ' · ' ) || userAgent.slice( 0, 40 )
}
