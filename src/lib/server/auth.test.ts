import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import type { TenantRef } from '$lib/server/db'

// better-auth end to end on the tenant-scoped database ( PGlite, real migrations ).
describe( 'auth', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let auth : ReturnType<typeof import( './auth' ).createAuth>
	let closedAuth : typeof auth

	beforeAll( async() => {
		Object.assign( process.env, {
			BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-42',
			BETTER_AUTH_URL   : 'http://localhost:5173',
			TENANCY           : 'single'
		} )

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
		await t.asApp()

		const { createAuth } = await import( './auth' )

		process.env.AUTH_SIGNUP = 'true'
		auth = createAuth( { cookies: false } )
		process.env.AUTH_SIGNUP = 'false'
		closedAuth = createAuth( { cookies: false } )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inTenant = <T>( tenant : TenantRef, fn : () => Promise<T> ) => t.runWithTenant( tenant, fn )
	const ada = { name: 'Ada', email: 'ada@example.test', password: 'correct horse battery' }

	// Sign in and return the Cookie header a browser would send back.
	async function signIn( tenant : TenantRef, email : string, password : string ) {
		const { headers } = await inTenant( tenant, () => auth.api.signInEmail( { body: { email, password }, returnHeaders: true } ) )

		return headers.getSetCookie().map( ( cookie ) => cookie.split( ';' )[ 0 ] ).join( '; ' )
	}

	it( 'refuses sign-up unless it is turned on', async() => {
		await expect( inTenant( a, () => closedAuth.api.signUpEmail( { body: ada } ) ) ).rejects.toThrow()
	} )

	// No mail server in these tenants: verification emails land in the dev outbox.
	const outbox = () => import( './mail/outbox' )
	const linkIn = ( text : string ) => new URL( text.match( /http\S+verify-email\S+/ )![ 0 ] ).searchParams.get( 'token' )!

	it( 'signs a user up into the request\'s tenant, with a hashed password and the default role', async() => {
		const { clearOutbox, listOutbox } = await outbox()

		clearOutbox()

		const result = await inTenant( a, () => auth.api.signUpEmail( { body: ada } ) )

		await t.asOwner()

		const user = await t.prisma.user.findFirstOrThrow( { where: { email: ada.email }, include: { accounts: true } } )

		await t.asApp()

		expect( user ).toMatchObject( { tenantId: a.id, role: 'member', emailVerified: false } )
		expect( user.accounts[ 0 ].password ).not.toContain( ada.password )
		// No session until the email is verified; the link is on its way.
		expect( result.token ).toBeNull()
		await vi.waitFor( () => expect( listOutbox() ).toMatchObject( [ { to: ada.email, subject: 'Confirm your email for A' } ] ) )
	} )

	it( 'refuses to sign in until the email is verified, and sends a fresh link instead', async() => {
		const { listOutbox } = await outbox()

		await expect( signIn( a, ada.email, ada.password ) ).rejects.toMatchObject( { body: { code: 'EMAIL_NOT_VERIFIED' } } )
		await vi.waitFor( () => expect( listOutbox() ).toHaveLength( 2 ) )

		await inTenant( a, () => auth.api.verifyEmail( { query: { token: linkIn( listOutbox()[ 0 ].text ) } } ) )

		await t.asOwner()
		expect( ( await t.prisma.user.findFirstOrThrow( { where: { tenantId: a.id, email: ada.email } } ) ).emailVerified ).toBe( true )
		await t.asApp()
	} )

	it( 'signs in with the right password only', async() => {
		expect( await signIn( a, ada.email, ada.password ) ).toMatch( /session_token=/ )
		await expect( signIn( a, ada.email, 'wrong password!!' ) ).rejects.toThrow()
	} )

	it( 'keeps a session to its tenant: the same cookie means nothing in another tenant', async() => {
		const cookie = await signIn( a, ada.email, ada.password )
		const headers = new Headers( { cookie } )

		const inA = await inTenant( a, () => auth.api.getSession( { headers } ) )
		const inB = await inTenant( b, () => auth.api.getSession( { headers } ) )

		expect( inA?.user.email ).toBe( ada.email )
		expect( inB ).toBeNull()
	} )

	it( 'lets the same email exist separately in another tenant', async() => {
		await inTenant( b, () => auth.api.signUpEmail( { body: { ...ada, password: 'another long password' } } ) )
		await t.asOwner()
		await t.prisma.user.update( { where: { tenantId_email: { tenantId: b.id, email: ada.email } }, data: { emailVerified: true } } )
		await t.asApp()

		await expect( signIn( b, ada.email, ada.password ) ).rejects.toThrow()
		expect( await signIn( b, ada.email, 'another long password' ) ).toMatch( /session_token=/ )
	} )

	it( 'ends the session on sign-out', async() => {
		const headers = new Headers( { cookie: await signIn( a, ada.email, ada.password ) } )

		await inTenant( a, () => auth.api.signOut( { headers } ) )

		expect( await inTenant( a, () => auth.api.getSession( { headers } ) ) ).toBeNull()
	} )
} )
