import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// The sign-in log's reads ( PGlite, real migrations, as the app's RLS role ).
describe( 'sign-ins', () => {
	let t : TestDatabase
	let a : TenantRef
	let ada : string
	let log : typeof import( './sign-ins' )

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		ada = ( await t.prisma.user.create( { data: { tenantId: a.id, name: 'Ada', email: 'ada@a.test' } } ) ).id

		const event = ( outcome : string, hoursAgo : number, method = 'password', email = 'ada@a.test' ) => t.prisma.signInEvent.create( { data: {
			tenantId: a.id, email, outcome, method, userId: email === 'ada@a.test' ? ada : null, ip: `10.0.0.${ hoursAgo }`, at: new Date( Date.UTC( 2026, 9, 21, 12 ) - hoursAgo * 3_600_000 )
		} } )

		await event( 'success', 1 )
		await event( 'wrong-password', 2 )
		await event( 'wrong-password', 3, 'password', 'nobody@a.test' )
		await event( 'success', 30, 'google' )
		await t.asApp()

		log = await import( './sign-ins' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )

	it( 'lists and filters attempts, newest first', async() => {
		const all = await inA( () => log.listSignIns( { skip: 0, take: 10, search: '', searchBy: 'all', filters: {} } ) )

		expect( all.total ).toBe( 4 )
		expect( all.rows[ 0 ] ).toMatchObject( { outcome: 'success', name: 'Ada' } )
		expect( ( await inA( () => log.listSignIns( { skip: 0, take: 10, search: '', searchBy: 'all', filters: { outcome: [ 'wrong-password' ] } } ) ) ).total ).toBe( 2 )
		expect( ( await inA( () => log.listSignIns( { skip: 0, take: 10, search: 'nobody', searchBy: 'all', filters: {} } ) ) ).total ).toBe( 1 )
	} )

	it( 'shows a person the attempts on their own account only', async() => {
		expect( ( await inA( () => log.mySignIns( ada ) ) ).map( ( row ) => row.outcome ) ).toEqual( [ 'success', 'wrong-password', 'success' ] )
	} )

	it( 'counts the last day and buckets the fortnight by calendar day', async() => {
		const stats = await inA( () => log.signInStats( new Date( Date.UTC( 2026, 9, 21, 12 ) ) ) )

		expect( stats ).toMatchObject( { ok: 1, refused: 2, addresses: 2 } )
		expect( stats.daily ).toHaveLength( 14 )
		expect( stats.daily.at( -1 ) ).toEqual( { day: '2026-10-21', success: 1, failed: 2 } )
		expect( stats.daily.at( -2 ) ).toEqual( { day: '2026-10-20', success: 1, failed: 0 } )
	} )
} )
