import pg from 'pg'

// Gives the app role a login + password ( migrations create it NOLOGIN ). Re-runnable, so
// it doubles as password rotation. Runs as the owner: bun run db:provision
const ownerUrl = process.env.DATABASE_OWNER_URL
const password = process.env.APP_RLS_PASSWORD

if ( !ownerUrl || !password )
	throw new Error( 'Set DATABASE_OWNER_URL and APP_RLS_PASSWORD ( see .env.example ).' )

if ( password.length < 16 )
	throw new Error( 'APP_RLS_PASSWORD must be at least 16 characters.' )

const client = new pg.Client( { connectionString: ownerUrl } )

await client.connect()

try {
	await client.query( `ALTER ROLE app_rls LOGIN PASSWORD ${ client.escapeLiteral( password ) }` )
	console.log( '✔ app_rls can log in' )
} finally {
	await client.end()
}
