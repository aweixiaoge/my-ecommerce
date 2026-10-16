import type { Metadata } from "next";
import Link from "next/link";
import { BlogCategoryForm } from "@/components/admin/blog-category-form";

/**
 * The create-blog-category screen.
 *
 * A Server Component that renders no request data: the form is the whole page,
 * and it does not need to know who is signed in — the shell above it has
 * already refused anyone who is not.
 *
 * The route is `/admin/blog-categories/new` rather than a dialog on the list,
 * for the reason the product category one gives: it is a place, so it can be
 * linked to, bookmarked, and reloaded without losing what has been typed into
 * it.
 */
export const metadata: Metadata = {
  title: "New blog category",
};

export default function AdminNewBlogCategoryPage() {
  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/blog-categories"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Blog categories
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New blog category
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Created with its URL made from the name. Posts are filed under it
          from the blog form’s dropdown.
        </p>
      </div>

      <BlogCategoryForm />
    </div>
  );
}
