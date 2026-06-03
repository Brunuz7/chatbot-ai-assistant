-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT,
    "company_segment" TEXT,
    "phone_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_by" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_contact" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "whatsapp_id" TEXT,
    "observation" TEXT,
    "name" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMP(3),
    "blocked_until" TIMESTAMP(3),
    "block_reason" TEXT,
    "outside_hours_notified" BOOLEAN NOT NULL DEFAULT false,
    "tag_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_instruction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_instruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_setting" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "notification_email" TEXT,
    "delay_seconds" INTEGER NOT NULL DEFAULT 40,
    "chatbot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "account_token" TEXT,
    "working_hours" JSONB,
    "holidays" JSONB NOT NULL,
    "tagging_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tts_reply_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tts_voice_type" TEXT NOT NULL DEFAULT 'preset',
    "tts_voice" TEXT NOT NULL DEFAULT 'nova',
    "tts_model" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini-tts-2025-12-15',
    "tts_max_chars" INTEGER NOT NULL DEFAULT 500,
    "mistral_voice_id" TEXT,
    "whatsapp_channel" TEXT NOT NULL DEFAULT 'evolution',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EVOLUTION',
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "instance_id" TEXT,
    "chatbot_enabled" BOOLEAN NOT NULL DEFAULT false,
    "access_token" TEXT,
    "phone_number_id" TEXT,
    "waba_id" TEXT,
    "business_account_id" TEXT,
    "display_phone" TEXT,
    "verified_name" TEXT,
    "last_validated_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'main',
    "objective" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "entry_instruction" TEXT,
    "entry_mode" TEXT NOT NULL DEFAULT 'instruction',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "trigger_keywords" JSONB,
    "trigger_intents" JSONB,
    "entry_events" JSONB,
    "type" TEXT NOT NULL DEFAULT 'interpret',
    "content" TEXT,
    "metadata" JSONB,
    "next_flow_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "whatsapp_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_message_direction" TEXT,
    "last_message_preview" TEXT,
    "agent_id" TEXT,
    "active_flow_id" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "flow_id" TEXT,
    "current_node_id" TEXT,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "paused_reason" TEXT,
    "pending_message" TEXT,
    "instance_name" TEXT,
    "whatsapp_id" TEXT,
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "user_slug_key" ON "user"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");

-- CreateIndex
CREATE INDEX "user_contact_user_id_idx" ON "user_contact"("user_id");

-- CreateIndex
CREATE INDEX "user_contact_tag_id_idx" ON "user_contact"("tag_id");

-- CreateIndex
CREATE INDEX "user_contact_deleted_at_idx" ON "user_contact"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_contact_user_id_phone_number_key" ON "user_contact"("user_id", "phone_number");

-- CreateIndex
CREATE INDEX "tag_user_id_idx" ON "tag"("user_id");

-- CreateIndex
CREATE INDEX "tag_deleted_at_idx" ON "tag"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tag_user_id_name_key" ON "tag"("user_id", "name");

-- CreateIndex
CREATE INDEX "user_instruction_user_id_idx" ON "user_instruction"("user_id");

-- CreateIndex
CREATE INDEX "user_instruction_deleted_at_idx" ON "user_instruction"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_setting_user_id_key" ON "user_setting"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_key" ON "refresh_token"("token");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "connection_instance_id_key" ON "connection"("instance_id");

-- CreateIndex
CREATE INDEX "connection_user_id_idx" ON "connection"("user_id");

-- CreateIndex
CREATE INDEX "connection_user_id_type_idx" ON "connection"("user_id", "type");

-- CreateIndex
CREATE INDEX "webhook_inbound_job_status_created_at_idx" ON "webhook_inbound_job"("status", "created_at");

-- CreateIndex
CREATE INDEX "webhook_inbound_job_connection_id_idx" ON "webhook_inbound_job"("connection_id");

-- CreateIndex
CREATE INDEX "agent_user_id_idx" ON "agent"("user_id");

-- CreateIndex
CREATE INDEX "agent_deleted_at_idx" ON "agent"("deleted_at");

-- CreateIndex
CREATE INDEX "flow_user_id_idx" ON "flow"("user_id");

-- CreateIndex
CREATE INDEX "flow_agent_id_idx" ON "flow"("agent_id");

-- CreateIndex
CREATE INDEX "flow_next_flow_id_idx" ON "flow"("next_flow_id");

-- CreateIndex
CREATE INDEX "flow_deleted_at_idx" ON "flow"("deleted_at");

-- CreateIndex
CREATE INDEX "conversation_whatsapp_id_idx" ON "conversation"("whatsapp_id");

-- CreateIndex
CREATE INDEX "conversation_user_id_idx" ON "conversation"("user_id");

-- CreateIndex
CREATE INDEX "conversation_contact_id_idx" ON "conversation"("contact_id");

-- CreateIndex
CREATE INDEX "conversation_agent_id_idx" ON "conversation"("agent_id");

-- CreateIndex
CREATE INDEX "conversation_active_flow_id_idx" ON "conversation"("active_flow_id");

-- CreateIndex
CREATE INDEX "conversation_user_id_updated_at_idx" ON "conversation"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "conversation_updated_at_idx" ON "conversation"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_user_id_whatsapp_id_key" ON "conversation"("user_id", "whatsapp_id");

-- CreateIndex
CREATE INDEX "knowledge_base_user_id_idx" ON "knowledge_base"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_base_user_id_updated_at_idx" ON "knowledge_base"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "knowledge_base_deleted_at_idx" ON "knowledge_base"("deleted_at");

-- CreateIndex
CREATE INDEX "system_log_user_id_idx" ON "system_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_state_user_id_contact_id_key" ON "conversation_state"("user_id", "contact_id");

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
ALTER TABLE "user" ADD CONSTRAINT "user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contact" ADD CONSTRAINT "user_contact_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_instruction" ADD CONSTRAINT "user_instruction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_setting" ADD CONSTRAINT "user_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_inbound_job" ADD CONSTRAINT "webhook_inbound_job_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow" ADD CONSTRAINT "flow_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow" ADD CONSTRAINT "flow_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow" ADD CONSTRAINT "flow_next_flow_id_fkey" FOREIGN KEY ("next_flow_id") REFERENCES "flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_active_flow_id_fkey" FOREIGN KEY ("active_flow_id") REFERENCES "flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_log" ADD CONSTRAINT "system_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_campaign" ADD CONSTRAINT "bulk_message_campaign_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_delivery" ADD CONSTRAINT "bulk_message_delivery_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "bulk_message_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_message_delivery" ADD CONSTRAINT "bulk_message_delivery_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
