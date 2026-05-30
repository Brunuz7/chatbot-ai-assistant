/*
  Warnings:

  - You are about to drop the column `delay_minutes` on the `user_setting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_setting" DROP COLUMN "delay_minutes",
ADD COLUMN     "delay_seconds" INTEGER NOT NULL DEFAULT 40;
