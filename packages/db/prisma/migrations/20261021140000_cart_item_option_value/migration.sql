-- DropIndex
DROP INDEX "cart_items_cart_id_variant_id_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "option_value_id" TEXT;

-- CreateIndex
CREATE INDEX "cart_items_option_value_id_idx" ON "cart_items"("option_value_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_variant_id_option_value_id_key" ON "cart_items"("cart_id", "variant_id", "option_value_id");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
