-- The audit trail ( src/lib/server/audit.ts ). Append-only for the app: it may insert and read,
-- never change or remove a row.

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "target" TEXT,
    "changes" JSONB,
    "ip" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_at_idx" ON "audit_logs"("tenant_id", "at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_action_idx" ON "audit_logs"("tenant_id", "action");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


SELECT app_enable_tenant_rls( 'audit_logs' );

REVOKE UPDATE, DELETE ON audit_logs FROM app_rls;
