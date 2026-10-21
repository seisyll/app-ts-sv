-- Appearance ( src/lib/appearance.ts ): a workspace default and personal overrides.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appearance_palette" TEXT,
ADD COLUMN     "appearance_radius" TEXT,
ADD COLUMN     "appearance_style" TEXT;

-- CreateTable
CREATE TABLE "appearance_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "palette" TEXT NOT NULL DEFAULT 'neutral',
    "style" TEXT NOT NULL DEFAULT 'vega',
    "radius" TEXT NOT NULL DEFAULT 'medium',
    "allow_user_override" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appearance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appearance_settings_tenant_id_key" ON "appearance_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "appearance_settings" ADD CONSTRAINT "appearance_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT app_enable_tenant_rls( 'appearance_settings' );
