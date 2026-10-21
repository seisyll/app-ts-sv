-- Modules a workspace has switched off ( config/modules.ts, src/lib/server/modules.ts ).
-- The control plane: no RLS; the app role reads it, bun run tenant:modules writes it.

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "modules_off" TEXT[] DEFAULT ARRAY[]::TEXT[];

