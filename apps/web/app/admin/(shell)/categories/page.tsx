import type { Metadata } from "next";

/**
 * The category screen, currently a placeholder — see the product screen's note
 * for why it exists before the feature does.
 *
 * Categories are their own screen rather than a section of the product one
 * because the tree is edited on its own: `categories.parent_id` (plan.md, data
 * model) makes it a tree the storefront navigates by, not a field on a product.
 */
export const metadata: Metadata = {
  title: "Category",
};

export default function AdminCategoriesPage() {
  return (
    <div className="max-w-[480px]">
      <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
        Category
      </h1>
      <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
        The category tree lands here with the catalog work.
      </p>
    </div>
  );
}
