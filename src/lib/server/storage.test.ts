import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// Each workspace's usage and limit ( PGlite, real migrations, as the app's RLS role ).
describe( 'storage', () => {
	let t : TestDatabase
	let storage : typeof import( './storage' )
	const tenants : Record<string, TenantRef> = {}

	beforeAll( async() => {
		process.env.STORAGE_QUOTA = '2K'
		t = await createTestDatabase()

		// a: its own 1000 bytes; b: the default ( 2K ); c: no limit at all.
		for ( const [ slug, storageQuota ] of [ [ 'a', 1000n ], [ 'b', null ], [ 'c', 0n ] ] as const ) {
			tenants[ slug ] = await t.prisma.tenant.create( { data: { slug, name: slug, storageQuota } } )
			await t.prisma.media.create( { data: { tenantId: tenants[ slug ].id, kind: 'document', name: 'x.pdf', mime: 'application/pdf', size: 600 } } )
		}

		await t.asApp()
		storage = await import( './storage' )
	}, 60_000 )

	afterAll( async() => {
		delete process.env.STORAGE_QUOTA
		await t?.close()
	} )

	const usage = ( slug : string ) => t.runWithTenant( tenants[ slug ], () => storage.storageUsage() )
	const room = ( slug : string, bytes : number ) => t.runWithTenant( tenants[ slug ], () => storage.ensureRoom( 'big.pdf', bytes ) ).then( () => 'fits', ( caught ) => caught.status )

	it( 'counts each workspace\'s own files against its own limit, or the default, or none', async() => {
		expect( await usage( 'a' ) ).toEqual( { used: 600, quota: 1000 } )
		expect( await usage( 'b' ) ).toEqual( { used: 600, quota: 2048 } )
		expect( await usage( 'c' ) ).toEqual( { used: 600, quota: null } )
	} )

	it( 'refuses what wouldn\'t fit, and only that', async() => {
		expect( [ await room( 'a', 400 ), await room( 'a', 401 ) ] ).toEqual( [ 'fits', 413 ] )
		expect( [ await room( 'b', 1448 ), await room( 'b', 1449 ) ] ).toEqual( [ 'fits', 413 ] )
		expect( await room( 'c', 10 ** 12 ) ).toBe( 'fits' )
	} )
} )
