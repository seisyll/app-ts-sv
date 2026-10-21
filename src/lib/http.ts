import { m } from '$lib/paraglide/messages'

/* ―― » The one fetch wrapper ( ported from billing-app, which ported it from the fundraiser
        app ): builds the request, classifies every failure as an HttpError, times out.
        Works in the browser and on the server — in a load / action pass `event.fetch`,
        which keeps cookies, relative URLs and SSR response inlining. */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// json ( default; empty body → undefined ) · text · blob · none ( the raw Response )
export type ParseAs = 'json' | 'text' | 'blob' | 'none'

export type QueryValue = string | number | boolean | null | undefined

export type Fetch = typeof globalThis.fetch

export type RequestOptions = Omit<RequestInit, 'method' | 'body'> & {
	// Query params; null/undefined skipped, arrays repeat the key.
	params ?  : Record<string, QueryValue | QueryValue[]>
	// Objects/arrays are sent as JSON; FormData, Blob, strings, streams pass through.
	body ?    : unknown
	parse ?   : ParseAs
	fetch ?   : Fetch
	// Milliseconds; 0 disables.
	timeout ? : number
}

export type HttpDefaults = {
	baseUrl ? : string
	headers ? : HeadersInit
	fetch ?   : Fetch
	timeout ? : number
}

// A hung upstream is worse than a failed one: it holds the page open forever.
export const DEFAULT_TIMEOUT = 15_000

export type HttpErrorKind = 'http' | 'network' | 'timeout'

// The single failure type. `message` is technical ( logs ); show users messageOr().
export class HttpError<T = unknown> extends Error {
	readonly kind : HttpErrorKind
	// 0 when the request never reached the server.
	readonly status : number
	readonly url : string
	// The parsed error body, e.g. SvelteKit's { message, errors? }.
	readonly data : T

	constructor( init : { kind : HttpErrorKind, message : string, url : string, status ?: number, data ?: T, cause ?: unknown } ) {
		super( init.message, init.cause === undefined ? undefined : { cause: init.cause } )
		this.name = 'HttpError'
		this.kind = init.kind
		this.status = init.status ?? 0
		this.url = init.url
		this.data = init.data as T
	}

	// Never reached the server: backend down / offline, not "the backend said no".
	get unreachable() : boolean {
		return this.kind !== 'http'
	}

	// The endpoint's own message ( string or string[] ), else the caller's fallback.
	messageOr( fallback : string ) : string {
		const message = ( this.data as { message ?: unknown } | null | undefined )?.message

		if ( typeof message === 'string' && message )
			return message

		if ( Array.isArray( message ) ) {
			const joined = message.filter( ( part ) => typeof part === 'string' ).join( ', ' )

			if ( joined )
				return joined
		}

		return fallback
	}

	// Field errors from a validation failure ( readJson on the server ), if any.
	get fieldErrors() : Record<string, string[]> | undefined {
		const errors = ( this.data as { errors ?: unknown } | null | undefined )?.errors

		return errors && typeof errors === 'object' ? errors as Record<string, string[]> : undefined
	}
}

export const isHttpError = ( error : unknown ) : error is HttpError => error instanceof HttpError

// What to tell the user about a failed request: offline, the endpoint's message, or a fallback.
export function errorMessage( error : unknown, fallback : string = m.http_failed() ) : string {
	if ( !isHttpError( error ) )
		return fallback

	return error.unreachable ? m.http_unreachable() : error.messageOr( fallback )
}

function withParams( url : string, params : RequestOptions['params'] ) : string {
	const query = new URLSearchParams()

	for ( const [ key, value ] of Object.entries( params ?? {} ) )
		for ( const entry of Array.isArray( value ) ? value : [ value ] )
			if ( entry !== undefined && entry !== null )
				query.append( key, String( entry ) )

	const search = query.toString()

	return search ? `${ url }${ url.includes( '?' ) ? '&' : '?' }${ search }` : url
}

// Encoding FormData would drop the multipart boundary the server needs.
const isRawBody = ( body : unknown ) : body is BodyInit => typeof body === 'string'
	|| body instanceof FormData
	|| body instanceof Blob
	|| body instanceof ArrayBuffer
	|| body instanceof URLSearchParams
	|| body instanceof ReadableStream

async function parseBody( response : Response, parse : ParseAs ) : Promise<unknown> {
	if ( parse === 'none' )
		return response

	if ( parse === 'blob' )
		return response.blob()

	const text = await response.text()

	if ( parse === 'text' || !text )
		return parse === 'text' ? text : undefined

	try {
		return JSON.parse( text )
	} catch {
		// Non-JSON ( an HTML gateway page, usually ): hand back the text, don't crash.
		return text
	}
}

const resolveUrl = ( baseUrl : string | undefined, path : string ) =>
	!baseUrl || /^[a-z][a-z0-9+.-]*:/i.test( path ) ? path : `${ baseUrl }${ path }`

function resolveSignal( timeout : number, signal : AbortSignal | null | undefined ) : AbortSignal | undefined {
	if ( timeout <= 0 )
		return signal ?? undefined

	const timer = AbortSignal.timeout( timeout )

	return signal ? AbortSignal.any( [ signal, timer ] ) : timer
}

export type HttpClient = {
	request<T = unknown>( method : HttpMethod, path : string, options ?: RequestOptions ) : Promise<T>
	get<T = unknown>( path : string, options ?: Omit<RequestOptions, 'body'> ) : Promise<T>
	post<T = unknown>( path : string, body ?: unknown, options ?: Omit<RequestOptions, 'body'> ) : Promise<T>
	put<T = unknown>( path : string, body ?: unknown, options ?: Omit<RequestOptions, 'body'> ) : Promise<T>
	patch<T = unknown>( path : string, body ?: unknown, options ?: Omit<RequestOptions, 'body'> ) : Promise<T>
	delete<T = unknown>( path : string, options ?: RequestOptions ) : Promise<T>
}

// A client with baked-in base URL / headers / fetch; per-call options win.
export function createHttp( defaults : HttpDefaults = {} ) : HttpClient {
	async function request<T>( method : HttpMethod, path : string, options : RequestOptions = {} ) : Promise<T> {
		const { params, body, parse = 'json', headers, fetch, timeout = defaults.timeout ?? DEFAULT_TIMEOUT, signal, ...rest } = options
		const url = withParams( resolveUrl( defaults.baseUrl, path ), params )
		const merged = new Headers( defaults.headers )

		for ( const [ key, value ] of new Headers( headers ) )
			merged.set( key, value )

		// SvelteKit answers a thrown error() as JSON only when JSON is what's accepted.
		if ( !merged.has( 'Accept' ) )
			merged.set( 'Accept', 'application/json' )

		const init : RequestInit = { method, headers: merged, signal: resolveSignal( timeout, signal ), ...rest }

		if ( body !== undefined && body !== null ) {
			init.body = isRawBody( body ) ? body : JSON.stringify( body )

			if ( !isRawBody( body ) && !merged.has( 'Content-Type' ) )
				merged.set( 'Content-Type', 'application/json' )
		}

		let response : Response

		try {
			response = await ( fetch ?? defaults.fetch ?? globalThis.fetch )( url, init )
		} catch ( error ) {
			const timedOut = error instanceof Error && error.name === 'TimeoutError'

			throw new HttpError( {
				kind   : timedOut ? 'timeout' : 'network',
				message: timedOut ? `Timed out after ${ timeout }ms — ${ method } ${ url }` : `Network request failed — ${ method } ${ url }`,
				url,
				cause  : error
			} )
		}

		if ( !response.ok ) {
			throw new HttpError( {
				kind   : 'http',
				message: `HTTP ${ response.status } ${ response.statusText } — ${ method } ${ url }`,
				url,
				status : response.status,
				data   : await parseBody( response, 'json' ).catch( () => undefined )
			} )
		}

		return await parseBody( response, parse ) as T
	}

	return {
		request,
		get   : ( path, options ) => request( 'GET', path, options ),
		post  : ( path, body, options ) => request( 'POST', path, { ...options, body } ),
		put   : ( path, body, options ) => request( 'PUT', path, { ...options, body } ),
		patch : ( path, body, options ) => request( 'PATCH', path, { ...options, body } ),
		delete: ( path, options ) => request( 'DELETE', path, options )
	}
}

// Same-origin client for the app's own endpoints.
export const http = createHttp()
