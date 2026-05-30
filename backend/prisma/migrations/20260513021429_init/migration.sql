/*
  Warnings:

  - A unique constraint covering the columns `[invite_token]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "first_login_at" TIMESTAMP(3),
ADD COLUMN     "invite_expires" TIMESTAMP(3),
ADD COLUMN     "invite_token" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_token_key" ON "user"("invite_token");
