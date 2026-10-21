import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import RichEditor from './RichEditor.svelte'
import RichText from './RichText.svelte'

const posted = ( container : Element ) => JSON.parse( container.querySelector<HTMLInputElement>( 'input[name=body]' )!.value )

describe( 'RichEditor', () => {
	it( 'mounts over the server-rendered text and posts what is typed as JSON', async() => {
		const { container } = await render( RichEditor, { label: 'Body', name: 'body', images: false, value: { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: 'Hello' } ] } ] } } )

		await expect.element( page.getByRole( 'button', { name: 'Bold' } ) ).toBeInTheDocument()

		const textbox = page.getByRole( 'textbox', { name: 'Body' } )

		await textbox.click()
		await userEvent.keyboard( '{End} world' )

		await expect.poll( () => posted( container ).content[ 0 ].content[ 0 ].text ).toBe( 'Hello world' )
	} )

	it( 'inserts a variable from the menu as a labelled chip', async() => {
		const { container } = await render( RichEditor, { label: 'Body', name: 'body', images: false, variables: [ { name: 'customer_name', label: 'Customer name' } ] } )

		await page.getByRole( 'textbox', { name: 'Body' } ).click()
		await page.getByRole( 'button', { name: 'Insert a variable' } ).click()
		await page.getByRole( 'menuitem', { name: /Customer name/ } ).click()

		await expect.element( page.getByRole( 'textbox', { name: 'Body' } ).getByText( 'Customer name' ) ).toBeInTheDocument()
		await expect.poll( () => JSON.stringify( posted( container ) ) ).toContain( '"type":"variable","attrs":{"name":"customer_name"}' )
	} )

	it( 'refuses a link that is not http, https or mailto', async() => {
		await render( RichEditor, { label: 'Body', images: false, value: { type: 'doc', content: [ { type: 'paragraph', content: [ { type: 'text', text: 'click' } ] } ] } } )

		await page.getByRole( 'textbox', { name: 'Body' } ).click()
		await userEvent.keyboard( '{Control>}a{/Control}' )
		await page.getByRole( 'button', { name: 'Link' } ).click()
		await page.getByRole( 'textbox', { name: 'Link' } ).fill( 'javascript:alert(1)' )
		await page.getByRole( 'button', { name: 'Apply link' } ).click()

		await expect.element( page.getByText( 'Links can go to http, https or mailto addresses.' ) ).toBeInTheDocument()
	} )
} )

describe( 'RichText', () => {
	it( 'shows rendered HTML in the rich-text styles', async() => {
		const { container } = await render( RichText, { html: '<p>Hi <strong>there</strong></p>', class: 'extra' } )

		expect( container.querySelector( '.rich-text.extra strong' )?.textContent ).toBe( 'there' )
	} )
} )
