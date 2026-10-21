import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import * as aurora from './aurora'
import type { PublicSite } from '$lib/site'
import { homeContent, siteChrome } from './content'
import type { ThemeModule } from './contract'
import * as plain from './plain'

// Every theme against the same contract: what one theme renders from the content, the
// others must too. Add a theme to this list when you add its folder.
const themes : ThemeModule[] = [ aurora, plain ]

describe.each( themes.map( ( theme ) => [ theme.id, theme ] as const ) )( 'theme %s', ( _, theme ) => {
	it( 'share image: a 1200×630 picture for link previews', async() => {
		const image = new Image()

		image.src = theme.shareImage
		await image.decode()
		expect( [ image.naturalWidth, image.naturalHeight ] ).toEqual( [ 1200, 630 ] )
	} )

	it( 'header: home, the section links, and sign-in while sign-up is off', async() => {
		const { container } = await render( theme.Header, { site: siteChrome( { signUp: false } ) } )

		expect( container.querySelector( 'a[href="/"]' )?.textContent ).toContain( 'App' )
		await expect.element( page.getByRole( 'link', { name: 'Pricing' } ).first() ).toHaveAttribute( 'href', '#pricing' )
		await expect.element( page.getByRole( 'link', { name: 'Sign in' } ).first() ).toHaveAttribute( 'href', '/login' )
		expect( container.querySelector( 'a[href="/signup"]' ) ).toBeNull()
	} )

	it( 'header and footer: the workspace logo, when there is one', async() => {
		const logo = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'
		const site = siteChrome( { signUp: false, logo } )
		const header = await render( theme.Header, { site } )
		const footer = await render( theme.Footer, { site } )

		for ( const { container } of [ header, footer ] )
			expect( container.querySelector( `a[href="/"] img[src="${ logo }"]` ) ).not.toBeNull()
	} )

	it( 'header: sign-up when it is on', async() => {
		await render( theme.Header, { site: siteChrome( { signUp: true } ) } )

		await expect.element( page.getByRole( 'link', { name: 'Get started' } ).first() ).toHaveAttribute( 'href', '/signup' )
	} )

	it( 'home: every section, with the anchors the nav links to', async() => {
		const { container } = await render( theme.Home, { content: homeContent( { signUp: false } ) } )

		await expect.element( page.getByRole( 'heading', { level: 1 } ) ).toHaveTextContent( /Ship your app\s*without\s*limits\./ )

		for ( const id of [ 'features', 'how', 'pricing', 'faq' ] )
			expect( container.querySelector( `#${ id }` ), `#${ id }` ).not.toBeNull()

		await expect.element( page.getByText( '$29' ) ).toBeInTheDocument()
		await expect.element( page.getByText( 'Teams & workspaces' ) ).toBeInTheDocument()
		await expect.element( page.getByText( 'Maya Chen' ) ).toBeInTheDocument()
	} )

	it( 'home: the FAQ keeps one answer open', async() => {
		const { container } = await render( theme.Home, { content: homeContent( { signUp: false } ) } )
		const open = () => [ ...container.querySelectorAll( 'details' ) ].map( ( details ) => details.open )

		expect( open() ).toEqual( [ true, false, false, false, false ] )

		await page.getByText( 'Can I change plans later?' ).click()

		expect( open() ).toEqual( [ false, true, false, false, false ] )
	} )

	it( 'footer: tagline, links and the legal line', async() => {
		await render( theme.Footer, { site: siteChrome( { signUp: true } ) } )

		await expect.element( page.getByText( /Everything a web app needs/ ) ).toBeInTheDocument()
		await expect.element( page.getByRole( 'link', { name: 'Get started' } ) ).toHaveAttribute( 'href', '/signup' )
		await expect.element( page.getByText( `© ${ new Date().getFullYear() } App. All rights reserved.` ) ).toBeInTheDocument()
	} )

	it( 'footer: the workspace tagline, contact, social links and pages', async() => {
		const site : PublicSite = { tagline: 'Tools for makers', email: 'hi@acme.test', phone: '+62 812 3456', social: [ { network: 'github', label: 'GitHub', href: 'https://github.com/acme' } ], pages: [ 'privacy', 'about' ] }

		await render( theme.Footer, { site: siteChrome( { signUp: false, site } ) } )

		await expect.element( page.getByText( 'Tools for makers' ) ).toBeInTheDocument()
		await expect.element( page.getByRole( 'link', { name: 'hi@acme.test' } ) ).toHaveAttribute( 'href', 'mailto:hi@acme.test' )
		await expect.element( page.getByRole( 'link', { name: '+62 812 3456' } ) ).toHaveAttribute( 'href', 'tel:+628123456' )
		await expect.element( page.getByRole( 'link', { name: 'GitHub' } ) ).toHaveAttribute( 'href', 'https://github.com/acme' )
		await expect.element( page.getByRole( 'link', { name: 'Privacy policy' } ) ).toHaveAttribute( 'href', '/privacy' )
		await expect.element( page.getByRole( 'link', { name: 'About' } ) ).toHaveAttribute( 'href', '/about' )
		expect( page.getByRole( 'link', { name: 'Terms of service' } ).elements() ).toHaveLength( 0 )
	} )
} )
