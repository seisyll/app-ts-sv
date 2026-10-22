import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'
import type { TenantRef } from './client'

// Tables the app may READ without a tenant_id ( and never write ). Anything else without a
// tenant_id must be invisible to the app. Adding to this list is a security decision.
const CONTROL_PLANE = [ 'tenants' ]
// Deployment-wide bookkeeping the app writes, which holds no workspace's data: the scheduled
// jobs' last runs ( src/lib/server/jobs ). Also a security decision.
const BOOKKEEPING = [ 'job_runs' ]

describe( 'row-level security', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	beforeEach( async() => {
		await t.asOwner()
		await t.prisma.$executeRawUnsafe( 'TRUNCATE users CASCADE' )
		await t.asApp()
	} )

	it( 'isolates every table with a tenant_id, and exposes nothing else but the control plane', async() => {
		await t.asOwner()

		const tables = await t.prisma.$queryRaw<{ name : string, scoped : boolean, rls : boolean, forced : boolean, policy : boolean, readable : boolean, writable : boolean }[]>`
			SELECT c.relname AS name,
				EXISTS ( SELECT 1 FROM information_schema.columns col WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'tenant_id' ) AS scoped,
				c.relrowsecurity AS rls,
				c.relforcerowsecurity AS forced,
				EXISTS ( SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = 'tenant_isolation' ) AS policy,
				has_table_privilege( 'app_rls', c.oid, 'SELECT' ) AS readable,
				has_table_privilege( 'app_rls', c.oid, 'INSERT' ) AS writable
			FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'public' AND c.relkind = 'r'`

		expect( tables.length ).toBeGreaterThan( 1 )

		for ( const table of tables ) {
			if ( table.scoped )
				expect( table, `${ table.name }: run SELECT app_enable_tenant_rls( '${ table.name }' ) in its migration` ).toMatchObject( { rls: true, forced: true, policy: true } )
			else if ( CONTROL_PLANE.includes( table.name ) )
				expect( table, `${ table.name } must be read-only for the app` ).toMatchObject( { readable: true, writable: false } )
			else if ( BOOKKEEPING.includes( table.name ) )
				expect( table, `${ table.name } is the app's own bookkeeping` ).toMatchObject( { readable: true, writable: true } )
			else
				expect( table, `${ table.name } has no tenant_id: the app must not be able to read it` ).toMatchObject( { readable: false } )
		}
	} )

	it( 'stamps inserts with the scope\'s tenant and shows each tenant only its own rows', async() => {
		await t.runWithTenant( a, () => t.db.user.create( { data: { name: 'Ada', email: 'ada@a.test' } } ) )
		await t.runWithTenant( b, () => t.db.user.create( { data: { name: 'Bob', email: 'bob@b.test' } } ) )

		const seenByA = await t.runWithTenant( a, () => t.db.user.findMany() )
		const seenByB = await t.runWithTenant( b, () => t.db.user.findMany() )

		expect( seenByA.map( ( user ) => [ user.name, user.tenantId ] ) ).toEqual( [ [ 'Ada', a.id ] ] )
		expect( seenByB.map( ( user ) => user.name ) ).toEqual( [ 'Bob' ] )
	} )

	it( 'allows one email once per tenant', async() => {
		const ada = { data: { name: 'Ada', email: 'ada@example.test' } }

		await t.runWithTenant( a, () => t.db.user.create( ada ) )
		await t.runWithTenant( b, () => t.db.user.create( ada ) )

		await expect( t.runWithTenant( a, () => t.db.user.create( ada ) ) ).rejects.toMatchObject( { code: 'P2002' } )
	} )

	it( 'fails closed: no tenant set reads nothing, and a row for another tenant is refused', async() => {
		await t.runWithTenant( a, () => t.db.user.create( { data: { name: 'Ada', email: 'ada@a.test' } } ) )

		const [ { count } ] = await t.prisma.$queryRaw<{ count : bigint }[]>`SELECT count(*) FROM users`

		expect( count ).toBe( 0n )

		await expect( t.runWithTenant( a, () => t.tenantTransaction( ( tx ) =>
			tx.user.create( { data: { name: 'Mallory', email: 'm@b.test', tenantId: b.id } } ) ) ) ).rejects.toThrow( /row-level security/i )
	} )

	it( 'refuses to run a query outside any tenant scope', async() => {
		await expect( t.db.user.findMany() ).rejects.toThrow( /No tenant in scope/ )
	} )

	// No-write is asserted by the privilege check above: attempting it here would make the
	// pool drop PGlite's single connection.
	it( 'lets the app read tenants', async() => {
		expect( await t.prisma.tenant.count() ).toBe( 2 )
	} )

	it( 'refuses to run as a role that bypasses RLS', async() => {
		await expect( t.assertRlsRole() ).resolves.toBeUndefined()

		await t.asOwner()
		await expect( t.assertRlsRole() ).rejects.toThrow( /Unsafe database role/ )
	} )
} )
