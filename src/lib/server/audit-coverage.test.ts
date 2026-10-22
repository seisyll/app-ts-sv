import { describe, expect, it } from 'vitest'
import { routeHandlers } from '#lib/test/route-handlers.js'

/* ―― » A tripwire, not a test of behaviour ( billing-app's audit-coverage ). The trail is
        append-only, which makes a MISSING entry invisible: nothing errors, the page just has
        nothing to say the day someone asks who changed a setting. So this reads every route
        that can change something — a +server.ts POST / PUT / PATCH / DELETE, a form action —
        and fails when one records nothing. A handler silent for a reason is listed below
        with the reason; one silent by accident can't hide among them. */

const EXEMPT : Record<string, string> = {
	'(auth)/login/+page.server.ts#default'              : 'a sign-in: the sign-in log\'s, not the trail\'s',
	'(auth)/login/social/+server.ts#POST'               : 'only sends the browser to the provider; the callback records',
	'(auth)/logout/+page.server.ts#default'             : 'ends a session',
	'(auth)/forgot-password/+page.server.ts#default'    : 'sends a link; changes nothing until it is used',
	'csp/+server.ts#POST'                               : 'a browser report of what the policy blocked; logged, not stored',
	'app/account/+page.server.ts#link'                  : 'only sends the browser to the provider; the callback records ( auth.ts )',
	'app/account/notifications/+page.server.ts#default' : 'a person\'s own notification preferences',
	'api/appearance/me/+server.ts#PUT'                  : 'a person\'s own display preference',
	'api/notifications/read/+server.ts#POST'            : 'marking notifications read',
	'app/settings/mail/+page.server.ts#test'            : 'sends a test email; changes nothing',
	'app/settings/security/+page.server.ts#test'        : 'checks a captcha answer; changes nothing'
}

// What can change something: a mutating method, or a form action.
const all = routeHandlers().filter( ( handler ) => handler.name !== 'load' && handler.name !== 'GET' )

describe( 'audit coverage', () => {
	it( 'finds the mutating handlers it is meant to watch', () => {
		expect( all.map( ( handler ) => handler.key ) ).toEqual( expect.arrayContaining( [ 'api/users/+server.ts#POST', 'api/users/[id]/+server.ts#DELETE', 'app/settings/appearance/+page.server.ts#default' ] ) )
	} )

	it( 'every handler that changes something records it, or says why not', () => {
		const silent = all.filter( ( handler ) => !handler.body.includes( 'audit(' ) && !EXEMPT[ handler.key ] ).map( ( handler ) => handler.key )

		expect( silent ).toEqual( [] )
	} )

	it( 'every exemption still names a real, silent handler', () => {
		const keys = new Set( all.map( ( handler ) => handler.key ) )
		const stale = Object.keys( EXEMPT ).filter( ( key ) => !keys.has( key ) || all.find( ( handler ) => handler.key === key )?.body.includes( 'audit(' ) )

		expect( stale ).toEqual( [] )
	} )
} )
