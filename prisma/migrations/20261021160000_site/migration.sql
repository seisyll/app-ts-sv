-- The public site's words ( src/lib/server/site.ts ): footer details per workspace, and its pages.

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "tagline" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "links" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_pages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_tenant_id_key" ON "site_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_pages_tenant_id_key_locale_key" ON "site_pages"("tenant_id", "key", "locale");

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT app_enable_tenant_rls( 'site_settings' );
SELECT app_enable_tenant_rls( 'site_pages' );
