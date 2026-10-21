-- Workspace brand ( src/lib/server/brand.ts ): the logo and the favicon, both public media.
-- Deleting the file clears the setting rather than failing the delete.

-- AlterTable
ALTER TABLE "appearance_settings" ADD COLUMN "logo_media_id" UUID,
ADD COLUMN "favicon_media_id" UUID;

-- AddForeignKey
ALTER TABLE "appearance_settings" ADD CONSTRAINT "appearance_settings_logo_media_id_fkey" FOREIGN KEY ("logo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appearance_settings" ADD CONSTRAINT "appearance_settings_favicon_media_id_fkey" FOREIGN KEY ("favicon_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
