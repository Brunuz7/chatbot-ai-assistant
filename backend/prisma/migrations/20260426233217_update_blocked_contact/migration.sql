/*
  Warnings:

  - You are about to drop the column `created_at` on the `blocked_contact` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `blocked_contact` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `blocked_contact` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone_number]` on the table `blocked_contact` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone_number` to the `blocked_contact` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "blocked_contact_number_key";

-- AlterTable
ALTER TABLE "blocked_contact" DROP COLUMN "created_at",
DROP COLUMN "number",
DROP COLUMN "reason",
ADD COLUMN     "blocked_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "observation" TEXT,
ADD COLUMN     "phone_number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "blocked_contact_phone_number_key" ON "blocked_contact"("phone_number");
