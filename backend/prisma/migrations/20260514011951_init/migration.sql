/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `first_login_at` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `invite_expires` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `invite_token` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_invite_token_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "deleted_at",
DROP COLUMN "first_login_at",
DROP COLUMN "invite_expires",
DROP COLUMN "invite_token",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "user_setting" ADD COLUMN     "account_token" TEXT,
ADD COLUMN     "chatbot_enabled" BOOLEAN NOT NULL DEFAULT true;
