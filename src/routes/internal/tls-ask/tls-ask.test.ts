import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// What Caddy may fetch a certificate for, and what /health says ( PGlite, real migrations ).
describe( 'deploy endpoints', () => {
	let t : TestDatabase
	let ask : ( domain ?: string ) => Promise<number>
	let health : () => Promise<{ status : number, body : unknown }>

	beforeAll( async() => {
		Object.assign( process.env, { TENANCY: 'shared', APP_DOMAIN: 'app.test' } )
		t = await createTestDatabase()
		await t.prisma.tenant.create( { data: { slug: 'acme', name: 'Acme', domain: 'shop.acme.test' } } )
		await t.prisma.tenant.create( { data: { slug: 'gone', name: 'Gone', status: 'suspended' } } )
		await t.asApp()

		const tlsAsk = await import( './+server' )
		const healthCheck = await import( '../../health/+server' )

		ask = ( domain ) => ( tlsAsk.GET as ( event : unknown ) => Promise<Response> )( { url: new URL( `http://app/internal/tls-ask${ domain === undefined ? '' : `?domain=${ domain }` }` ) } )
			.then( ( response ) => response.status, ( caught : { status : number } ) => caught.status )
		health = async() => {
			const response = await ( healthCheck.GET as () => Promise<Response> )()

			return { status: response.status, body: await response.json() }
		}
	}, 60_000 )

	afterAll( async() => {
		delete process.env.TENANCY
		delete process.env.APP_DOMAIN
		await t?.close()
	} )

	it( 'approves an active workspace\'s subdomain and custom domain, and nothing else', async() => {
		expect( await ask( 'acme.app.test' ) ).toBe( 200 )
		expect( await ask( 'SHOP.acme.test.' ) ).toBe( 200 )
		expect( await ask( 'gone.app.test' ) ).toBe( 404 )
		expect( await ask( 'evil.example' ) ).toBe( 404 )
		expect( await ask( 'a.b.app.test' ) ).toBe( 404 )
		expect( await ask() ).toBe( 400 )
	} )

	it( 'approves nothing in single tenancy', async() => {
		process.env.TENANCY = 'single'
		expect( await ask( 'acme.app.test' ) ).toBe( 404 )
		process.env.TENANCY = 'shared'
	} )

	it( 'is healthy while the database answers', async() => {
		expect( await health() ).toEqual( { status: 200, body: { status: 'ok', database: 'up', redis: process.env.REDIS_URL ? expect.any( String ) : 'off' } } )
	} )
} )
