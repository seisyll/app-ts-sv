-- Captcha ( src/lib/server/captcha.ts ): one row per workspace, its secret encrypted.

-- CreateTable
CREATE TABLE "captcha_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'turnstile',
    "site_key" TEXT NOT NULL DEFAULT '',
    "secret" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'adaptive',
    "trigger_after" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "captcha_settings_tenant_id_key" ON "captcha_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "captcha_settings" ADD CONSTRAINT "captcha_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


SELECT app_enable_tenant_rls( 'captcha_settings' );
