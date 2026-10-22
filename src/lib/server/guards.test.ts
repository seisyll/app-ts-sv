import { describe, expect, it } from 'vitest'
import { isHttpError, isRedirect, type RequestEvent } from '@sveltejs/kit'
import { hasPermission } from '#lib/permissions.js'
import type { Session } from './auth'
import { requireApiPermission, requireApiUser, requirePermission, requireUser, safeRedirect } from './guards'

const eventWith = ( role : string | null | undefined, signedIn = true ) => ( {
	url   : new URL( 'http://localhost/app/settings?tab=team' ),
	locals: { session: async() => ( signedIn ? { user: { role }, session: {} } as unknown as Session : null ) }
} ) as unknown as RequestEvent

const outcome = ( promise : Promise<unknown> ) => promise.then(
	() => 'allowed',
	( caught ) => ( isRedirect( caught ) ? `redirect ${ caught.location }` : isHttpError( caught ) ? caught.status : 'threw' )
)

describe( 'hasPermission', () => {
	it( 'grants what each role was given, and nothing to unknown roles', () => {
		expect( hasPermission( 'member', { settings: [ 'read' ] } ) ).toBe( true )
		expect( hasPermission( 'member', { settings: [ 'update' ] } ) ).toBe( false )
		expect( hasPermission( 'admin', { settings: [ 'update' ], user: [ 'list' ] } ) ).toBe( true )
		expect( hasPermission( 'nobody', { settings: [ 'read' ] } ) ).toBe( false )
	} )

	it( 'treats no role as the default role, and a list as any of its roles', () => {
		expect( hasPermission( null, { settings: [ 'read' ] } ) ).toBe( true )
		expect( hasPermission( 'member, admin', { settings: [ 'update' ] } ) ).toBe( true )
	} )
} )

describe( 'page guards', () => {
	it( 'send a signed-out user to the login page, keeping where they were going', async() => {
		expect( await outcome( requireUser( eventWith( 'member', false ) ) ) ).toBe( 'redirect /login?redirectTo=%2Fapp%2Fsettings%3Ftab%3Dteam' )
	} )

	it( 'answer 404, not 403, when the permission is missing', async() => {
		expect( await outcome( requirePermission( eventWith( 'member' ), { settings: [ 'update' ] } ) ) ).toBe( 404 )
		expect( await outcome( requirePermission( eventWith( 'admin' ), { settings: [ 'update' ] } ) ) ).toBe( 'allowed' )
	} )
} )

describe( 'endpoint guards', () => {
	it( 'answer 401 when signed out and 403 when not allowed', async() => {
		expect( await outcome( requireApiUser( eventWith( 'member', false ) ) ) ).toBe( 401 )
		expect( await outcome( requireApiPermission( eventWith( 'member' ), { settings: [ 'update' ] } ) ) ).toBe( 403 )
		expect( await outcome( requireApiPermission( eventWith( 'admin' ), { settings: [ 'update' ] } ) ) ).toBe( 'allowed' )
	} )
} )

describe( 'safeRedirect', () => {
	it( 'allows same-site paths only', () => {
		expect( safeRedirect( '/app/account' ) ).toBe( '/app/account' )
		expect( safeRedirect( '//evil.test' ) ).toBe( '/app' )
		expect( safeRedirect( '/\\evil.test' ) ).toBe( '/app' )
		expect( safeRedirect( 'https://evil.test' ) ).toBe( '/app' )
		expect( safeRedirect( null ) ).toBe( '/app' )
	} )
} )
