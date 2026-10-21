import path from 'node:path'
import type { PrismaConfig } from 'prisma'

// Prisma CLI ( generate, migrate ). Migrations run as the database OWNER; the app itself
// connects as app_rls ( src/lib/server/db ). `bun run` loads .env, so no dotenv here.
export default {
	// One file per model in prisma/schema/.
	schema    : path.join( 'prisma', 'schema' ),
	// Pinned: with a schema folder Prisma would otherwise look in prisma/schema/migrations.
	migrations: { path: path.join( 'prisma', 'migrations' ) },
	datasource: {
		// Fallback keeps `prisma generate` ( no DB needed ) working without a .env.
		url: process.env.DATABASE_OWNER_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5433/app'
	}
} satisfies PrismaConfig
