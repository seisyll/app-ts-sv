-- Mail ( src/lib/server/mail ): the workspace's SMTP server, its own wording per email, and
-- an email switch per notification type.

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "email" BOOLEAN;

-- CreateTable
CREATE TABLE "mail_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "security" TEXT NOT NULL DEFAULT 'starttls',
    "username" TEXT,
    "password" TEXT,
    "from_name" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_templates" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_settings_tenant_id_key" ON "mail_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_templates_tenant_id_key_locale_key" ON "mail_templates"("tenant_id", "key", "locale");

-- AddForeignKey
ALTER TABLE "mail_settings" ADD CONSTRAINT "mail_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_templates" ADD CONSTRAINT "mail_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant-scoped like everything else; the SMTP password column holds ciphertext only.
SELECT app_enable_tenant_rls( 'mail_settings' );
SELECT app_enable_tenant_rls( 'mail_templates' );
