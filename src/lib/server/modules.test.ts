import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { TenantRef } from '#lib/server/db/index.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// handleModules with the tenant resolved as hooks.server.ts does, on a shared deployment.
describe( 'handleModules where no workspace resolves', () => {
	let t : TestDatabase
	let db : typeof import( './db' )
	let tenant : typeof import( './tenant' )
	let modules : typeof import( './modules' )
	const saved = { ...process.env }
	const resolve = vi.fn( async() => new Response( 'ok' ) )

	beforeAll( async() => {
		t = await createTestDatabase()
		await t.prisma.tenant.create( { data: { slug: 'quiet', name: 'Quiet', modulesOff: [ 'site' ] } } )
		await t.asApp()
		db = await import( './db' )
		tenant = await import( './tenant' )
		modules = await import( './modules' )
		process.env.TENANCY = 'shared'
		process.env.APP_DOMAIN = 'app.test'
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
		process.env = saved
	} )

	const request = ( id : string, workspace : () => Promise<TenantRef> ) =>
		db.runWithTenant( workspace, () => modules.handleModules( { event: { route: { id } }, resolve } as never ) )
	const at = ( host : string ) => () => tenant.resolveTenant( new URL( `http://${ host }/` ) )

	it( 'serve the public site by the build: the bare domain, and no database yet', async() => {
		expect( await ( await request( '/(site)', at( 'app.test' ) ) ).text() ).toBe( 'ok' )
		expect( await ( await request( '/(site)', () => Promise.reject( new Error( 'connect ECONNREFUSED 127.0.0.1:5432' ) ) ) ).text() ).toBe( 'ok' )
	} )

	it( 'still close it for a workspace that switched it off', async() => {
		await expect( request( '/(site)', at( 'quiet.app.test' ) ) ).rejects.toMatchObject( { status: 307, location: '/app' } )
	} )
} )
