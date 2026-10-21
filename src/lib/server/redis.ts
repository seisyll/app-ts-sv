import { Redis } from 'ioredis'
import { currentTenant } from '$lib/server/db'
import { log } from '$lib/server/log'

/* ―― » Redis ( the fundraiser app's client ), optional infrastructure: with REDIS_URL set the
        counters below are shared by every instance and outlive a restart; without it, or
        while the server is away, every helper answers null and its caller carries on
        ( fails open ) — a cache outage must never stop people signing in.
        The client connects on first use, never queues a command while disconnected ( it
        fails at once instead of hanging a request ), and reconnects in the background.

        Env: REDIS_URL, e.g. redis://:password@127.0.0.1:6380/0. */

let client : Redis | null | undefined
let warned = false

export function redis() : Redis | null {
	if ( client !== undefined )
		return client

	const url = process.env.REDIS_URL

	if ( !url )
		return ( client = null )

	client = new Redis( url, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, retryStrategy: ( times ) => Math.min( times * 200, 5_000 ) } )
	// An 'error' event without a listener would crash the process. Said once, not per retry.
	client.on( 'error', ( caught ) => {
		if ( !warned )
			log.warn( { scope: 'redis', reason: caught.message }, 'unavailable, carrying on without it' )

		warned = true
	} )
	client.on( 'ready', () => ( warned = false ) )
	void client.connect().catch( () => {} )

	return client
}

const online = () => {
	const instance = redis()

	return instance?.status === 'ready' ? instance : null
}

// Connected right now ( for a status line; the helpers check for themselves ).
export const redisReady = () : boolean => online() !== null

// Keys of the current workspace: one tenant's counters never touch another's.
export const tenantKey = async( ...parts : string[] ) => `t:${ ( await currentTenant() ).id }:${ parts.join( ':' ) }`

export type Window = { count : number, ttlMs : number }

// Fixed window: the first hit starts it, later hits count without moving its end.
const HIT = `local count = redis.call( 'INCR', KEYS[1] )
if count == 1 then redis.call( 'PEXPIRE', KEYS[1], ARGV[1] ) end
return { count, redis.call( 'PTTL', KEYS[1] ) }`

// Count one against `key`. Null: no Redis.
export async function hit( key : string, windowMs : number ) : Promise<Window | null> {
	try {
		const [ count, ttlMs ] = await online()?.eval( HIT, 1, key, String( windowMs ) ) as [ number, number ] ?? []

		return count === undefined ? null : { count, ttlMs: Math.max( 0, ttlMs ) }
	} catch {
		return null
	}
}

// The window's count so far ( 0 when none is open ). Null: no Redis.
export async function peek( key : string ) : Promise<Window | null> {
	try {
		const instance = online()

		if ( !instance )
			return null

		const [ [ , count ], [ , ttlMs ] ] = await instance.multi().get( key ).pttl( key ).exec() as [ [ unknown, string | null ], [ unknown, number ] ]

		return { count: Number( count ) || 0, ttlMs: Math.max( 0, ttlMs ) }
	} catch {
		return null
	}
}

export async function clear( key : string ) : Promise<void> {
	await online()?.del( key ).catch( () => {} )
}

/* ―― » A budget per key and window ( the fundraiser app's RateLimit ), for public endpoints
        with no account to key on: rateLimit( await tenantKey( 'contact', ip ), 5, 60_000 ).
        Allowed when Redis is away. */
export async function rateLimit( key : string, limit : number, windowMs : number ) : Promise<{ allowed : boolean, retryAfterMs : number }> {
	const window = await hit( key, windowMs )

	return !window || window.count <= limit ? { allowed: true, retryAfterMs: 0 } : { allowed: false, retryAfterMs: window.ttlMs }
}
