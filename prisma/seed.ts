import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient } from '../src/lib/server/db/generated/client'

// Development data. Idempotent: safe to run again. Runs as the owner ( tenants are not
// writable by the app ): bun run db:seed
const prisma = new PrismaClient( { adapter: new PrismaPg( { connectionString: process.env.DATABASE_OWNER_URL } ) } )

const slug = process.env.TENANT_SLUG || 'default'
const name = process.env.TENANT_NAME || 'Acme Inc'

// An admin who signs in with a password. The owner bypasses RLS, so tenantId is set
// explicitly; the hash is better-auth's own scrypt. An existing account is left as it is.
async function seedAdmin( tenantId : string, label : string, email : string | undefined, password : string | undefined, userName : string ) {
	if ( !email || !password )
		return console.log( `· no ${ label } email / password: skipped` )

	email = email.toLowerCase()

	if ( await prisma.user.findUnique( { where: { tenantId_email: { tenantId, email } } } ) )
		return console.log( `· ${ label } ${ email } exists` )

	const hash = await hashPassword( password )

	await prisma.$transaction( async( tx ) => {
		const user = await tx.user.create( { data: { tenantId, email, name: userName, role: 'admin', emailVerified: true } } )

		// better-auth's credential account: accountId is the user id.
		await tx.account.create( { data: { tenantId, userId: user.id, providerId: 'credential', accountId: user.id, password: hash } } )
	} )
	console.log( `✔ ${ label } ${ email }` )
}

try {
	const tenant = await prisma.tenant.upsert( { where: { slug }, update: {}, create: { slug, name } } )

	console.log( `✔ tenant "${ tenant.slug }" ( ${ tenant.id } )` )

	// The first admin: sign-up is off by default, so someone has to exist.
	await seedAdmin( tenant.id, 'admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, process.env.ADMIN_NAME || 'Admin' )

	// A demo admin with a known password, for local work and coding agents. Never in production.
	if ( process.env.NODE_ENV === 'production' )
		console.log( '· production: skipped the demo admin' )
	else
		await seedAdmin( tenant.id, 'demo admin', process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD, 'Demo' )
} finally {
	await prisma.$disconnect()
}
