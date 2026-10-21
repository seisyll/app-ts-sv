import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient } from '../src/lib/server/db/generated/client'

// Development data. Idempotent: safe to run again. Runs as the owner ( tenants are not
// writable by the app ): bun run db:seed
const prisma = new PrismaClient( { adapter: new PrismaPg( { connectionString: process.env.DATABASE_OWNER_URL } ) } )

const slug = process.env.TENANT_SLUG || 'default'
const name = process.env.TENANT_NAME || 'Acme Inc'

try {
	const tenant = await prisma.tenant.upsert( { where: { slug }, update: {}, create: { slug, name } } )

	console.log( `✔ tenant "${ tenant.slug }" ( ${ tenant.id } )` )

	// The first admin ( sign-up is off by default, so someone has to exist ). The owner
	// bypasses RLS, so tenantId is set explicitly; the hash is better-auth's own scrypt.
	const email = process.env.ADMIN_EMAIL?.toLowerCase()
	const password = process.env.ADMIN_PASSWORD

	if ( !email || !password ) {
		console.log( '· no ADMIN_EMAIL / ADMIN_PASSWORD: skipped the admin user' )
	} else if ( await prisma.user.findUnique( { where: { tenantId_email: { tenantId: tenant.id, email } } } ) ) {
		console.log( `· admin ${ email } exists` )
	} else {
		const hash = await hashPassword( password )

		await prisma.$transaction( async( tx ) => {
			const user = await tx.user.create( { data: { tenantId: tenant.id, email, name: process.env.ADMIN_NAME || 'Admin', role: 'admin', emailVerified: true } } )

			// better-auth's credential account: accountId is the user id.
			await tx.account.create( { data: { tenantId: tenant.id, userId: user.id, providerId: 'credential', accountId: user.id, password: hash } } )
		} )
		console.log( `✔ admin ${ email }` )
	}
} finally {
	await prisma.$disconnect()
}
