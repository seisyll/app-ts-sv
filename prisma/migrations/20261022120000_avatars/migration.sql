-- Uploaded avatars ( src/lib/server/avatars.ts ): a user's picture is one of the workspace's media files.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_id" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
