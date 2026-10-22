import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// The workspace logo and favicon on the tenant-scoped database ( PGlite, real migrations,
// as the app's RLS role ).
describe( 'brand', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let brand : typeof import( './brand' )
	const ids : Record<string, string> = {}

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'Acme' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'Bravo' } } )

		const media = ( tenantId : string, kind : 'image' | 'document' ) => t.prisma.media.create( { data: { tenantId, kind, name: 'x', mime: 'image/webp', size: 1 } } ).then( ( row ) => row.id )

		ids.logo = await media( a.id, 'image' )
		ids.favicon = await media( a.id, 'image' )
		ids.pdf = await media( a.id, 'document' )
		ids.theirs = await media( b.id, 'image' )
		await t.asApp()

		brand = await import( './brand' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )

	it( 'has none before anything is saved', async() => {
		expect( await inA( () => brand.loadBrandSetting() ) ).toEqual( { logo: null, favicon: null } )
		expect( await inA( () => brand.loadBrand( async() => a ) ) ).toEqual( { name: 'Acme', logo: null, favicon: null } )
	} )

	it( 'refuses what is not one of this workspace\'s images, writing nothing', async() => {
		expect( await inA( () => brand.saveBrand( { logo: ids.theirs, favicon: null } ) ) ).toBe( 'logo' )
		expect( await inA( () => brand.saveBrand( { logo: ids.logo, favicon: ids.pdf } ) ) ).toBe( 'favicon' )
		expect( await inA( () => brand.loadBrandSetting() ) ).toEqual( { logo: null, favicon: null } )
	} )

	it( 'saves both, makes them public, and hands pages their URLs', async() => {
		expect( await inA( () => brand.saveBrand( { logo: ids.logo, favicon: ids.favicon } ) ) ).toBeNull()

		const shared = await inA( () => t.db.media.findMany( { where: { public: true }, select: { id: true } } ) )

		expect( shared.map( ( row ) => row.id ).sort() ).toEqual( [ ids.logo, ids.favicon ].sort() )
		expect( await inA( () => brand.loadBrand( async() => a ) ) ).toEqual( { name: 'Acme', logo: `/media/${ ids.logo }/thumb`, favicon: `/media/${ ids.favicon }/thumb` } )
	} )

	it( 'forgets a logo whose file is deleted', async() => {
		await inA( () => t.db.media.delete( { where: { id: ids.logo } } ) )

		expect( await inA( () => brand.loadBrandSetting() ) ).toEqual( { logo: null, favicon: ids.favicon } )
	} )

	it( 'is "no brand", not an error, without a tenant', async() => {
		expect( await brand.loadBrand( async() => {
			throw new Error( 'no tenant' )
		} ) ).toBeNull()
	} )
} )
