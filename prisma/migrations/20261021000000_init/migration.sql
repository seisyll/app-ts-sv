-- ════════════════════════════════════════════════════════════════════════════════════
--  Init. Prisma generated the tables ( middle section ); the tenant-isolation parts above
--  and below are hand-written — Prisma can't express them. See README "Database".
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── The app's database role ───────────────────────────────────────────────────────────
-- The running app connects as app_rls: not the owner, not superuser, no BYPASSRLS — so
-- row-level security applies to every query it makes. Login and password are granted
-- by `bun run db:provision`, never by a migration.
DO $$
BEGIN
	IF NOT EXISTS ( SELECT FROM pg_roles WHERE rolname = 'app_rls' ) THEN
		CREATE ROLE app_rls NOLOGIN;
	END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_rls;

-- ── The request's tenant ──────────────────────────────────────────────────────────────
-- Set per transaction by the app: SELECT set_config( 'app.current_tenant', <id>, true ).
-- Unset or empty reads as NULL, which matches no row ( fail closed ). Also the default of
-- every tenant_id column, so inserts stamp themselves.
CREATE FUNCTION app_current_tenant() RETURNS uuid
	LANGUAGE sql STABLE
	AS $$ SELECT NULLIF( current_setting( 'app.current_tenant', true ), '' )::uuid $$;

-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('active', 'suspended');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "user_id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ,
    "refresh_token_expires_at" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "last_request" BIGINT NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "impersonated_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" "tenant_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_provider_id_account_id_key" ON "accounts"("tenant_id", "provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_tenant_id_key_key" ON "rate_limits"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_tenant_id_idx" ON "sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "verifications_tenant_id_identifier_idx" ON "verifications"("tenant_id", "identifier");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Tenant isolation ──────────────────────────────────────────────────────────────────
-- One call per tenant-scoped table, in the migration that creates it:
--   SELECT app_enable_tenant_rls( 'invoices' );
-- FORCE so even the table owner obeys the policy; `( SELECT app_current_tenant() )` so it
-- is evaluated once per statement, not per row. Grants are given HERE and nowhere else:
-- a table that was never enabled is "permission denied" for the app, never readable.
CREATE FUNCTION app_enable_tenant_rls( target regclass ) RETURNS void
	LANGUAGE plpgsql
	AS $$
BEGIN
	EXECUTE format( 'ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target );
	EXECUTE format( 'ALTER TABLE %s FORCE ROW LEVEL SECURITY', target );
	EXECUTE format(
		'CREATE POLICY tenant_isolation ON %s USING ( tenant_id = ( SELECT app_current_tenant() ) ) WITH CHECK ( tenant_id = ( SELECT app_current_tenant() ) )',
		target
	);
	EXECUTE format( 'GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO app_rls', target );
END $$;

REVOKE ALL ON FUNCTION app_enable_tenant_rls( regclass ) FROM PUBLIC;

SELECT app_enable_tenant_rls( 'users' );
SELECT app_enable_tenant_rls( 'sessions' );
SELECT app_enable_tenant_rls( 'accounts' );
SELECT app_enable_tenant_rls( 'verifications' );
SELECT app_enable_tenant_rls( 'rate_limits' );

-- Control plane: the app may read tenants ( to resolve a request ), never write them.
GRANT SELECT ON tenants TO app_rls;
