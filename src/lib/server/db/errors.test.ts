import { describe, expect, it, vi } from 'vitest'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'
import { isForeignKeyViolation, isRestrictViolation, isUniqueViolation, withUniqueRetry } from './errors'

/* ―― » One refused write per database: PGlite serves a single connection, and a failed
        statement closes it — the next query in that database would only say so. */
async function refused( write : ( t : TestDatabase ) => Promise<unknown> ) {
	const t = await createTestDatabase()

	try {
		await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )

		return await write( t ).then( () => null, ( caught ) => caught )
	} finally {
		await t.close().catch( () => {} )
	}
}

describe( 'Prisma errors, as the driver adapter raises them', () => {
	it( 'knows a taken unique value', async() => {
		const taken = await refused( ( t ) => t.prisma.tenant.create( { data: { slug: 'a', name: 'Again' } } ) )

		expect( [ isUniqueViolation( taken ), isForeignKeyViolation( taken ) ] ).toEqual( [ true, false ] )
	}, 60_000 )

	it( 'knows a missing parent', async() => {
		const orphan = await refused( ( t ) => t.prisma.user.create( { data: { tenantId: crypto.randomUUID(), name: 'X', email: 'x@example.test' } } ) )

		expect( [ isUniqueViolation( orphan ), isForeignKeyViolation( orphan ) ] ).toEqual( [ false, true ] )
	}, 60_000 )

	it( 'knows a refused delete by its code or by the words Postgres uses', () => {
		expect( isRestrictViolation( { code: 'P2039' } ) ).toBe( true )
		expect( isRestrictViolation( new Error( 'update or delete on table "a" violates RESTRICT setting of foreign key constraint' ) ) ).toBe( true )
		expect( isRestrictViolation( { code: 'P2003' } ) ).toBe( false )
		expect( isRestrictViolation( null ) ).toBe( false )
	} )
} )

describe( 'withUniqueRetry', () => {
	const collision = { code: 'P2002' }

	it( 'tries again after a lost race, and stops once it wins', async() => {
		const run = vi.fn().mockRejectedValueOnce( collision ).mockRejectedValueOnce( collision ).mockResolvedValue( 'won' )

		await expect( withUniqueRetry( run ) ).resolves.toBe( 'won' )
		expect( run ).toHaveBeenCalledTimes( 3 )
	} )

	it( 'gives up with the duplicate, and never retries anything else', async() => {
		const always = vi.fn().mockRejectedValue( collision )
		const other = vi.fn().mockRejectedValue( new Error( 'down' ) )

		await expect( withUniqueRetry( always, 3 ) ).rejects.toBe( collision )
		expect( always ).toHaveBeenCalledTimes( 3 )
		await expect( withUniqueRetry( other ) ).rejects.toThrow( 'down' )
		expect( other ).toHaveBeenCalledTimes( 1 )
	} )
} )
