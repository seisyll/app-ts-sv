import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { page } from '$app/state'
import Seo from './Seo.svelte'

const tag = ( selector : string, attribute = 'content' ) => document.head.querySelector( selector )?.getAttribute( attribute )

describe( 'Seo', () => {
	afterEach( () => {
		document.head.querySelectorAll( 'meta, link[rel=canonical], script[type="application/ld+json"]' ).forEach( ( element ) => element.remove() )
	} )

	it( 'writes the title, description, canonical URL and previews, with absolute URLs', async() => {
		await render( Seo, { title: 'Pricing · Acme', description: 'Three plans.', siteName: 'Acme', image: '/share.png', canonical: '/pricing' } )

		expect( document.title ).toBe( 'Pricing · Acme' )
		expect( tag( 'meta[name=description]' ) ).toBe( 'Three plans.' )
		// On the request's origin ( page.url ), whatever host it is.
		expect( tag( 'link[rel=canonical]', 'href' ) ).toBe( new URL( '/pricing', page.url.origin ).href )
		expect( tag( 'meta[property="og:image"]' ) ).toBe( new URL( '/share.png', page.url.origin ).href )
		expect( tag( 'meta[property="og:site_name"]' ) ).toBe( 'Acme' )
		expect( tag( 'meta[name="twitter:card"]' ) ).toBe( 'summary_large_image' )
	} )

	it( 'keeps JSON-LD inside its script tag, whatever the data says', async() => {
		await render( Seo, { title: 'X', jsonLd: { '@type': 'WebPage', name: '</script><script>alert(1)</script>' } } )

		const scripts = document.head.querySelectorAll( 'script[type="application/ld+json"]' )

		expect( scripts ).toHaveLength( 1 )
		expect( JSON.parse( scripts[ 0 ].textContent ?? '' ).name ).toBe( '</script><script>alert(1)</script>' )
		expect( tag( 'meta[name="twitter:card"]' ) ).toBe( 'summary' )
	} )
} )
