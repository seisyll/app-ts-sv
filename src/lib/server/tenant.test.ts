import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { isHttpError } from '@sveltejs/kit'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { normaliseHost, subdomainOf } from './tenant'

describe( 'normaliseHost / subdomainOf', () => {
	it( 'lowercases and drops the port and a trailing dot, keeping IPv6 brackets', () => {
		expect( normaliseHost( 'Acme.Example.TEST:5173' ) ).toBe( 'acme.example.test' )
		expect( normaliseHost( 'example.test.' ) ).toBe( 'example.test' )
		expect( normaliseHost( '[::1]:5173' ) ).toBe( '[::1]' )
	} )

	it( 'reads a single-label subdomain of the app domain only', () => {
		expect( subdomainOf( 'acme.app.test', 'app.test' ) ).toBe( 'acme' )
		expect( subdomainOf( 'a.b.app.test', 'app.test' ) ).toBeUndefined()
		expect( subdomainOf( 'app.test', 'app.test' ) ).toBeUndefined()
		expect( subdomainOf( 'acme.other.test', 'app.test' ) ).toBeUndefined()
	} )
} )

describe( 'resolveTenant', () => {
	let t : TestDatabase
	let tenant : typeof import( './tenant' )
	const saved = { ...process.env }

	beforeAll( async() => {
		t = await createTestDatabase()
		await t.prisma.tenant.createMany( { data: [
			{ slug: 'default', name: 'Default' },
			{ slug: 'acme', name: 'Acme', domain: 'acme-custom.test' },
			{ slug: 'gone', name: 'Gone', status: 'suspended' }
		] } )
		await t.asApp()
		tenant = await import( './tenant' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	afterEach( () => {
		process.env = { ...saved, DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX }
		tenant.resetTenantState()
	} )

	const at = ( host : string ) => tenant.resolveTenant( new URL( `http://${ host }/` ) )
	const statusOf = ( promise : Promise<unknown> ) => promise.then( () => 200, ( caught ) => ( isHttpError( caught ) ? caught.status : -1 ) )

	it( 'single: always the configured tenant, whatever the host', async() => {
		process.env.TENANCY = 'single'
		process.env.TENANT_SLUG = 'default'

		expect( ( await at( 'anything.test' ) ).slug ).toBe( 'default' )
	} )

	it( 'single: a missing tenant is a setup error that says how to fix it', async() => {
		process.env.TENANCY = 'single'
		process.env.TENANT_SLUG = 'nope'

		await expect( at( 'x.test' ) ).rejects.toMatchObject( { status: 503, body: { message: expect.stringContaining( 'db:setup' ) } } )
	} )

	it( 'shared: by custom domain, then by subdomain; unknown or suspended is a 404', async() => {
		process.env.TENANCY = 'shared'
		process.env.APP_DOMAIN = 'app.test'

		expect( ( await at( 'acme-custom.test' ) ).slug ).toBe( 'acme' )
		expect( ( await at( 'acme.app.test:5173' ) ).slug ).toBe( 'acme' )
		expect( await statusOf( at( 'nobody.app.test' ) ) ).toBe( 404 )
		expect( await statusOf( at( 'gone.app.test' ) ) ).toBe( 404 )
	} )

	it( 'refuses to resolve anything while connected as a superuser', async() => {
		process.env.TENANCY = 'single'
		process.env.TENANT_SLUG = 'default'
		tenant.resetTenantState()
		await t.asOwner()

		await expect( at( 'x.test' ) ).rejects.toThrow( /Unsafe database role/ )
		await t.asApp()
	} )
} )
