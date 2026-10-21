-- Public media ( src/lib/server/media.ts ): a file anyone on the workspace's host may fetch,
-- e.g. its logo or an image in an email. Existing files stay private.

-- AlterTable
ALTER TABLE "media" ADD COLUMN "public" BOOLEAN NOT NULL DEFAULT false;
