-- AlterTable
ALTER TABLE "blog_category_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "blog_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "category_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_option_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_option_value_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_translations" ADD COLUMN     "auto_translated" BOOLEAN NOT NULL DEFAULT false;
