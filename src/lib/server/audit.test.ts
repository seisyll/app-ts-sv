import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { RequestEvent } from '@sveltejs/kit'
import type { PageQuery } from '$lib/components/data-table'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { changesBetween } from './audit'

describe( 'changesBetween', () => {
	it( 'keeps only what changed, and never a secret\'s value', () => {
		expect( changesBetween( { role: 'member', name: 'Ada', password: 'x' }, { role: 'admin', name: 'Ada', password: 'hunter2' }, { secret: [ 'password' ] } ) ).toEqual( { role: [ 'member', 'admin' ], password: null } )
		expect( changesBetween( null, { secret: '' }, { secret: [ 'secret' ] } ) ).toEqual( {} )
		expect( changesBetween( { tags: [ 'a' ] }, { tags: [ 'a' ] } ) ).toEqual( {} )
	} )
} )

// The trail on the tenant-scoped database ( PGlite, real migrations, as the app's RLS role ).
describe( 'audit', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let ada : { id : string, name : string }
	let service : typeof import( './audit' )

	const event = ( user : { id : string, name : string } | null ) => ( {
		locals            : { session: async() => ( user ? { user, session: {} } : null ) },
		getClientAddress  : () => '203.0.113.9'
	} ) as unknown as RequestEvent
	const all : PageQuery = { skip: 0, take: 50, search: '', searchBy: 'all', filters: {} }

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
		ada = await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: 'ada@a.test' }, select: { id: true, name: true } } )
		await t.asApp()

		service = await import( './audit' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )

	it( 'records who did what, to what, from where', async() => {
		await inA( () => service.audit( event( ada ), { action: 'user.role', target: { id: 'u1', label: 'Bob <bob@a.test>' }, changes: { role: [ 'member', 'admin' ] } } ) )
		await inA( () => service.audit( event( null ), { action: 'user.signup', actor: { id: null, name: 'Cy' } } ) )

		const { rows, total } = await inA( () => service.listAudit( all ) )

		expect( total ).toBe( 2 )
		expect( rows ).toMatchObject( [
			{ actorName: 'Cy', action: 'user.signup', changes: null },
			{ actorId: ada.id, actorName: 'Ada', action: 'user.role', target: 'Bob <bob@a.test>', changes: { role: [ 'member', 'admin' ] }, ip: '203.0.113.9' }
		] )
		expect( ( await t.runWithTenant( b, () => service.listAudit( all ) ) ).total ).toBe( 0 )
	} )

	it( 'filters by area', async() => {
		await inA( () => service.audit( event( ada ), { action: 'media.upload', target: { label: 'x.png' } } ) )

		const { rows } = await inA( () => service.listAudit( { ...all, filters: { resource: [ 'media' ] } } ) )

		expect( rows.map( ( row ) => row.action ) ).toEqual( [ 'media.upload' ] )
	} )

	it( 'is append-only for the app: no update, no delete', async() => {
		await expect( inA( () => t.db.auditLog.updateMany( { data: { actorName: 'Mallory' } } ) ) ).rejects.toThrow()
		await expect( inA( () => t.db.auditLog.deleteMany() ) ).rejects.toThrow()
	} )

	it( 'keeps the actor\'s name after their account is gone', async() => {
		await t.asOwner()
		await t.prisma.user.delete( { where: { id: ada.id } } )
		await t.asApp()

		const { rows } = await inA( () => service.listAudit( { ...all, filters: { resource: [ 'media' ] } } ) )

		expect( rows[ 0 ] ).toMatchObject( { actorId: null, actorName: 'Ada' } )
	} )

	it( 'never fails the change it describes', async() => {
		const error = vi.spyOn( console, 'error' ).mockImplementation( () => {} )

		await expect( inA( () => service.audit( { locals: { session: async() => { throw new Error( 'down' ) } } } as never, { action: 'account.password' } ) ) ).resolves.toBeUndefined()
		expect( error ).toHaveBeenCalled()
		error.mockRestore()
	} )
} )
