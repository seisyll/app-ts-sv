import { describe, expect, it } from 'vitest'
import { routeHandlers } from '#lib/test/route-handlers.js'

/* ―― » A ratchet on who may call what ( the fundraiser app's API permission sweep, crossed
        with billing-app's authorization ratchet ). Removing a check changes nothing anyone
        would notice: the handler still answers 200, just for everybody. So this reads every
        route handler and holds the surface to what is written below:
          · every handler is guarded ( requireUser / requirePermission, or their Api forms ),
            under /app ( hooks.server.ts signs everyone in there first ), or listed as PUBLIC
            with the reason it may be;
          · the permission each handler asks for is exactly the one in GUARDED.
        A new guarded handler is one line here; taking a check out, or weakening one, fails
        by name. It says nothing about whether a check is strict ENOUGH — that's review. */

// Open to anyone, on purpose.
const PUBLIC : Record<string, string> = {
	'(auth)/forgot-password/+page.server.ts#load'   : 'the sign-in pages are for people who aren’t',
	'(auth)/forgot-password/+page.server.ts#default': 'sends a link to the address, if it has an account',
	'(auth)/login/+page.server.ts#load'             : 'the sign-in page',
	'(auth)/login/+page.server.ts#default'          : 'signing in',
	'(auth)/login/social/+server.ts#POST'           : 'off to the provider; better-auth checks the answer',
	'(auth)/logout/+page.server.ts#load'            : 'redirects',
	'(auth)/logout/+page.server.ts#default'         : 'ends whatever session there is',
	'(auth)/reset-password/+page.server.ts#load'    : 'the token in the link is the credential',
	'(auth)/reset-password/+page.server.ts#default' : 'the token in the link is the credential',
	'(auth)/signup/+page.server.ts#load'            : 'open sign-up, when AUTH_SIGNUP is on',
	'(auth)/signup/+page.server.ts#default'         : 'open sign-up, when AUTH_SIGNUP is on',
	'(site)/[page=site_page]/+page.server.ts#load'  : 'the public site',
	'(site)/sitemap.xml/+server.ts#GET'             : 'the public site’s list of pages, for crawlers',
	'robots.txt/+server.ts#GET'                     : 'for crawlers',
	'csp/+server.ts#POST'                           : 'browsers report policy violations without a session',
	'health/+server.ts#GET'                         : 'up or down, nothing more',
	'internal/tls-ask/+server.ts#GET'               : 'Caddy, on the internal network; the Caddyfile keeps it from the public'
}

// Every handler that asks for a permission, and the one it asks for.
const GUARDED : Record<string, string> = {
	'api/audit/+server.ts#GET'                                 : '{ audit: [ \'list\' ] }',
	'api/media/+server.ts#GET'                                 : '{ media: [ \'list\' ] }',
	'api/media/+server.ts#POST'                                : '{ media: [ \'create\' ] }',
	'api/media/[id]/+server.ts#PATCH'                          : '{ media: [ \'publish\' ] }',
	'api/media/[id]/+server.ts#DELETE'                         : '{ media: [ \'delete\' ] }',
	'api/sign-ins/+server.ts#GET'                              : '{ signin: [ \'list\' ] }',
	'api/users/+server.ts#GET'                                 : '{ user: [ \'list\' ] }',
	'api/users/+server.ts#POST'                                : '{ user: [ \'create\' ] }',
	'api/users/[id]/+server.ts#PATCH'                          : 'NEEDS[ change.action ]',
	'api/users/[id]/+server.ts#DELETE'                         : '{ user: [ \'delete\' ] }',
	'app/media/+page.server.ts#load'                           : '{ media: [ \'list\' ] }',
	'app/settings/+page.server.ts#load'                        : '{ settings: [ \'update\' ] }',
	'app/settings/appearance/+page.server.ts#load'             : '{ settings: [ \'update\' ] }',
	'app/settings/appearance/+page.server.ts#default'          : '{ settings: [ \'update\' ] }',
	'app/settings/audit/+page.server.ts#load'                  : '{ audit: [ \'list\' ] }',
	'app/settings/mail/+page.server.ts#load'                   : '{ settings: [ \'update\' ] }',
	'app/settings/mail/+page.server.ts#save'                   : '{ settings: [ \'update\' ] }',
	'app/settings/mail/+page.server.ts#test'                   : '{ settings: [ \'update\' ] }',
	'app/settings/mail/[key]/+page.server.ts#load'             : '{ settings: [ \'update\' ] }',
	'app/settings/mail/[key]/+page.server.ts#save'             : '{ settings: [ \'update\' ] }',
	'app/settings/mail/[key]/+page.server.ts#reset'            : '{ settings: [ \'update\' ] }',
	'app/settings/security/+page.server.ts#load'               : '{ settings: [ \'update\' ] }',
	'app/settings/security/+page.server.ts#save'               : '{ settings: [ \'update\' ] }',
	'app/settings/security/+page.server.ts#test'               : '{ settings: [ \'update\' ] }',
	'app/settings/sign-ins/+page.server.ts#load'               : '{ signin: [ \'list\' ] }',
	'app/settings/site/+page.server.ts#load'                   : '{ site: [ \'manage\' ] }',
	'app/settings/site/+page.server.ts#default'                : '{ site: [ \'manage\' ] }',
	'app/settings/site/[page=site_page]/+page.server.ts#load'   : '{ site: [ \'manage\' ] }',
	'app/settings/site/[page=site_page]/+page.server.ts#default': '{ site: [ \'manage\' ] }',
	'app/users/+page.server.ts#load'                           : '{ user: [ \'list\' ] }',
	// A public file needs no session; a private one needs the media library.
	'media/[id]/[[variant]]/+server.ts#GET'                    : '{ media: [ \'list\' ] }'
}

const GUARD = /require(?:Api)?(User|Permission)\(\s*event\s*(?:,\s*([^)]*?))?\s*\)/g

const handlers = routeHandlers().map( ( handler ) => {
	const guards = [ ...handler.body.matchAll( GUARD ) ]

	return {
		key       : handler.key,
		signedIn  : guards.length > 0 || handler.key.startsWith( 'app/' ),
		permission: guards.filter( ( match ) => match[ 1 ] === 'Permission' ).map( ( match ) => match[ 2 ].replace( /\s+/g, ' ' ) ).join( ' + ' )
	}
} )

describe( 'permission coverage', () => {
	it( 'finds the handlers it is meant to watch', () => {
		expect( handlers.map( ( handler ) => handler.key ) ).toEqual( expect.arrayContaining( [ 'api/users/+server.ts#POST', 'app/settings/site/+page.server.ts#default', '(auth)/login/+page.server.ts#default' ] ) )
	} )

	it( 'leaves nothing open that isn\'t meant to be', () => {
		expect( handlers.filter( ( handler ) => !handler.signedIn && !PUBLIC[ handler.key ] ).map( ( handler ) => handler.key ) ).toEqual( [] )
	} )

	it( 'asks for exactly the permissions on record', () => {
		expect( Object.fromEntries( handlers.filter( ( handler ) => handler.permission ).map( ( handler ) => [ handler.key, handler.permission ] ) ) ).toEqual( GUARDED )
	} )

	it( 'lists only real, unguarded handlers as public', () => {
		const open = new Set( handlers.filter( ( handler ) => !handler.signedIn ).map( ( handler ) => handler.key ) )

		expect( Object.keys( PUBLIC ).filter( ( key ) => !open.has( key ) ) ).toEqual( [] )
	} )
} )
