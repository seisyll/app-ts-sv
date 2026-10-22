import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'
import { socialProviders } from './social'

describe( 'socialProviders', () => {
	it( 'turns a provider on only when both of its values are set', () => {
		expect( socialProviders( {} ) ).toEqual( {} )
		expect( socialProviders( { GOOGLE_CLIENT_ID: 'id' } ) ).toEqual( {} )
		expect( Object.keys( socialProviders( { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', APPLE_CLIENT_ID: 'web', APPLE_CLIENT_SECRET: 'jwt' } ) ) ).toEqual( [ 'google', 'apple' ] )
	} )
} )

// better-auth with Google on ( PGlite, real migrations ): the button's first step.
describe( 'social sign-in', () => {
	let t : TestDatabase
	let a : TenantRef
	let auth : ReturnType<typeof import( './auth' ).createAuth>

	beforeAll( async() => {
		Object.assign( process.env, {
			BETTER_AUTH_SECRET  : 'test-secret-test-secret-test-secret-42',
			BETTER_AUTH_URL     : 'http://localhost:5173',
			TENANCY             : 'single',
			GOOGLE_CLIENT_ID    : 'google-client',
			GOOGLE_CLIENT_SECRET: 'google-secret'
		} )

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		await t.asApp()

		auth = ( await import( './auth' ) ).createAuth( { cookies: false } )
	}, 60_000 )

	afterAll( async() => {
		delete process.env.GOOGLE_CLIENT_ID
		delete process.env.GOOGLE_CLIENT_SECRET
		await t?.close()
	} )

	it( 'sends the browser to Google, to come back to this host\'s callback', async() => {
		const { url } = await t.runWithTenant( a, () => auth.api.signInSocial( { body: { provider: 'google', callbackURL: '/app' } } ) )
		const target = new URL( url! )

		expect( target.host ).toBe( 'accounts.google.com' )
		expect( target.searchParams.get( 'client_id' ) ).toBe( 'google-client' )
		expect( target.searchParams.get( 'redirect_uri' ) ).toBe( 'http://localhost:5173/api/auth/callback/google' )
		// The state is kept in this tenant's verifications, for the callback to check.
		expect( await t.runWithTenant( a, () => t.db.verification.count() ) ).toBe( 1 )
	} )

	it( 'refuses a provider that is off', async() => {
		await expect( t.runWithTenant( a, () => auth.api.signInSocial( { body: { provider: 'apple', callbackURL: '/app' } } ) ) ).rejects.toThrow()
	} )
} )
