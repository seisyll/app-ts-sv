-- A workspace's media storage limit ( src/lib/server/storage.ts ): null is the deployment's default.

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "storage_quota" BIGINT;
