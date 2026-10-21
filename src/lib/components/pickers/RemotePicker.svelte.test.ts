import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import RemotePicker from './RemotePicker.svelte'

type Person = { id : string, name : string, email : string }

const PEOPLE : Person[] = [ 'Ada', 'Grace', 'Alan', 'Edsger' ].map( ( name, index ) => ( { id: `p${ index }`, name, email: `${ name.toLowerCase() }@example.test` } ) )

// The endpoint: the people whose name has the search in it, and a total that says there are more.
function serve( total = PEOPLE.length ) {
	return vi.spyOn( window, 'fetch' ).mockImplementation( async( input ) => {
		const search = new URL( String( input ), location.origin ).searchParams.get( 'search' ) ?? ''
		const rows = PEOPLE.filter( ( person ) => person.name.toLowerCase().includes( search.toLowerCase() ) )

		return new Response( JSON.stringify( { rows, total: Math.max( total, rows.length ) } ), { headers: { 'content-type': 'application/json' } } )
	} )
}

const toOption = ( person : Person ) => ( { value: person.id, label: person.name, hint: person.email } )

describe( 'RemotePicker', () => {
	afterEach( () => {
		vi.restoreAllMocks()
	} )

	it( 'searches the endpoint as you type, and picks one', async() => {
		const fetch = serve()
		const onchange = vi.fn()

		await render( RemotePicker<Person>, { path: '/api/people', toOption, name: 'owner', params: { 'f.role': [ 'admin', 'member' ] }, onchange } )
		await page.getByRole( 'combobox' ).click()
		await expect.element( page.getByText( 'grace@example.test' ) ).toBeVisible()

		await userEvent.keyboard( 'ed' )
		await expect.poll( () => page.getByRole( 'option' ).elements().length ).toBe( 1 )
		expect( String( fetch.mock.lastCall?.[ 0 ] ) ).toContain( 'search=ed' )
		expect( String( fetch.mock.lastCall?.[ 0 ] ) ).toContain( 'f.role=admin&f.role=member' )

		await page.getByRole( 'option', { name: /Edsger/ } ).click()
		await expect.element( page.getByRole( 'combobox' ) ).toHaveTextContent( 'Edsger' )
		expect( document.querySelector<HTMLInputElement>( 'input[name=owner]' )?.value ).toBe( 'p3' )
		expect( onchange ).toHaveBeenCalledOnce()
	} )

	it( 'says when the endpoint has more than it shows', async() => {
		serve( 57 )

		await render( RemotePicker<Person>, { path: '/api/people', toOption } )
		await page.getByRole( 'combobox' ).click()

		await expect.element( page.getByText( '53 more not shown — narrow the search.' ) ).toBeVisible()
	} )

	it( 'with multiple, keeps several as chips that can be removed', async() => {
		serve()

		await render( RemotePicker<Person>, { path: '/api/people', toOption, multiple: true, name: 'team' } )
		await page.getByRole( 'combobox' ).click()
		await page.getByRole( 'option', { name: /Ada/ } ).click()
		await page.getByRole( 'option', { name: /Alan/ } ).click()
		await userEvent.keyboard( '{Escape}' )

		await expect.element( page.getByRole( 'combobox' ) ).toHaveTextContent( '2 chosen' )
		expect( [ ...document.querySelectorAll<HTMLInputElement>( 'input[name=team]' ) ].map( ( input ) => input.value ) ).toEqual( [ 'p0', 'p2' ] )

		await page.getByRole( 'button', { name: 'Remove Ada' } ).click()
		expect( [ ...document.querySelectorAll<HTMLInputElement>( 'input[name=team]' ) ].map( ( input ) => input.value ) ).toEqual( [ 'p2' ] )
	} )
} )
