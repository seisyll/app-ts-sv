import { describe, expect, it, vi } from 'vitest'
import { checkEnv, envProblems } from './env'
import { log } from './log'

const good = {
	DATABASE_URL      : 'postgresql://app_rls:secret@db:5432/app',
	BETTER_AUTH_SECRET: 'x'.repeat( 32 ),
	BETTER_AUTH_URL   : 'https://example.com'
}

describe( 'envProblems', () => {
	it( 'passes a complete deployment', () => {
		expect( envProblems( good, true ) ).toEqual( [] )
		expect( envProblems( { ...good, BETTER_AUTH_URL: undefined, TENANCY: 'shared', APP_DOMAIN: 'example.com' }, true ) ).toEqual( [] )
	} )

	it( 'names every broken variable, one line each', () => {
		const problems = envProblems( { TENANCY: 'multi', BETTER_AUTH_SECRET: 'short', REDIS_URL: 'localhost:6379', GOOGLE_CLIENT_ID: 'id' }, false )

		expect( problems.map( ( line ) => line.split( ':' )[ 0 ] ) ).toEqual( [ 'TENANCY', 'DATABASE_URL', 'BETTER_AUTH_SECRET', 'REDIS_URL', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' ] )
	} )

	it( 'asks more of production: the public URL or app domain, and a non-owner role', () => {
		expect( envProblems( { ...good, BETTER_AUTH_URL: '' }, false ) ).toEqual( [] )
		expect( envProblems( { ...good, BETTER_AUTH_URL: '' }, true ) ).toHaveLength( 1 )
		expect( envProblems( { ...good, TENANCY: 'shared', APP_DOMAIN: 'localhost' }, true ) ).toHaveLength( 1 )
		expect( envProblems( { ...good, DATABASE_URL: 'postgresql://postgres:pw@db:5432/app' }, true ) ).toHaveLength( 1 )
	} )
} )

describe( 'checkEnv', () => {
	it( 'stops a production server, and only warns in development', () => {
		const warn = vi.spyOn( log, 'warn' )

		expect( () => checkEnv( {}, true ) ).toThrow( /DATABASE_URL: required/ )
		expect( () => checkEnv( {}, false ) ).not.toThrow()
		expect( warn ).toHaveBeenCalledWith( expect.stringContaining( 'BETTER_AUTH_SECRET' ) )
		warn.mockRestore()
	} )
} )
