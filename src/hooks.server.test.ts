import { describe, expect, it, vi } from 'vitest'
import { handleError } from './hooks.server'
import { log } from '#lib/server/log.js'

// Only server faults are logged; what the visitor sees is SvelteKit's default, either way.
describe( 'handleError', () => {
	it( 'logs a 5xx with its request, and stays quiet below that', async() => {
		const error = vi.spyOn( log, 'error' )
		const event = { request: new Request( 'http://app.test/app/users', { method: 'POST' } ), url: new URL( 'http://app.test/app/users' ) } as Parameters<typeof handleError>[ 0 ][ 'event' ]
		const fault = new Error( 'database gone' )

		expect( await handleError( { kind: 'unknown', error: fault, event } ) ).toBeUndefined()
		expect( error ).toHaveBeenCalledWith( { err: fault, status: 500 }, 'server fault' )

		error.mockClear()
		await handleError( { kind: 'framework', error: { status: 404, message: 'Not Found' }, event } )
		await handleError( { kind: 'app', error: { status: 403, message: 'Forbidden' }, event } )
		expect( error ).not.toHaveBeenCalled()

		await handleError( { kind: 'app', error: { status: 502, message: 'Upstream failed' }, event } )
		expect( error ).toHaveBeenCalledWith( { err: { status: 502, message: 'Upstream failed' }, status: 502 }, 'server fault' )
		error.mockRestore()
	} )
} )
