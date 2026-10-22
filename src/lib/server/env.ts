import { parseBytes } from '#lib/bytes.js'
import { log } from '#lib/server/log.js'

/* ―― » The environment, checked once when the server starts ( hooks.server.ts `init`, from
        billing-app's env.ts ). Everything else still reads process.env where it's used; this
        only makes a broken deployment say so at boot, one line per variable, instead of on
        the first request that happens to need it. In production a problem stops the server;
        in development it is a warning ( a fresh checkout has no .env yet ).

        Messages are English on purpose: an operator reads them in a container log, they
        aren't UI. Add a rule when you add a variable that must be right before anyone
        visits. */
export function envProblems( env : Record<string, string | undefined>, production : boolean ) : string[] {
	const problems : string[] = []
	const need = ( ok : boolean, line : string ) => ok || problems.push( line )
	const url = ( value : string | undefined ) => !!value && URL.canParse( value )
	const shared = env.TENANCY === 'shared'

	need( !env.TENANCY || [ 'single', 'shared' ].includes( env.TENANCY ), `TENANCY: "single" or "shared", not "${ env.TENANCY }"` )
	need( !!env.DATABASE_URL, 'DATABASE_URL: required — the app_rls connection ( .env.example )' )
	need( ( env.BETTER_AUTH_SECRET ?? '' ).length >= 32, 'BETTER_AUTH_SECRET: at least 32 characters ( openssl rand -base64 32 )' )
	need( !env.REDIS_URL || /^rediss?:\/\//.test( env.REDIS_URL ), 'REDIS_URL: a redis:// or rediss:// URL, or unset' )
	need( !env.STORAGE_QUOTA || parseBytes( env.STORAGE_QUOTA ) !== null, `STORAGE_QUOTA: a size such as 500M or 5G, not "${ env.STORAGE_QUOTA }"` )

	for ( const [ id, secret ] of [ [ 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET' ], [ 'APPLE_CLIENT_ID', 'APPLE_CLIENT_SECRET' ] ] )
		need( !env[ id ] === !env[ secret ], `${ id } / ${ secret }: set both, or neither — one alone leaves the provider off` )

	if ( production ) {
		need( shared || url( env.BETTER_AUTH_URL ), 'BETTER_AUTH_URL: the site\'s public URL ( https://… ), required in single tenancy' )
		need( !shared || ( !!env.APP_DOMAIN && env.APP_DOMAIN !== 'localhost' ), 'APP_DOMAIN: the domain workspaces are subdomains of, required in shared tenancy' )
		need( !env.DATABASE_URL?.includes( '//postgres:' ), 'DATABASE_URL: connects as postgres — the app must use app_rls, or row-level security is off' )
	}

	return problems
}

export function checkEnv( env = process.env, production = env.NODE_ENV === 'production' ) : void {
	const problems = envProblems( env, production )

	if ( !problems.length )
		return

	const report = `Environment:\n${ problems.map( ( line ) => `  ${ line }` ).join( '\n' ) }`

	if ( production )
		throw new Error( report )

	log.warn( report )
}
