-- AlterTable
ALTER TABLE "flow" ADD COLUMN     "entry_mode" TEXT NOT NULL DEFAULT 'always_idle',
ADD COLUMN     "entry_step_key" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trigger_keywords" JSONB,
ADD COLUMN     "trigger_intents" JSONB,
ADD COLUMN     "entry_events" JSONB;

-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "active_flow_id" TEXT;

-- CreateIndex
CREATE INDEX "conversation_active_flow_id_idx" ON "conversation"("active_flow_id");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_active_flow_id_fkey" FOREIGN KEY ("active_flow_id") REFERENCES "flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
