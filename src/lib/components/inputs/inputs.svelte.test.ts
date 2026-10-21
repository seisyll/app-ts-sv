import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import MaskedInput from './MaskedInput.svelte'
import MoneyInput from './MoneyInput.svelte'

const posted = ( container : HTMLElement, name : string ) => container.querySelector<HTMLInputElement>( `input[type=hidden][name=${ name }]` )?.value

describe( 'MoneyInput', () => {
	it( 'groups the digits as they are typed and posts the plain number', async() => {
		const { container } = await render( MoneyInput, { currency: 'USD', name: 'amount', min: 0 } )
		const field = page.getByRole( 'textbox' )

		await field.click()
		await userEvent.keyboard( '-1234.567' )
		await expect.element( field ).toHaveValue( '1,234.56' )
		expect( posted( container, 'amount' ) ).toBe( '1234.56' )
		await expect.element( page.getByText( '$' ) ).toBeVisible()
	} )

	it( 'follows the currency: no decimals for rupiah, and empty posts nothing', async() => {
		const { container } = await render( MoneyInput, { currency: 'IDR', name: 'amount', value: 12500 } )
		const field = page.getByRole( 'textbox' )

		await expect.element( field ).toHaveValue( '12,500' )
		await field.fill( '' )
		expect( posted( container, 'amount' ) ).toBe( '' )

		await userEvent.keyboard( '99.5' )
		await expect.element( field ).toHaveValue( '995' )
		expect( posted( container, 'amount' ) ).toBe( '995' )
	} )
} )

describe( 'MaskedInput', () => {
	it( 'shows the shape and posts only the digits', async() => {
		const { container } = await render( MaskedInput, { mask: '+## ###-####-####', name: 'phone' } )
		const field = page.getByRole( 'textbox' )

		await field.click()
		await userEvent.keyboard( '6281234567890' )
		await expect.element( field ).toHaveValue( '+62 812-3456-7890' )
		expect( posted( container, 'phone' ) ).toBe( '6281234567890' )
		expect( container.querySelectorAll( 'input[name=phone]' ) ).toHaveLength( 1 )
	} )
} )
