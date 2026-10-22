import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { monthWindow } from '#lib/months.js'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// The dashboard's reads on the tenant-scoped database ( PGlite, real migrations, as the app's
// RLS role ): this workspace's figures only, and a dash rather than a zero when one fails.
describe( 'dashboard', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let ada : string
	let dashboard : typeof import( './dashboard' )

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )

		const user = ( tenantId : string, email : string, data : object = {} ) => t.prisma.user.create( { data: { tenantId, name: email, email, ...data } } )
		const account = ( tenantId : string, userId : string ) => t.prisma.account.create( { data: { tenantId, userId, providerId: 'credential', accountId: userId } } )

		ada = ( await user( a.id, 'ada@a.test', { role: 'admin', createdAt: new Date( '2026-09-10T00:00:00Z' ) } ) ).id
		await account( a.id, ada )
		await account( a.id, ( await user( a.id, 'bob@a.test', { createdAt: new Date( '2026-10-02T00:00:00Z' ) } ) ).id )
		await user( a.id, 'cy@a.test', { createdAt: new Date( '2026-10-05T00:00:00Z' ) } )
		await account( a.id, ( await user( a.id, 'dee@a.test', { banned: true, createdAt: new Date( '2026-10-06T00:00:00Z' ) } ) ).id )
		await user( b.id, 'zed@b.test' )
		await t.prisma.media.create( { data: { tenantId: a.id, kind: 'image', name: 'x', mime: 'image/webp', size: 1_000 } } )
		await t.prisma.media.create( { data: { tenantId: a.id, kind: 'document', name: 'y', mime: 'application/pdf', size: 500 } } )
		await t.asApp()

		dashboard = await import( './dashboard' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const october = monthWindow( 2026, 10 )

	it( 'counts this workspace\'s people as the users table filters them', async() => {
		const { people } = await t.runWithTenant( a, () => dashboard.loadDashboard( ada, october, { people: true } ) )

		expect( people ).toEqual( { active: 1 + 1, invited: 1, banned: 1, admins: 1, members: 3 } )
	} )

	it( 'buckets sign-ups by calendar month, quiet months included', async() => {
		const { signups } = await t.runWithTenant( a, () => dashboard.loadDashboard( ada, october ) )

		expect( signups?.map( ( row ) => row.month ) ).toEqual( [ '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10' ] )
		expect( signups?.map( ( row ) => row.count ) ).toEqual( [ 0, 0, 0, 0, 1, 3 ] )
	} )

	it( 'sums files by kind, and leaves people out unless asked', async() => {
		const result = await t.runWithTenant( a, () => dashboard.loadDashboard( ada, october ) )

		expect( result.people ).toBeUndefined()
		expect( result.media ).toEqual( { images: 1, documents: 1, bytes: 1_500 } )
		expect( result.unread ).toBe( 0 )
	} )

	it( 'gives a failed read as null, and the rest still', async() => {
		const spy = vi.spyOn( ( await import( '#lib/server/log.js' ) ).log, 'error' )
		const result = await t.runWithTenant( a, async() => {
			vi.spyOn( t.db.media, 'groupBy' ).mockRejectedValueOnce( new Error( 'down' ) )

			return dashboard.loadDashboard( ada, october )
		} )

		expect( result.media ).toBeNull()
		expect( result.signups ).toHaveLength( 6 )
		spy.mockRestore()
	} )
} )
