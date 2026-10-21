import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { relativeTime } from '$lib/notifications'
import { renderNotification } from './catalog'

describe( 'renderNotification', () => {
	it( 'renders a known type in the reader\'s words', () => {
		expect( renderNotification( 'user.joined', { name: 'Ada', email: 'ada@example.test' } ) ).toEqual( { title: 'Ada joined the workspace', body: 'ada@example.test', href: '/app/users' } )
		expect( renderNotification( 'role.changed', { role: 'admin', by: 'Grace' } ).title ).toBe( 'You\'re now Admin' )
	} )

	it( 'degrades a renamed type or broken params to a plain notification, never throws', () => {
		expect( renderNotification( 'invoice.paid', {} ) ).toEqual( { title: 'Notification', body: null, href: null } )
		expect( renderNotification( 'user.joined', { name: 42 } ).title ).toBe( 'Notification' )
	} )
} )

describe( 'relativeTime', () => {
	const now = Date.parse( '2026-10-21T12:00:00Z' )

	it( 'says how long ago, then the date after a week', () => {
		expect( relativeTime( '2026-10-21T11:59:50Z', now ) ).toBe( 'now' )
		expect( relativeTime( '2026-10-21T11:55:00Z', now ) ).toBe( '5 minutes ago' )
		expect( relativeTime( '2026-10-21T09:00:00Z', now ) ).toBe( '3 hours ago' )
		expect( relativeTime( '2026-10-20T12:00:00Z', now ) ).toBe( 'yesterday' )
		expect( relativeTime( '2026-10-01T12:00:00Z', now ) ).toBe( 'Oct 1, 2026' )
		expect( relativeTime( 'nonsense', now ) ).toBe( '' )
	} )
} )

// The service on the tenant-scoped database ( PGlite, real migrations ).
describe( 'notifications', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	const users : Record<string, string> = {}
	let service : typeof import( './index' )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const inB = <T>( fn : () => Promise<T> ) => t.runWithTenant( b, fn )

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )

		for ( const [ name, tenant, role ] of [ [ 'ada', a, 'admin' ], [ 'alan', a, 'member,admin' ], [ 'mia', a, 'member' ], [ 'bea', b, 'admin' ] ] as const )
			users[ name ] = ( await t.prisma.user.create( { data: { tenantId: tenant.id, name, email: `${ name }@example.test`, role } } ) ).id

		await t.asApp()
		service = await import( './index' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	it( 'fans one event out to a role ( comma-separated roles included ), minus whoever acted', async() => {
		await inA( () => service.notify( { type: 'user.joined', params: { name: 'Mia', email: 'mia@example.test' }, to: { roles: [ 'admin' ], except: [ users.ada ] } } ) )

		expect( ( await inA( () => service.listNotifications( users.alan ) ) ).items.map( ( item ) => item.title ) ).toEqual( [ 'Mia joined the workspace' ] )
		expect( ( await inA( () => service.listNotifications( users.ada ) ) ).unread ).toBe( 0 )
		expect( ( await inA( () => service.listNotifications( users.mia ) ) ).unread ).toBe( 0 )

		await t.asOwner()
		expect( await t.prisma.notificationEvent.count() ).toBe( 1 )
		await t.asApp()
	} )

	it( 'reaches named users once, and skips anyone who turned the type off', async() => {
		await inA( () => service.setPreferences( users.alan, { 'role.changed': false, 'not.a.type': false } ) )
		await inA( () => service.notify( { type: 'role.changed', params: { role: 'admin', by: 'Ada' }, to: { users: [ users.mia, users.mia, users.alan, null ] } } ) )

		expect( ( await inA( () => service.listNotifications( users.mia ) ) ).items ).toMatchObject( [ { type: 'role.changed', title: 'You\'re now Admin', body: 'Changed by Ada', readAt: null } ] )
		expect( ( await inA( () => service.listNotifications( users.alan ) ) ).items.map( ( item ) => item.type ) ).not.toContain( 'role.changed' )
		expect( ( await inA( () => service.listPreferences( users.alan ) ) ).map( ( preference ) => [ preference.type, preference.enabled ] ) ).toEqual( [ [ 'user.joined', true ], [ 'role.changed', false ] ] )
	} )

	it( 'never throws, and writes nothing, for params that don\'t fit', async() => {
		const log = vi.spyOn( console, 'error' ).mockImplementation( () => {} )

		await expect( inA( () => service.notify( { type: 'user.joined', params: { name: 1 } as never, to: { users: [ users.mia ] } } ) ) ).resolves.toBeUndefined()
		expect( log ).toHaveBeenCalled()
		expect( ( await inA( () => service.listNotifications( users.mia ) ) ).items ).toHaveLength( 1 )
		log.mockRestore()
	} )

	it( 'marks only the reader\'s own notifications read', async() => {
		const [ mine ] = ( await inA( () => service.listNotifications( users.mia ) ) ).items
		const [ alans ] = ( await inA( () => service.listNotifications( users.alan ) ) ).items

		// Someone else's id matches nothing.
		expect( await inA( () => service.markRead( users.mia, [ alans.id ] ) ) ).toBe( 0 )
		expect( await inA( () => service.markRead( users.mia, [ mine.id ] ) ) ).toBe( 1 )
		expect( ( await inA( () => service.listNotifications( users.mia ) ) ) ).toMatchObject( { unread: 0, items: [ { readAt: expect.any( String ) } ] } )
		expect( ( await inA( () => service.listNotifications( users.alan ) ) ).unread ).toBe( 1 )
		expect( await inA( () => service.markRead( users.alan ) ) ).toBe( 1 )
	} )

	it( 'keeps every workspace to itself', async() => {
		await inB( () => service.notify( { type: 'user.joined', params: { name: 'X', email: 'x@example.test' }, to: { roles: [ 'admin' ], users: [ users.ada ] } } ) )

		// B's admin hears; A's admin, named from B, is invisible there and gets nothing.
		expect( ( await inB( () => service.listNotifications( users.bea ) ) ).unread ).toBe( 1 )
		expect( ( await inA( () => service.listNotifications( users.ada ) ) ).items ).toHaveLength( 0 )
		expect( ( await inB( () => service.listNotifications( users.alan ) ) ).items ).toHaveLength( 0 )

		// Not even a hidden row: the other tenant's user was dropped before the insert.
		await t.asOwner()
		expect( await t.prisma.notificationRecipient.count( { where: { userId: users.ada, tenantId: b.id } } ) ).toBe( 0 )
		await t.asApp()
	} )
} )
