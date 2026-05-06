-- AlterTable
ALTER TABLE "user_contact" ADD COLUMN     "block_reason" TEXT,
ADD COLUMN     "blocked_at" TIMESTAMP(3),
ADD COLUMN     "blocked_until" TIMESTAMP(3);
