-- CreateTable
CREATE TABLE "faq_translations" (
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "auto_translated" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_translations_pkey" PRIMARY KEY ("locale")
);
