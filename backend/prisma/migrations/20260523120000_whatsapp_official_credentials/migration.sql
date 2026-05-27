-- AlterTable
ALTER TABLE "connection" ADD COLUMN "access_token" TEXT,
ADD COLUMN "phone_number_id" TEXT,
ADD COLUMN "waba_id" TEXT,
ADD COLUMN "business_account_id" TEXT,
ADD COLUMN "display_phone" TEXT,
ADD COLUMN "verified_name" TEXT,
ADD COLUMN "last_validated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "connection_user_id_type_idx" ON "connection"("user_id", "type");
