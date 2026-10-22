import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { vi } from 'vitest'

/* ―― » A real Postgres for server tests, no Docker: PGlite in-process, the REAL migration
        SQL applied verbatim, bridged over TCP so the production client ( src/lib/server/db )
        connects to it unchanged.

        PGlite's session starts as a superuser, which bypasses RLS — proving anything there
        proves nothing. So: create fixtures asOwner(), then asApp() ( SET ROLE app_rls ) for
        the assertions. The pool is pinned to one connection so the role sticks.

        Import modules that use the database AFTER this resolves ( await import(…) ), so they
        bind to the same client instance. */

const MIGRATIONS = path.resolve( 'prisma/migrations' )

const freePort = () => new Promise<number>( ( resolve, reject ) => {
	const probe = createServer()

	probe.unref()
	probe.on( 'error', reject )
	probe.listen( 0, '127.0.0.1', () => {
		const address = probe.address()

		probe.close( () => resolve( typeof address === 'object' && address ? address.port : 0 ) )
	} )
} )

export async function createTestDatabase() {
	const pglite = await PGlite.create()

	for ( const dir of readdirSync( MIGRATIONS, { withFileTypes: true } ).filter( ( entry ) => entry.isDirectory() ).map( ( entry ) => entry.name ).sort() )
		await pglite.exec( readFileSync( path.join( MIGRATIONS, dir, 'migration.sql' ), 'utf8' ) )

	const port = await freePort()
	const server = new PGLiteSocketServer( { db: pglite, port, host: '127.0.0.1' } )

	await server.start()

	process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${ port }/postgres`
	process.env.DATABASE_POOL_MAX = '1'
	vi.resetModules()

	const db = await import( '$lib/server/db' )

	return {
		...db,
		asOwner: () => db.prisma.$executeRawUnsafe( 'RESET ROLE' ),
		asApp  : () => db.prisma.$executeRawUnsafe( 'SET ROLE app_rls' ),
		async close() {
			await db.prisma.$disconnect()
			await server.stop()
			await pglite.close()
		}
	}
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>
