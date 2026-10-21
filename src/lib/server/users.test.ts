import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PageQuery } from '$lib/components/data-table'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// User administration on the tenant-scoped database ( PGlite, real migrations ), through
// better-auth's admin API as a signed-in admin.
describe( 'users', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let auth : ReturnType<typeof import( './auth' ).createAuth>
	let users : typeof import( './users' )
	let admin : { id : string, headers : Headers }
	let member : { id : string, headers : Headers }

	const query = ( overrides : Partial<PageQuery> = {} ) : PageQuery => ( { skip: 0, take: 10, search: '', searchBy: 'all', filters: {}, ...overrides } )
	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )

	const password = 'correct horse battery'

	// The Cookie header a browser would send back after signing in.
	async function signIn( tenant : TenantRef, email : string ) {
		const { headers } = await t.runWithTenant( tenant, () => auth.api.signInEmail( { body: { email, password }, returnHeaders: true } ) )

		return new Headers( { cookie: headers.getSetCookie().map( ( cookie ) => cookie.split( ';' )[ 0 ] ).join( '; ' ) } )
	}

	async function signUp( tenant : TenantRef, name : string, role = 'member' ) {
		const email = `${ name.toLowerCase() }@example.test`

		await t.runWithTenant( tenant, () => auth.api.signUpEmail( { body: { name, email, password } } ) )
		await t.asOwner()
		const user = await t.prisma.user.update( { where: { tenantId_email: { tenantId: tenant.id, email } }, data: { role } } )
		await t.asApp()

		return { id: user.id, headers: await signIn( tenant, email ) }
	}

	const userIn = async( id : string ) => {
		await t.asOwner()
		const user = await t.prisma.user.findUnique( { where: { id } } )
		await t.asApp()

		return user
	}

	beforeAll( async() => {
		Object.assign( process.env, {
			BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-42',
			BETTER_AUTH_URL   : 'http://localhost:5173',
			TENANCY           : 'single',
			AUTH_SIGNUP       : 'true'
		} )

		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B' } } )
		await t.asApp()

		auth = ( await import( './auth' ) ).createAuth( { cookies: false } )
		users = await import( './users' )

		admin = await signUp( a, 'Ada', 'admin' )
		member = await signUp( a, 'Grace' )
		await signUp( a, 'Linus' )
		await signUp( b, 'Bea' )
		process.env.AUTH_SIGNUP = 'false'
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	it( 'lists the tenant\'s users only, paged with a total', async() => {
		const page = await inA( () => users.listUsers( query( { take: 2 } ) ) )

		expect( page.total ).toBe( 3 )
		expect( page.rows ).toHaveLength( 2 )
		expect( page.rows[ 0 ] ).toMatchObject( { role: expect.any( String ), banned: false, createdAt: expect.any( String ) } )
		expect( page.rows.map( ( row ) => row.email ) ).not.toContain( 'bea@example.test' )
	} )

	it( 'searches, filters by role and sorts', async() => {
		expect( ( await inA( () => users.listUsers( query( { search: 'GRA' } ) ) ) ).rows.map( ( row ) => row.name ) ).toEqual( [ 'Grace' ] )
		expect( ( await inA( () => users.listUsers( query( { filters: { role: [ 'admin' ] } } ) ) ) ).rows.map( ( row ) => row.name ) ).toEqual( [ 'Ada' ] )
		expect( ( await inA( () => users.listUsers( query( { sort: 'name', dir: 'asc' } ) ) ) ).rows.map( ( row ) => row.name ) ).toEqual( [ 'Ada', 'Grace', 'Linus' ] )
	} )

	it( 'adds a user to the admin\'s tenant, with a role, even with sign-up off', async() => {
		await inA( () => users.createUser( auth, admin.headers, { name: 'Ken', email: 'ken@example.test', password, role: 'admin' } ) )

		const page = await inA( () => users.listUsers( query( { search: 'ken' } ) ) )

		expect( page.rows ).toMatchObject( [ { name: 'Ken', role: 'admin' } ] )
	} )

	it( 'changes role, bans and unbans', async() => {
		await inA( () => users.changeUser( auth, admin.headers, admin.id, member.id, { action: 'set-role', role: 'admin' } ) )
		expect( ( await userIn( member.id ) )?.role ).toBe( 'admin' )
		await inA( () => users.changeUser( auth, admin.headers, admin.id, member.id, { action: 'set-role', role: 'member' } ) )

		await inA( () => users.changeUser( auth, admin.headers, admin.id, member.id, { action: 'ban' } ) )
		expect( ( await userIn( member.id ) )?.banned ).toBe( true )
		expect( ( await inA( () => users.listUsers( query( { filters: { status: [ 'banned' ] } } ) ) ) ).rows.map( ( row ) => row.name ) ).toEqual( [ 'Grace' ] )
		// Banning ends their sessions.
		expect( await inA( () => auth.api.getSession( { headers: member.headers } ) ) ).toBeNull()

		await inA( () => users.changeUser( auth, admin.headers, admin.id, member.id, { action: 'unban' } ) )
		expect( ( await userIn( member.id ) )?.banned ).toBe( false )
		expect( ( await inA( () => users.listUsers( query( { filters: { status: [ 'active' ] } } ) ) ) ).total ).toBe( 4 )
	} )

	it( 'refuses changes to your own account', async() => {
		await expect( inA( () => users.changeUser( auth, admin.headers, admin.id, admin.id, { action: 'set-role', role: 'member' } ) ) ).rejects.toMatchObject( { status: 400 } )
		await expect( inA( () => users.deleteUser( auth, admin.headers, admin.id, admin.id ) ) ).rejects.toMatchObject( { status: 400 } )
		expect( ( await userIn( admin.id ) )?.role ).toBe( 'admin' )
	} )

	it( 'leaves a member without user permissions', async() => {
		// The ban ended Grace's earlier session.
		const headers = await signIn( a, 'grace@example.test' )

		await expect( inA( () => users.changeUser( auth, headers, member.id, admin.id, { action: 'ban' } ) ) ).rejects.toThrow()
		expect( ( await userIn( admin.id ) )?.banned ).toBeFalsy()
	} )

	it( 'deletes a user', async() => {
		const linus = ( await inA( () => users.listUsers( query( { search: 'linus' } ) ) ) ).rows[ 0 ]

		await inA( () => users.deleteUser( auth, admin.headers, admin.id, linus.id ) )
		expect( await userIn( linus.id ) ).toBeNull()
	} )

	it( 'cannot reach a user in another tenant', async() => {
		await t.asOwner()
		const bea = await t.prisma.user.findFirstOrThrow( { where: { email: 'bea@example.test' } } )
		await t.asApp()

		await expect( inA( () => users.changeUser( auth, admin.headers, admin.id, bea.id, { action: 'ban' } ) ) ).rejects.toThrow()
		expect( ( await userIn( bea.id ) )?.banned ).toBeFalsy()
	} )
} )
