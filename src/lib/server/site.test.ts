import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { RichText } from '#lib/editor/schema.js'
import type { TenantRef } from '#lib/server/db/index.js'
import type { SiteSettingsInput } from '#lib/site.js'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

const doc = ( text : string, src ?: string ) : RichText => ( {
	type   : 'doc',
	content: [ { type: 'paragraph', content: [ { type: 'text', text } ] }, ...( src ? [ { type: 'image', attrs: { src } } ] : [] ) ]
} )

const blank = { x: '', facebook: '', instagram: '', linkedin: '', youtube: '', whatsapp: '', github: '' }

// The public site's details and pages on the tenant-scoped database ( PGlite, real
// migrations, as the app's RLS role ).
describe( 'site', () => {
	let t : TestDatabase
	let a : TenantRef
	let b : TenantRef
	let site : typeof import( './site' )
	// The runtime site.ts sees: the test database resets the module registry.
	let runtime : typeof import( '#lib/paraglide/runtime.js' )
	const ids : Record<string, string> = {}

	beforeAll( async() => {
		t = await createTestDatabase()
		a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'Acme' } } )
		b = await t.prisma.tenant.create( { data: { slug: 'b', name: 'Bravo' } } )

		const media = ( tenantId : string ) => t.prisma.media.create( { data: { tenantId, kind: 'image', name: 'x', mime: 'image/webp', size: 1 } } ).then( ( row ) => row.id )

		ids.ours = await media( a.id )
		ids.theirs = await media( b.id )
		await t.asApp()

		site = await import( './site' )
		runtime = await import( '#lib/paraglide/runtime.js' )
	}, 60_000 )

	afterAll( async() => {
		await t?.close()
	} )

	const inA = <T>( fn : () => Promise<T> ) => t.runWithTenant( a, fn )
	const inB = <T>( fn : () => Promise<T> ) => t.runWithTenant( b, fn )

	it( 'saves the footer\'s details with blanks as nothing, for this workspace only', async() => {
		const input : SiteSettingsInput = { tagline: 'Tools for makers', email: 'hi@acme.test', phone: '', links: { ...blank, github: 'https://github.com/acme' } }

		await inA( () => site.saveSiteSetting( input ) )

		expect( await inA( () => site.loadSiteSetting() ) ).toEqual( input )
		expect( await inA( () => t.db.siteSetting.findFirst( { select: { phone: true, links: true } } ) ) ).toEqual( { phone: null, links: { github: 'https://github.com/acme' } } )
		expect( await inB( () => site.loadSiteSetting() ) ).toEqual( { tagline: '', email: '', phone: '', links: blank } )
	} )

	it( 'publishes a page, its own images with it, and nobody else\'s', async() => {
		const body = doc( 'We keep your data safe.', `/media/${ ids.ours }` )

		expect( await inA( () => site.saveSitePage( 'privacy', body ) ) ).toBe( 'saved' )
		expect( await inA( () => site.saveSitePage( 'terms', doc( 'Be nice.', `/media/${ ids.theirs }/thumb` ) ) ) ).toBe( 'saved' )

		const shared = ( fn : typeof inA ) => fn( () => t.db.media.findMany( { where: { public: true }, select: { id: true } } ) ).then( ( rows ) => rows.map( ( row ) => row.id ) )

		expect( await shared( inA ) ).toEqual( [ ids.ours ] )
		expect( await shared( inB ) ).toEqual( [] )
		expect( await inA( () => site.loadSitePage( 'privacy' ) ) ).toMatchObject( body )
		expect( await inB( () => site.loadSitePage( 'privacy' ) ) ).toBeNull()
	} )

	it( 'reads a page in the visitor\'s language, else another one', async() => {
		const english = runtime.getLocale

		runtime.overwriteGetLocale( () => 'id' )
		await inA( () => site.saveSitePage( 'privacy', doc( 'Data Anda aman.' ) ) )
		runtime.overwriteGetLocale( english )

		// Stored documents come back normalised ( every attribute spelled out ), hence toMatchObject.
		expect( await inA( () => site.loadSitePage( 'privacy', 'id' ) ) ).toMatchObject( doc( 'Data Anda aman.' ) )
		expect( await inA( () => site.loadSitePage( 'privacy', 'en' ) ) ).toMatchObject( doc( 'We keep your data safe.', `/media/${ ids.ours }` ) )
		expect( await inA( () => site.loadSitePage( 'terms', 'id' ) ) ).toMatchObject( doc( 'Be nice.', `/media/${ ids.theirs }/thumb` ) )
		expect( await inA( () => site.loadSitePageDraft( 'terms' ) ) ).not.toBeNull()
	} )

	it( 'takes a page down when it is saved empty', async() => {
		expect( await inA( () => site.saveSitePage( 'terms', { type: 'doc', content: [ { type: 'paragraph' } ] } ) ) ).toBe( 'removed' )
		expect( await inA( () => site.writtenSitePages() ) ).toEqual( [ 'privacy' ] )
	} )

	it( 'hands the public site its details and pages, or null without a workspace', async() => {
		expect( await inA( () => site.loadPublicSite() ) ).toEqual( {
			tagline: 'Tools for makers',
			email  : 'hi@acme.test',
			phone  : null,
			social : [ { network: 'github', label: 'GitHub', href: 'https://github.com/acme' } ],
			pages  : [ 'privacy' ]
		} )
		expect( await site.loadPublicSite() ).toBeNull()
	} )
} )
