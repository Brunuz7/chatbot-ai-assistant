-- Add optional profile fields to user table (registration).

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "company_name" TEXT,
ADD COLUMN IF NOT EXISTS "company_segment" TEXT,
ADD COLUMN IF NOT EXISTS "phone_number" TEXT;

