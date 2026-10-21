import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// The workspace's captcha settings ( PGlite, real migrations, as the app's RLS role ) and the
// providers' verify calls ( fetch stubbed ).
describe( 'captcha', () => {
	let t : TestDatabase
	let a : TenantRef
	let captcha : typeof import( './captcha' )

	beforeAll( async() => {
		process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-42'
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		await t.asApp()

		captcha = await import( './captcha' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	afterEach( () => {
		vi.unstubAllGlobals()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const settings = { enabled: true, provider: 'turnstile', siteKey: 'site-key', secret: 'top-secret', mode: 'adaptive', triggerAfter: 3 } as const

	it( 'is off until it is set up', async() => {
		expect( await inA( () => captcha.loadCaptchaSettings() ) ).toMatchObject( { enabled: false, hasSecret: false } )
		expect( await inA( () => captcha.activeCaptcha() ) ).toBeNull()
	} )

	it( 'stores the secret encrypted, keeps it when left blank, and drops it for a new provider', async() => {
		await inA( () => captcha.saveCaptchaSettings( settings ) )

		const row = await inA( () => t.db.captchaSetting.findFirstOrThrow() )

		expect( row.secret ).not.toContain( 'top-secret' )
		expect( await inA( () => captcha.activeCaptcha() ) ).toMatchObject( { provider: 'turnstile', siteKey: 'site-key', secret: 'top-secret' } )

		await inA( () => captcha.saveCaptchaSettings( { ...settings, secret: '', mode: 'always' } ) )
		expect( await inA( () => captcha.activeCaptcha() ) ).toMatchObject( { secret: 'top-secret', mode: 'always' } )

		await inA( () => captcha.saveCaptchaSettings( { ...settings, provider: 'hcaptcha', secret: '' } ) )
		expect( await inA( () => captcha.loadCaptchaSettings() ) ).toMatchObject( { provider: 'hcaptcha', hasSecret: false } )
		expect( await inA( () => captcha.activeCaptcha() ) ).toBeNull()
	} )

	it( 'asks the provider, and holds reCAPTCHA to a minimum score', async() => {
		const fetch = vi.fn( async( _url : string, init : RequestInit ) => new Response( JSON.stringify( String( init.body ).includes( 'recaptcha-token' ) ? { success: true, score: 0.3 } : { success: true } ) ) )

		vi.stubGlobal( 'fetch', fetch )

		const turnstile = { provider: 'turnstile', siteKey: 's', secret: 'x', mode: 'adaptive', triggerAfter: 3 } as const

		expect( await captcha.verifyCaptcha( turnstile, 'token', '203.0.113.7' ) ).toBe( true )
		expect( fetch.mock.calls[ 0 ][ 0 ] ).toContain( 'challenges.cloudflare.com' )
		expect( String( fetch.mock.calls[ 0 ][ 1 ].body ) ).toBe( 'secret=x&response=token&remoteip=203.0.113.7' )

		expect( await captcha.verifyCaptcha( { ...turnstile, provider: 'recaptcha' }, 'recaptcha-token' ) ).toBe( false )
		expect( await captcha.verifyCaptcha( { ...turnstile, provider: 'hcaptcha' }, 'token' ) ).toBe( true )
		expect( String( fetch.mock.calls[ 2 ][ 1 ].body ) ).toContain( 'sitekey=s' )
	} )

	it( 'says no when the provider can\'t be reached', async() => {
		vi.stubGlobal( 'fetch', vi.fn( async() => {
			throw new Error( 'offline' )
		} ) )

		expect( await captcha.verifyCaptcha( { provider: 'turnstile', siteKey: 's', secret: 'x', mode: 'adaptive', triggerAfter: 3 }, 'token' ) ).toBe( false )
	} )
} )
