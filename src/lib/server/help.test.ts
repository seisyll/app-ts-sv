import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TenantRef } from '$lib/server/db'
import { createTestDatabase, type TestDatabase } from '$lib/test/database'

// The help centre against two workspaces, one with mail off ( PGlite, real migrations ).
describe( 'help', () => {
	let t : TestDatabase
	let help : typeof import( './help' )
	let runtime : typeof import( '$lib/paraglide/runtime' )
	let everything : TenantRef
	let noMail : TenantRef

	beforeAll( async() => {
		t = await createTestDatabase()
		everything = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )
		noMail = await t.prisma.tenant.create( { data: { slug: 'b', name: 'B', modulesOff: [ 'mail' ] } } )
		await t.asApp()
		help = await import( './help' )
		runtime = await import( '$lib/paraglide/runtime' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	it( 'lists what the workspace has on, with each article\'s title and opening words', async() => {
		const all = await t.runWithTenant( everything, () => help.helpList() )
		const some = await t.runWithTenant( noMail, () => help.helpList() )

		expect( all.map( ( article ) => article.id ) ).toEqual( [ 'invite-people', 'email-setup', 'sign-in-protection' ] )
		expect( some.map( ( article ) => article.id ) ).toEqual( [ 'invite-people', 'sign-in-protection' ] )
		expect( all[ 0 ] ).toMatchObject( { category: 'people', title: 'Adding people to your workspace' } )
		expect( all[ 0 ].summary ).toMatch( /^Admins add people from Users,/ )
	} )

	it( 'renders an article to HTML, in the reader\'s language', async() => {
		const english = runtime.getLocale

		const article = await t.runWithTenant( everything, () => help.helpArticle( 'email-setup' ) )

		runtime.overwriteGetLocale( () => 'id' )
		const indonesian = await t.runWithTenant( everything, () => help.helpArticle( 'email-setup' ) )
		runtime.overwriteGetLocale( english )

		expect( article?.title ).toBe( 'Setting up email' )
		expect( article?.html ).toContain( '<h2>Connect a mail server</h2>' )
		expect( indonesian?.title ).toBe( 'Menyiapkan email' )
	} )

	it( 'has nothing for an unknown article, or one whose module is off here', async() => {
		expect( await t.runWithTenant( everything, () => help.helpArticle( 'nope' ) ) ).toBeNull()
		expect( await t.runWithTenant( noMail, () => help.helpArticle( 'email-setup' ) ) ).toBeNull()
	} )
} )
