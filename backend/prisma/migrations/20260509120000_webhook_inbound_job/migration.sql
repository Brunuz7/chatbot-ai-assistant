-- CreateTable
CREATE TABLE "webhook_inbound_job" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "instance_name" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "event_normalized" TEXT NOT NULL,
    "inbound_kind" TEXT NOT NULL DEFAULT 'message_inbound',
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_inbound_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_inbound_job_status_created_at_idx" ON "webhook_inbound_job"("status", "created_at");

-- CreateIndex
CREATE INDEX "webhook_inbound_job_connection_id_idx" ON "webhook_inbound_job"("connection_id");

-- AddForeignKey
ALTER TABLE "webhook_inbound_job" ADD CONSTRAINT "webhook_inbound_job_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
