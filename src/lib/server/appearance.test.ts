import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_SETTING } from '$lib/appearance'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// The workspace default and personal overrides on the tenant-scoped database ( PGlite,
// real migrations, as the app's RLS role ).
describe( 'appearance', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let ada : string
	let bea : string
	let appearance : typeof import( './appearance' )

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
		ada = ( await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: 'ada@example.test' } } ) ).id
		bea = ( await t.prisma.user.create( { data: { tenantId: b.id, name: 'Bea', email: 'bea@example.test' } } ) ).id
		await t.asApp()

		appearance = await import( './appearance' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const inB = <T>( fn : () => Promise<T> ) => t.runWithTenant( b, fn )

	it( 'answers the defaults before anything is saved', async() => {
		expect( await inA( () => appearance.loadAppearance( ada ) ) ).toEqual( {
			setting : DEFAULT_SETTING,
			override: { palette: null, style: null, radius: null },
			resolved: { palette: 'neutral', style: 'vega', radius: 'medium' }
		} )
	} )

	it( 'saves the workspace default, and saving again updates the one row', async() => {
		await inA( () => appearance.saveWorkspaceAppearance( { palette: 'blue', style: 'lyra', radius: 'large', allowUserOverride: true } ) )
		await inA( () => appearance.saveWorkspaceAppearance( { palette: 'teal', style: 'lyra', radius: 'large', allowUserOverride: true } ) )

		const state = await inA( () => appearance.loadAppearance( ada ) )

		// Stored as chosen; resolved with Lyra's square corners.
		expect( state.setting ).toEqual( { palette: 'teal', style: 'lyra', radius: 'large', allowUserOverride: true } )
		expect( state.resolved ).toEqual( { palette: 'teal', style: 'lyra', radius: 'none' } )

		await t.asOwner()
		expect( await t.prisma.appearanceSetting.count() ).toBe( 1 )
		await t.asApp()
	} )

	it( 'keeps a person\'s overrides, and ignores them while the workspace forbids them', async() => {
		await inA( () => appearance.saveUserAppearance( ada, { palette: 'rose', style: 'nova', radius: null } ) )
		expect( ( await inA( () => appearance.loadAppearance( ada ) ) ).resolved ).toEqual( { palette: 'rose', style: 'nova', radius: 'large' } )

		await inA( () => appearance.saveWorkspaceAppearance( { palette: 'teal', style: 'lyra', radius: 'large', allowUserOverride: false } ) )

		const state = await inA( () => appearance.loadAppearance( ada ) )

		expect( state.override ).toEqual( { palette: 'rose', style: 'nova', radius: null } )
		expect( state.resolved ).toEqual( { palette: 'teal', style: 'lyra', radius: 'none' } )
	} )

	it( 'keeps each workspace to its own appearance', async() => {
		expect( ( await inB( () => appearance.loadAppearance( bea ) ) ).setting ).toEqual( DEFAULT_SETTING )
		// Another tenant's user is invisible: no override to read.
		expect( ( await inB( () => appearance.loadAppearance( ada ) ) ).override ).toEqual( { palette: null, style: null, radius: null } )
	} )
} )
