-- Adds the kind to a product option.
--
-- Hand-written rather than generated, because there is no default to give a
-- column that is about to be NOT NULL — the kind has to be worked out from the
-- rows that are already there. What they have is the English word in their
-- translation row, which is the only record of it that existed before this
-- column, so that is what the backfill reads.
--
-- Generated step 1 of 3, plus the backfill Prisma cannot express.

-- CreateEnum
CREATE TYPE "AttributeKind" AS ENUM ('color', 'size');

-- AlterTable
ALTER TABLE "product_options" ADD COLUMN "kind" "AttributeKind";

-- Backfill from the translation. Anything that is not "Size" is a colour:
-- `color` is the only other kind this app has ever written, and the create
-- form offers exactly these two (`ATTRIBUTE_LABELS` in the shared schema).
UPDATE "product_options" o
SET "kind" = CASE
  WHEN t."name" = 'Size' THEN 'size'::"AttributeKind"
  ELSE 'color'::"AttributeKind"
END
FROM "product_option_translations" t
WHERE t."option_id" = o."id" AND t."locale" = 'en';

-- An option with no English translation is not something this app writes. It
-- still needs a kind to be NOT NULL, and colour is the honest guess: it is the
-- option the create form adds first.
UPDATE "product_options"
SET "kind" = 'color'::"AttributeKind"
WHERE "kind" IS NULL;

-- AlterTable
ALTER TABLE "product_options" ALTER COLUMN "kind" SET NOT NULL;
