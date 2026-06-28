-- AlterTable
ALTER TABLE "user" ADD COLUMN "plan_id" TEXT NOT NULL DEFAULT 'starter';

-- CreateIndex
CREATE INDEX "user_plan_id_idx" ON "user"("plan_id");
