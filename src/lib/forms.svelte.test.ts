import { describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import { toast } from 'svelte-sonner'
import { HttpError } from '$lib/http'
import ApiFormFixture from '$lib/test/fixtures/ApiFormFixture.svelte'

vi.mock( 'svelte-sonner', () => ( { toast: { success: vi.fn(), error: vi.fn() } } ) )

const field = ( name : string ) => page.getByRole( 'textbox', { name } )
const errorFor = ( name : string ) => document.querySelector( `[data-error="${ name }"]` )
const state = () => document.querySelector( '[data-state]' )?.textContent
const save = () => page.getByRole( 'button', { name: 'Save' } ).click()

describe( 'apiForm', () => {
	it( 'validates in the browser and does not submit an invalid form', async() => {
		const submit = vi.fn( async() => ( {} ) )

		await render( ApiFormFixture, { submit } )
		await save()

		await expect.poll( () => errorFor( 'name' )?.textContent ).toBe( 'Required' )
		expect( errorFor( 'email' )?.textContent ).toBe( 'Enter a valid email address' )
		expect( submit ).not.toHaveBeenCalled()
	} )

	it( 'submits the parsed data, toasts, and makes the saved values the clean state', async() => {
		const submit = vi.fn( async() => ( { ok: true } ) )

		await render( ApiFormFixture, { submit, initial: { name: 'Ada', email: 'ada@example.test' } } )
		await field( 'Name' ).fill( '  Ada Lovelace ' )
		await expect.poll( state ).toBe( 'dirty' )

		await save()

		await expect.poll( () => submit.mock.calls.length ).toBe( 1 )
		expect( submit ).toHaveBeenCalledWith( { name: 'Ada Lovelace', email: 'ada@example.test' } )
		expect( toast.success ).toHaveBeenCalledWith( 'Saved' )
		await expect.poll( state ).toBe( 'clean' )
	} )

	it( 'puts the server\'s field errors under the fields and stays dirty', async() => {
		const submit = vi.fn( async() => {
			throw new HttpError( { kind: 'http', status: 400, url: '/api/x', message: 'x', data: { message: 'Fix it', errors: { email: [ 'Already taken' ] } } } )
		} )

		await render( ApiFormFixture, { submit, initial: { name: 'Ada', email: 'ada@example.test' } } )
		await field( 'Email' ).fill( 'taken@example.test' )
		await save()

		await expect.poll( () => errorFor( 'email' )?.textContent ).toBe( 'Already taken' )
		expect( state() ).toBe( 'dirty' )
	} )

	it( 'toasts any other failure', async() => {
		const submit = vi.fn( async() => {
			throw new HttpError( { kind: 'network', url: '/api/x', message: 'x' } )
		} )

		await render( ApiFormFixture, { submit, initial: { name: 'Ada', email: 'ada@example.test' } } )
		await save()

		await expect.poll( () => vi.mocked( toast.error ).mock.calls.length ).toBe( 1 )
		expect( vi.mocked( toast.error ).mock.calls[ 0 ][ 0 ] ).toMatch( /reach the server/i )
	} )
} )
