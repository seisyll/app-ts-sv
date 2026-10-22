import pg from 'pg'
import { MODULE_IDS, withRequirements, type ModuleId } from '../config/modules.ts'

/* ―― » Switch modules off ( or back on ) for one workspace: the per-tenant half of the module
        registry ( config/modules.ts ). The build decides what exists at all; this only takes
        away. Runs as the owner:

          bun run tenant:modules                     every tenant and what it has off
          bun run tenant:modules acme -mail -media   switch those off for acme
          bun run tenant:modules acme +mail          and one back on
          bun run tenant:modules acme all            everything the build ships

        Lands within a minute ( tenant resolution caches for that long ). */

const [ slug, ...changes ] = process.argv.slice( 2 )
const ownerUrl = process.env.DATABASE_OWNER_URL

if ( !ownerUrl )
	throw new Error( 'Set DATABASE_OWNER_URL ( see .env.example ).' )

const describe = ( off : string[] ) => {
	if ( !off.length )
		return 'everything the build ships'

	// Off as well: what needs a module that's off.
	const kept = withRequirements( MODULE_IDS.filter( ( id ) => !off.includes( id ) ) )
	const dragged = MODULE_IDS.filter( ( id ) => !off.includes( id ) && !kept.has( id ) )

	return `off: ${ off.join( ', ' ) }${ dragged.length ? ` ( so also ${ dragged.join( ', ' ) }, which need them )` : '' }`
}

const client = new pg.Client( { connectionString: ownerUrl } )

await client.connect()

try {
	if ( !slug ) {
		const { rows } = await client.query<{ slug : string, modules_off : string[] | null }>( 'SELECT slug, modules_off FROM tenants ORDER BY slug' )

		for ( const row of rows )
			console.log( `${ row.slug }: ${ describe( row.modules_off ?? [] ) }` )
	} else {
		const { rows: [ tenant ] } = await client.query<{ modules_off : string[] | null }>( 'SELECT modules_off FROM tenants WHERE slug = $1', [ slug ] )

		if ( !tenant )
			throw new Error( `No tenant "${ slug }".` )

		const off = new Set( tenant.modules_off ?? [] )

		for ( const change of changes ) {
			const id = change.slice( 1 ) as ModuleId

			if ( change === 'all' )
				off.clear()
			else if ( ( change[ 0 ] === '+' || change[ 0 ] === '-' ) && MODULE_IDS.includes( id ) ) {
				if ( change[ 0 ] === '-' )
					off.add( id )
				else
					off.delete( id )
			} else
				throw new Error( `"${ change }": use -<module>, +<module> or all. Modules: ${ MODULE_IDS.join( ', ' ) }.` )
		}

		await client.query( 'UPDATE tenants SET modules_off = $1 WHERE slug = $2', [ [ ...off ], slug ] )
		console.log( `✔ ${ slug }: ${ describe( [ ...off ] ) }` )
	}
} finally {
	await client.end()
}
