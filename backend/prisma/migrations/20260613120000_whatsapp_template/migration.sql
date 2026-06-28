-- CreateTable
CREATE TABLE "whatsapp_template" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "body" TEXT NOT NULL,
    "footer" TEXT,
    "meta_template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_template_user_id_status_idx" ON "whatsapp_template"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_user_id_name_language_key" ON "whatsapp_template"("user_id", "name", "language");

-- AddForeignKey
ALTER TABLE "whatsapp_template" ADD CONSTRAINT "whatsapp_template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
