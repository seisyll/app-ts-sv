import { afterAll, describe, expect, it, vi } from 'vitest'

describe( 'redis, unset', () => {
	it( 'answers null and allows everything: the caller carries on', async() => {
		vi.stubEnv( 'REDIS_URL', '' )
		vi.resetModules()

		const { clear, hit, peek, rateLimit, redis } = await import( './redis' )

		expect( redis() ).toBeNull()
		expect( await hit( 'k', 1_000 ) ).toBeNull()
		expect( await peek( 'k' ) ).toBeNull()
		await expect( clear( 'k' ) ).resolves.toBeUndefined()
		expect( await rateLimit( 'k', 0, 1_000 ) ).toEqual( { allowed: true, retryAfterMs: 0 } )
		vi.unstubAllEnvs()
	} )
} )

// Against a real server when there is one ( docker-compose.dev.yml ).
describe.runIf( process.env.REDIS_URL )( 'redis, live', () => {
	const key = `test:${ crypto.randomUUID() }`
	let module : typeof import( './redis' )

	afterAll( async() => {
		await module?.clear( key )
		module?.redis()?.disconnect()
	} )

	it( 'counts in a fixed window, peeks, clears and rate-limits', async() => {
		vi.resetModules()
		module = await import( './redis' )
		await vi.waitFor( () => expect( module.redis()?.status ).toBe( 'ready' ), { timeout: 5_000 } )

		expect( await module.hit( key, 60_000 ) ).toMatchObject( { count: 1 } )
		const second = await module.hit( key, 60_000 )

		expect( second?.count ).toBe( 2 )
		expect( second?.ttlMs ).toBeGreaterThan( 50_000 )
		expect( await module.peek( key ) ).toMatchObject( { count: 2 } )
		expect( ( await module.rateLimit( key, 2, 60_000 ) ).allowed ).toBe( false )

		await module.clear( key )
		expect( await module.peek( key ) ).toEqual( { count: 0, ttlMs: 0 } )
	} )
} )
