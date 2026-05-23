-- CreateTable
CREATE TABLE "bulk_message_campaign" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "message" TEXT NOT NULL,
    "tag_ids" JSONB NOT NULL DEFAULT '[]',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "instance_name" TEXT NOT NULL,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3),
    "next_send_at" TIMESTAMP(3),
    "paused_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_message_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_message_delivery" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "whatsapp_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_message_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_message_campaign_user_id_status_idx" ON "bulk_message_campaign"("user_id", "status");

-- CreateIndex
CREATE INDEX "bulk_message_campaign_status_scheduled_at_idx" ON "bulk_message_campaign"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "bulk_message_campaign_status_next_send_at_idx" ON "bulk_message_campaign"("status", "next_send_at");

-- CreateIndex
CREATE INDEX "bulk_message_delivery_campaign_id_status_idx" ON "bulk_message_delivery"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_message_delivery_campaign_id_contact_id_key" ON "bulk_message_delivery"("campaign_id", "contact_id");

-- AddForeignKey
ALTER TABLE "bulk_message_campaign" ADD CONSTRAINT "bulk_message_campaign_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_delivery" ADD CONSTRAINT "bulk_message_delivery_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "bulk_message_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_delivery" ADD CONSTRAINT "bulk_message_delivery_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
