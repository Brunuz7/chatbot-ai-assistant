-- AlterTable
ALTER TABLE "conversation_state" ADD COLUMN     "instance_name" TEXT,
ADD COLUMN     "pending_message" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "whatsapp_id" TEXT;
