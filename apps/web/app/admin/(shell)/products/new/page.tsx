import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ProductForm } from "@/components/admin/product-form";
import { listCategories } from "@/lib/admin/categories-repo";

/**
 * The create-product screen.
 *
 * The form is the whole page, and it does not need to know who is signed in —
 * the shell above it has already refused anyone who is not.
 *
 * The route is `/admin/products/new` rather than a modal or a mode on the list
 * because it is a place: it can be linked to, bookmarked, and reloaded without
 * losing what has been typed into it.
 */
export const metadata: Metadata = {
  title: "New product",
};

/**
 * Request-time, because the form's category dropdown is a database read: what
 * it offers is the categories that exist when the page is opened, and a
 * prerendered version would offer whatever existed at build time. The same
 * `instant = false` the list and edit pages carry, for the same reason — the
 * shell's own opt-out keeps the sign-in check blocking, but validation runs per
 * segment, so a page that reads request data has to say so itself.
 */
export const instant = false;

export default async function AdminNewProductPage() {
  /**
   * `connection()` is the marker for "prerendering stops here" — without it the
   * build renders this page and bakes the dropdown as it stood then, which on a
   * fresh database is an empty one.
   */
  await connection();

  const categories = await listCategories();

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/products"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Products
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New product
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Saved as a draft. Price and stock belong to the variant a colour is
          sold as, so give each colour its images and figures here — and leave
          any of them blank for now if you have not settled on them yet.
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
