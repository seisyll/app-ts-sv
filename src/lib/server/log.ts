import { AsyncLocalStorage } from 'node:async_hooks'
import pino, { type DestinationStream, type Logger } from 'pino'
import { dev } from '$app/env'

/* ―― » The server's log ( the fundraiser app's Trace, on pino ). In production, one JSON
        object per line on stdout — the container's log, which Docker keeps and rotates, and
        any collector can read ( `docker compose logs app | bunx pino-pretty` to read it by
        eye ). In dev, the same lines made readable. LOG_LEVEL filters: trace, debug, info
        ( the default ), warn, error, fatal, silent.

        Inside a request every line carries its id, method, path and host ( hooks.server.ts
        runs the request in `withLog` ), with no logger to pass around: `log.warn( … )`
        anywhere picks the request's up. Outside one ( startup, jobs ) the lines are plain.

          log.info( 'workspace created' )
          log.error( { err: caught, scope: 'mail' }, 'the invite failed' )

        Secrets never reach the log: the paths below are redacted wherever they appear in
        the logged object, one level down included. */
const REDACT = [ 'password', 'secret', 'token', 'cookie', 'authorization', 'headers.cookie', 'headers.authorization', '*.password', '*.secret', '*.token' ]

// pino-pretty is a dev dependency: this branch, and its import, leave the production build.
const stream = dev ? ( await import( 'pino-pretty' ) ).default( { translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname', singleLine: true } ) : undefined

// A logger with these rules, writing to `destination` ( default: stdout, or pretty in dev ).
export const createLog = ( destination : DestinationStream | undefined = stream, level = process.env.LOG_LEVEL || 'info' ) : Logger => pino( {
	level,
	timestamp : pino.stdTimeFunctions.isoTime,
	redact    : { paths: REDACT, censor: '[redacted]' },
	// The level's name, not its number: what a reader ( and most collectors ) expect.
	formatters: { level: ( label ) => ( { level: label } ) }
}, destination )

export const baseLog = createLog()

const current = new AsyncLocalStorage<Logger>()

// Run `fn` with `bindings` on every line logged inside it.
export const withLog = <T>( bindings : Record<string, unknown>, fn : () => T ) : T => current.run( ( current.getStore() ?? baseLog ).child( bindings ), fn )

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// The message alone, or pino's ( fields, message ): `err` in the fields is serialised with
// its stack.
type Write = ( first : string | Record<string, unknown>, message ?: string ) => void

const at = ( level : Level ) : Write => ( first, message ) => {
	const logger = current.getStore() ?? baseLog

	if ( typeof first === 'string' )
		logger[ level ]( first )
	else
		logger[ level ]( first, message )
}

export const log = {
	trace: at( 'trace' ),
	debug: at( 'debug' ),
	info : at( 'info' ),
	warn : at( 'warn' ),
	error: at( 'error' ),
	fatal: at( 'fatal' )
}
