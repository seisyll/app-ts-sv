import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

const DAY = 86_400_000

// The scheduled jobs against two workspaces ( PGlite, real migrations, as the app's RLS role ).
describe( 'jobs', () => {
	let t : TestDatabase
	let jobs : typeof import( './index' )
	let catalog : typeof import( './catalog' )
	const tenants : TenantRef[] = []

	beforeAll( async() => {
		// No Redis: the lock steps aside and every run goes ahead.
		delete process.env.REDIS_URL
		t = await createTestDatabase()

		for ( const slug of [ 'a', 'b' ] ) {
			const tenant = await t.prisma.tenant.create( { data: { slug, name: slug } } )
			const user = await t.prisma.user.create( { data: { tenantId: tenant.id, name: 'U', email: `u@${ slug }.test` } } )
			const ago = ( days : number ) => new Date( Date.now() - days * DAY )

			tenants.push( tenant )
			await t.prisma.signInEvent.createMany( { data: [ 100, 91, 89, 1 ].map( ( days ) => ( { tenantId: tenant.id, at: ago( days ), email: user.email, outcome: 'success', method: 'password' } ) ) } )
			await t.prisma.session.createMany( { data: [ -1, 1 ].map( ( days, index ) => ( { tenantId: tenant.id, userId: user.id, token: `${ slug }-${ index }`, expiresAt: ago( days ) } ) ) } )
			await t.prisma.verification.create( { data: { tenantId: tenant.id, identifier: 'reset-password:x', value: user.id, expiresAt: ago( 1 ) } } )
		}

		await t.asApp()
		jobs = await import( './index' )
		catalog = await import( './catalog' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const job = ( name : string ) => catalog.JOBS.find( ( candidate ) => candidate.name === name )!
	const left = ( tenant : TenantRef, count : () => Promise<number> ) => t.runWithTenant( tenant, count )

	it( 'purges sign-in attempts past 90 days, in every workspace', async() => {
		expect( await jobs.runJob( job( 'signins.purge' ) ) ).toBe( true )

		for ( const tenant of tenants )
			expect( await left( tenant, () => t.db.signInEvent.count() ) ).toBe( 2 )
	} )

	it( 'removes expired sessions and tokens, and keeps live sessions', async() => {
		await jobs.runJob( job( 'auth.expired' ) )

		for ( const tenant of tenants ) {
			expect( await left( tenant, () => t.db.session.count() ) ).toBe( 1 )
			expect( await left( tenant, () => t.db.verification.count() ) ).toBe( 0 )
		}
	} )

	it( 'keeps each run\'s outcome, a failure included, and says when each runs next', async() => {
		await jobs.runJob( { name: 'broken', label: () => 'Broken', schedule: '0 0 * * *', run: () => Promise.reject( new Error( 'disk full' ) ) } )

		const status = await jobs.jobStatus()
		const broken = await t.prisma.jobRun.findUnique( { where: { name: 'broken' } } )

		expect( status.find( ( row ) => row.name === 'signins.purge' )?.last ).toMatchObject( { ok: true, count: 4 } )
		expect( status.find( ( row ) => row.name === 'auth.expired' )?.last ).toMatchObject( { ok: true, count: 4 } )
		expect( status.every( ( row ) => row.next && Date.parse( row.next ) > Date.now() ) ).toBe( true )
		expect( broken ).toMatchObject( { ok: false, error: 'disk full' } )
	} )
} )
