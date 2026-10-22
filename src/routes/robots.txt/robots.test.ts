import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '#lib/test/database.js'

// What crawlers are told on a host ( PGlite, real migrations ).
describe( 'robots.txt and sitemap.xml', () => {
	let t : TestDatabase
	let robots : () => Promise<string>
	let sitemap : () => Promise<string>

	beforeAll( async() => {
		t = await createTestDatabase()
		const a = await t.prisma.tenant.create( { data: { slug: 'a', name: 'A' } } )

		await t.prisma.sitePage.create( { data: { tenantId: a.id, key: 'privacy', locale: 'en', body: { type: 'doc', content: [] } } } )
		await t.asApp()

		const url = new URL( 'https://acme.test/' )
		const robotsRoute = await import( './+server' )
		const sitemapRoute = await import( '../(site)/sitemap.xml/+server' )

		robots = () => ( robotsRoute.GET as ( event : unknown ) => Response )( { url } ).text()
		sitemap = () => t.runWithTenant( a, () => ( sitemapRoute.GET as ( event : unknown ) => Promise<Response> )( { url } ) ).then( ( response ) => response.text() )
	}, 60_000 )

	afterAll( async() => {
		delete process.env.SEO_INDEX
		await t?.close()
	} )

	it( 'keeps crawlers out of the app and points them at the sitemap', async() => {
		expect( await robots() ).toBe( 'User-agent: *\nDisallow: /app\nDisallow: /api\n\nSitemap: https://acme.test/sitemap.xml\n' )
	} )

	it( 'keeps them out of everything on a staging copy', async() => {
		process.env.SEO_INDEX = 'false'
		expect( await robots() ).toBe( 'User-agent: *\nDisallow: /\n' )
		delete process.env.SEO_INDEX
	} )

	it( 'lists home and the published pages of this host\'s workspace', async() => {
		const xml = await sitemap()

		expect( [ ...xml.matchAll( /<loc>([^<]+)<\/loc>/g ) ].map( ( match ) => match[ 1 ] ) ).toEqual( [ 'https://acme.test/', 'https://acme.test/privacy' ] )
	} )
} )
