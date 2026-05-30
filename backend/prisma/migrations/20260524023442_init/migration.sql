/*
  Warnings:

  - You are about to drop the `processed_message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "processed_message";

-- CreateTable
CREATE TABLE "conversation_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "flow_id" TEXT,
    "current_node_id" TEXT,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "paused_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_state_user_id_contact_id_key" ON "conversation_state"("user_id", "contact_id");

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
