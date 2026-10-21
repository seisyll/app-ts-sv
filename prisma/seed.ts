import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/lib/server/db/generated/client'

// Development data. Idempotent: safe to run again. Runs as the owner ( tenants are not
// writable by the app ): bun run db:seed
const prisma = new PrismaClient( { adapter: new PrismaPg( { connectionString: process.env.DATABASE_OWNER_URL } ) } )

const slug = process.env.TENANT_SLUG || 'default'
const name = process.env.TENANT_NAME || 'Acme Inc'

try {
	const tenant = await prisma.tenant.upsert( { where: { slug }, update: {}, create: { slug, name } } )

	console.log( `✔ tenant "${ tenant.slug }" ( ${ tenant.id } )` )
} finally {
	await prisma.$disconnect()
}
