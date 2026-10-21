import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from 'better-auth/crypto'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import type { TenantRef } from '$lib/server/db'
import type { ActiveCaptcha } from './captcha'

/* ―― » The sign-in guard through better-auth itself ( PGlite, real migrations ): the counts
        live in an in-memory stand-in for Redis, and the captcha provider answers "good". */
const counts = new Map<string, number>()
let captcha : ActiveCaptcha | null = null

vi.mock( './redis', () => ( {
	tenantKey: async( ...parts : string[] ) => parts.join( ':' ),
	hit      : async( key : string ) => {
		counts.set( key, ( counts.get( key ) ?? 0 ) + 1 )

		return { count: counts.get( key )!, ttlMs: 600_000 }
	},
	peek     : async( key : string ) => ( { count: counts.get( key ) ?? 0, ttlMs: counts.has( key ) ? 600_000 : 0 } ),
	clear    : async( key : string ) => void counts.delete( key ),
	rateLimit: async( key : string, limit : number ) => {
		counts.set( key, ( counts.get( key ) ?? 0 ) + 1 )

		return { allowed: counts.get( key )! <= limit, retryAfterMs: 60_000 }
	},
	redisReady: () => true
} ) )

vi.mock( './captcha', () => ( {
	activeCaptcha: async() => captcha,
	verifyCaptcha: async( _ : unknown, token : string ) => token === 'good'
} ) )

describe( 'sign-in guard', () => {
	let t : TestDatabase
	let a : TenantRef
	let auth : ReturnType<typeof import( './auth' ).createAuth>

	const ada = { email: 'ada@example.test', password: 'correct horse battery' }
	const account = `sign-in:account:${ ada.email }`
	const address = 'sign-in:address:203.0.113.7'

	beforeAll( async() => {
		Object.assign( process.env, { BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-42', BETTER_AUTH_URL: 'http://localhost:5173', TENANCY: 'single' } )

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )

		const user = await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: ada.email, emailVerified: true } } )

		await t.prisma.account.create( { data: { tenantId: a.id, userId: user.id, providerId: 'credential', accountId: user.id, password: await hashPassword( ada.password ) } } )
		await t.asApp()

		auth = ( await import( './auth' ) ).createAuth( { cookies: false } )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	beforeEach( () => {
		counts.clear()
		captcha = null
	} )

	const headers = ( token ?: string ) => new Headers( { 'x-client-ip': '203.0.113.7', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', ...( token ? { 'x-captcha-response': token } : {} ) } )
	// The sign-in log's latest entries, newest first.
	const logged = async( take = 1 ) => ( await t.runWithTenant( a, () => t.db.signInEvent.findMany( { orderBy: { at: 'desc' }, take, select: { outcome: true, method: true, userId: true, ip: true, userAgent: true } } ) ) ).map( ( row ) => row.outcome )
	const signIn = ( password : string, token ?: string ) => t.runWithTenant( a, () => auth.api.signInEmail( { body: { email: ada.email, password }, headers: headers( token ) } ) )

	it( 'counts a wrong password against the email and the address; a success clears the email', async() => {
		await expect( signIn( 'wrong password!' ) ).rejects.toMatchObject( { statusCode: 401 } )
		expect( counts.get( account ) ).toBe( 1 )
		expect( counts.get( address ) ).toBe( 1 )

		await expect( signIn( ada.password ) ).resolves.toMatchObject( { token: expect.any( String ) } )
		expect( counts.has( account ) ).toBe( false )
		// Both attempts are in the sign-in log, on Ada's account, with where they came from.
		expect( await logged( 2 ) ).toEqual( [ 'success', 'wrong-password' ] )
		expect( await t.runWithTenant( a, () => t.db.signInEvent.findFirst( { where: { outcome: 'wrong-password' } } ) ) ).toMatchObject( { method: 'password', ip: '203.0.113.7', userAgent: expect.stringContaining( 'Chrome' ), userId: expect.any( String ) } )
		// The address keeps its count: a success on one account clears no other's guesses.
		expect( counts.get( address ) ).toBe( 1 )
	} )

	it( 'locks the email after 10 failures, right password or not, and says for how long', async() => {
		counts.set( account, 10 )

		await expect( signIn( ada.password ) ).rejects.toMatchObject( { statusCode: 429, body: { code: 'SIGN_IN_LOCKED', message: expect.stringContaining( '10 min' ) } } )
		expect( await logged() ).toEqual( [ 'locked' ] )
	} )

	it( 'locks an address that failed 30 times, whichever email', async() => {
		counts.set( address, 30 )

		await expect( signIn( ada.password ) ).rejects.toMatchObject( { statusCode: 429 } )
	} )

	it( 'asks for the captcha after the trigger, and checks the answer', async() => {
		captcha = { provider: 'turnstile', siteKey: 'site', secret: 'secret', mode: 'adaptive', triggerAfter: 2 }

		// Below the trigger: no captcha needed.
		await expect( signIn( ada.password ) ).resolves.toBeTruthy()

		counts.set( account, 2 )
		await expect( signIn( ada.password ) ).rejects.toMatchObject( { body: { code: 'CAPTCHA_REQUIRED' } } )
		await expect( signIn( ada.password, 'bad' ) ).rejects.toMatchObject( { body: { code: 'CAPTCHA_INVALID' } } )
		expect( await logged() ).toEqual( [ 'captcha' ] )
		// A refused captcha isn't a guess: the count stays where it was.
		expect( counts.get( account ) ).toBe( 2 )
		await expect( signIn( ada.password, 'good' ) ).resolves.toBeTruthy()
	} )

	it( 'with a captcha on, a locked email gets the captcha instead of a closed door', async() => {
		captcha = { provider: 'hcaptcha', siteKey: 'site', secret: 'secret', mode: 'adaptive', triggerAfter: 3 }
		counts.set( account, 12 )

		await expect( signIn( ada.password ) ).rejects.toMatchObject( { body: { code: 'CAPTCHA_REQUIRED' } } )
		// Solved: in, after the throttle's wait ( at most 5 s ).
		await expect( signIn( ada.password, 'good' ) ).resolves.toBeTruthy()
	}, 15_000 )

	it( 'gives forgot-password a per-address budget, and a captcha whenever it is on', async() => {
		const forgot = ( token ?: string ) => t.runWithTenant( a, () => auth.api.requestPasswordReset( { body: { email: 'nobody@example.test' }, headers: headers( token ) } ) )

		for ( let attempt = 0; attempt < 3; attempt++ )
			await expect( forgot() ).resolves.toBeTruthy()

		await expect( forgot() ).rejects.toMatchObject( { statusCode: 429 } )

		counts.clear()
		captcha = { provider: 'recaptcha', siteKey: 'site', secret: 'secret', mode: 'adaptive', triggerAfter: 3 }
		await expect( forgot() ).rejects.toMatchObject( { body: { code: 'CAPTCHA_REQUIRED' } } )
		await expect( forgot( 'good' ) ).resolves.toBeTruthy()
	} )
} )
