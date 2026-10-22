import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import { DEFAULT_SETTING, NO_OVERRIDE } from '#lib/appearance.js'
import AppearancePicker from './AppearancePicker.svelte'

const html = () => document.documentElement.className
const open = () => page.getByRole( 'button', { name: 'Change appearance' } ).click()

describe( 'AppearancePicker', () => {
	afterEach( () => {
		document.documentElement.className = ''
	} )

	it( 'paints a choice at once and saves the new override', async() => {
		const onsave = vi.fn( async() => true )

		await render( AppearancePicker, { setting: DEFAULT_SETTING, override: NO_OVERRIDE, onsave } )
		await open()
		await page.getByRole( 'menuitem', { name: 'Blue' } ).click()

		expect( html() ).toContain( 'palette-blue' )
		expect( onsave ).toHaveBeenCalledWith( { palette: 'blue', style: null, radius: null } )

		await page.getByRole( 'menuitem', { name: /^Lyra/ } ).click()

		// Lyra draws square corners whatever radius is stored.
		expect( html() ).toBe( 'palette-blue style-lyra radius-none' )
		await expect.element( page.getByText( 'set by this style' ) ).toBeInTheDocument()
	} )

	it( 'puts the old look back when saving fails', async() => {
		await render( AppearancePicker, { setting: DEFAULT_SETTING, override: NO_OVERRIDE, onsave: async() => false } )
		await open()
		await page.getByRole( 'menuitem', { name: 'Rose' } ).click()

		await vi.waitFor( () => expect( html() ).toBe( 'palette-neutral style-vega radius-medium' ) )
	} )

	it( 'offers the workspace default once something is overridden', async() => {
		const onsave = vi.fn( async() => true )

		await render( AppearancePicker, { setting: DEFAULT_SETTING, override: { palette: 'teal', style: null, radius: null }, onsave } )
		await open()
		await page.getByRole( 'menuitem', { name: 'Use the workspace default' } ).click()

		expect( onsave ).toHaveBeenCalledWith( NO_OVERRIDE )
		expect( html() ).toBe( 'palette-neutral style-vega radius-medium' )
	} )
} )
