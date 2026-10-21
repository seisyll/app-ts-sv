import pg from 'pg'
import { formatBytes, parseBytes } from '../src/lib/bytes.ts'

/* ―― » One workspace's storage limit ( src/lib/server/storage.ts ). Runs as the owner:

          bun run tenant:quota                  every tenant and its limit
          bun run tenant:quota acme 20G         acme may store 20 GB
          bun run tenant:quota acme unlimited   no limit for acme
          bun run tenant:quota acme default     back to STORAGE_QUOTA

        Applies to the next upload. */

const [ slug, value ] = process.argv.slice( 2 )
const ownerUrl = process.env.DATABASE_OWNER_URL

if ( !ownerUrl )
	throw new Error( 'Set DATABASE_OWNER_URL ( see .env.example ).' )

const fallback = process.env.STORAGE_QUOTA ? `the default, ${ process.env.STORAGE_QUOTA }` : 'the default: no limit'
const describe = ( quota : string | null ) => ( quota === null ? fallback : quota === '0' ? 'no limit' : formatBytes( Number( quota ) ) )

const client = new pg.Client( { connectionString: ownerUrl } )

await client.connect()

try {
	if ( !slug ) {
		const { rows } = await client.query<{ slug : string, storage_quota : string | null }>( 'SELECT slug, storage_quota FROM tenants ORDER BY slug' )

		for ( const row of rows )
			console.log( `${ row.slug }: ${ describe( row.storage_quota ) }` )
	} else {
		const bytes = value === 'default' ? null : value === 'unlimited' ? 0 : parseBytes( value )

		if ( bytes === null && value !== 'default' )
			throw new Error( `"${ value ?? '' }": a size ( 500M, 20G ), unlimited or default.` )

		const { rowCount } = await client.query( 'UPDATE tenants SET storage_quota = $2 WHERE slug = $1', [ slug, bytes ] )

		if ( !rowCount )
			throw new Error( `No tenant "${ slug }".` )

		console.log( `✔ ${ slug }: ${ describe( bytes === null ? null : String( bytes ) ) }` )
	}
} finally {
	await client.end()
}
