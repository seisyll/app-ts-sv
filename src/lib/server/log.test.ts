import { Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { baseLog, createLog, log, withLog } from './log'

// A logger that keeps what it writes, one parsed JSON object per line.
function capture() {
	const lines : Record<string, unknown>[] = []
	const sink = new Writable( { write: ( chunk, _, done ) => {
		lines.push( JSON.parse( String( chunk ) ) )
		done()
	} } )

	return { lines, logger: createLog( sink, 'trace' ) }
}

describe( 'log', () => {
	it( 'writes JSON lines with the level by name, and never a secret', () => {
		const { lines, logger } = capture()

		logger.warn( { scope: 'auth', password: 'hunter2', headers: { cookie: 'session=abc', accept: '*/*' } }, 'refused' )

		expect( lines[ 0 ] ).toMatchObject( { level: 'warn', msg: 'refused', scope: 'auth', password: '[redacted]', headers: { cookie: '[redacted]', accept: '*/*' } } )
	} )

	it( 'gives every line in a request its context, nested, with nothing to pass around', () => {
		const { lines, logger } = capture()
		const child = vi.spyOn( baseLog, 'child' ).mockImplementation( ( bindings ) => logger.child( bindings ) )

		withLog( { req: 'r1', path: '/app' }, () => {
			log.info( 'loaded' )
			withLog( { job: 'purge' }, () => log.error( { err: new Error( 'down' ) }, 'failed' ) )
		} )
		child.mockRestore()

		expect( lines[ 0 ] ).toMatchObject( { req: 'r1', path: '/app', msg: 'loaded' } )
		expect( lines[ 1 ] ).toMatchObject( { req: 'r1', job: 'purge', msg: 'failed', err: { message: 'down' } } )
	} )
} )
