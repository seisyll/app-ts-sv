import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'svelte-sonner'
import { invalidateAll } from '$app/navigation'
import { errorMessage, HttpError } from './http'
import { mutate } from './mutate'

vi.mock( '$app/navigation', () => ( { invalidateAll: vi.fn( async() => {} ) } ) )
vi.mock( 'svelte-sonner', () => ( { toast: { success: vi.fn(), error: vi.fn() } } ) )

const respond = ( body : unknown, status = 200 ) =>
	vi.stubGlobal( 'fetch', vi.fn( async() => new Response( JSON.stringify( body ), { status } ) ) )

describe( 'mutate', () => {
	afterEach( () => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	} )

	it( 'posts JSON, toasts success, runs onSuccess before refreshing', async() => {
		respond( { id: 1 } )
		const order : string[] = []

		vi.mocked( invalidateAll ).mockImplementationOnce( async() => {
			order.push( 'refresh' )
		} )

		const result = await mutate( '/api/things', { body: { name: 'A' }, success: 'Saved', onSuccess: () => order.push( 'onSuccess' ) } )

		expect( result ).toEqual( { ok: true, data: { id: 1 } } )
		expect( toast.success ).toHaveBeenCalledWith( 'Saved' )
		expect( order ).toEqual( [ 'onSuccess', 'refresh' ] )
	} )

	it( 'does not refresh when asked not to', async() => {
		respond( {} )
		await mutate( '/api/things', { refresh: false } )

		expect( invalidateAll ).not.toHaveBeenCalled()
	} )

	it( 'toasts the endpoint\'s message on failure, and returns it', async() => {
		respond( { message: 'Name already used' }, 409 )

		const result = await mutate( '/api/things', { body: {} } )

		expect( result ).toMatchObject( { ok: false, message: 'Name already used' } )
		expect( toast.error ).toHaveBeenCalledWith( 'Name already used' )
		expect( invalidateAll ).not.toHaveBeenCalled()
	} )

	it( 'can leave the error to the caller', async() => {
		respond( { message: 'Nope' }, 400 )
		await mutate( '/api/things', { toastError: false } )

		expect( toast.error ).not.toHaveBeenCalled()
	} )
} )

describe( 'errorMessage', () => {
	it( 'says the server is unreachable, rather than blaming the request', () => {
		expect( errorMessage( new HttpError( { kind: 'network', message: 'x', url: '/' } ) ) ).toMatch( /reach the server/i )
	} )

	it( 'falls back for anything that is not an HttpError', () => {
		expect( errorMessage( new Error( 'boom' ), 'Fallback' ) ).toBe( 'Fallback' )
	} )
} )
