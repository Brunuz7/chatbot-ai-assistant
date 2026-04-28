-- CreateTable
CREATE TABLE "blocked_contact" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_contact_number_key" ON "blocked_contact"("number");
