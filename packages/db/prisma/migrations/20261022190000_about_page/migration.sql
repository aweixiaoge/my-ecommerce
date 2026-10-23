-- AlterTable
ALTER TABLE "media" ADD COLUMN     "about_page" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "about_translations" (
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "auto_translated" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_translations_pkey" PRIMARY KEY ("locale")
);

-- CreateIndex
CREATE INDEX "media_about_page_idx" ON "media"("about_page");

