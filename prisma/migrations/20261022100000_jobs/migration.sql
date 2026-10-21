-- Scheduled jobs' last runs ( src/lib/server/jobs ): deployment-wide, written by the app.

-- CreateTable
CREATE TABLE "job_runs" (
    "name" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "ok" BOOLEAN,
    "count" INTEGER,
    "error" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("name")
);

-- Not a tenant's table: the app reads and writes it whole.
GRANT SELECT, INSERT, UPDATE ON job_runs TO app_rls;
