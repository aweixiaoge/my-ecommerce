import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BlogForm } from "@/components/admin/blog-form";
import { listBlogCategories } from "@/lib/admin/blog-categories-repo";

/**
 * The create-blog screen.
 *
 * The form is the whole page, and it does not need to know who is signed in —
 * the shell above it has already refused anyone who is not.
 *
 * The route is `/admin/blogs/new` rather than a dialog on the list, for the
 * reason the product one gives: it is a place, so it can be linked to,
 * bookmarked, and reloaded without losing what has been typed into it.
 */
export const metadata: Metadata = {
  title: "New blog",
};

/**
 * Request-time, because the form's category dropdown is a database read: what
 * it offers is the categories that exist when the page is opened, and a
 * prerendered version would offer whatever existed at build time. The same
 * `instant = false` the list page carries, for the same reason.
 */
export const instant = false;

export default async function AdminNewBlogPage() {
  /**
   * `connection()` is the marker for "prerendering stops here" — without it the
   * build renders this page and bakes the dropdown as it stood then, which on a
   * fresh database is an empty one.
   */
  await connection();

  const categories = await listBlogCategories();

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/blogs"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Blogs
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New blog
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          The title becomes the post’s URL. Its first image is the Main one,
          and the description is written in markdown — the preview tab shows it
          as the page will.
        </p>
      </div>

      <BlogForm categories={categories} />
    </div>
  );
}
