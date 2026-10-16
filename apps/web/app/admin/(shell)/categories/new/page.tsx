import type { Metadata } from "next";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/category-form";

/**
 * The create-category screen.
 *
 * A Server Component that renders no request data: the form is the whole page,
 * and it does not need to know who is signed in — the shell above it has
 * already refused anyone who is not.
 *
 * The route is `/admin/categories/new` rather than a dialog on the list, for
 * the reason the product one gives: it is a place, so it can be linked to,
 * bookmarked, and reloaded without losing what has been typed into it.
 */
export const metadata: Metadata = {
  title: "New category",
};

export default function AdminNewCategoryPage() {
  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/categories"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Categories
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New category
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Created at the top level, with its URL made from the name. Where it
          sits in the tree — parents, siblings, order — arrives with the tree
          screen.
        </p>
      </div>

      <CategoryForm />
    </div>
  );
}
