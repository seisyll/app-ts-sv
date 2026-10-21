import { describe, expect, it, vi } from 'vitest'
import { handleError } from './hooks.server'

// Only server faults are logged; what the visitor sees is the message, either way.
describe( 'handleError', () => {
	it( 'logs a 5xx with its request, and stays quiet below that', async() => {
		const log = vi.spyOn( console, 'error' ).mockImplementation( () => {} )
		const event = { request: new Request( 'http://app.test/app/users', { method: 'POST' } ), url: new URL( 'http://app.test/app/users' ) } as Parameters<typeof handleError>[ 0 ][ 'event' ]
		const fault = new Error( 'database gone' )

		expect( await handleError( { error: fault, event, status: 500, message: 'Internal Error' } ) ).toEqual( { message: 'Internal Error' } )
		expect( log ).toHaveBeenCalledWith( '[500] POST /app/users', fault )

		log.mockClear()
		await handleError( { error: new Error( 'Not found: /wp-login.php' ), event, status: 404, message: 'Not Found' } )
		expect( log ).not.toHaveBeenCalled()
		log.mockRestore()
	} )
} )
