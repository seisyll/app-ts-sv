-- Sign-in attempts ( src/lib/server/sign-ins.ts ): every try, its outcome and where it came from.

-- CreateTable
CREATE TABLE "sign_in_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL DEFAULT app_current_tenant(),
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "sign_in_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sign_in_events_tenant_id_at_idx" ON "sign_in_events"("tenant_id", "at");

-- CreateIndex
CREATE INDEX "sign_in_events_tenant_id_user_id_at_idx" ON "sign_in_events"("tenant_id", "user_id", "at");

-- AddForeignKey
ALTER TABLE "sign_in_events" ADD CONSTRAINT "sign_in_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_in_events" ADD CONSTRAINT "sign_in_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


SELECT app_enable_tenant_rls( 'sign_in_events' );
