/*
  Warnings:

  - You are about to drop the column `delay_seconds` on the `user_setting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_setting" DROP COLUMN "delay_seconds",
ADD COLUMN     "delay_minutes" INTEGER NOT NULL DEFAULT 40;
