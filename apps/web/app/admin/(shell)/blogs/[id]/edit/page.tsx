import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BlogForm } from "@/components/admin/blog-form";
import { listBlogCategories } from "@/lib/admin/blog-categories-repo";
import { getBlogForEdit } from "@/lib/admin/blogs-repo";

/**
 * Editing a post.
 *
 * The same form as `/admin/blogs/new`, handed the post — the product edit
 * screen's arrangement, for its reason: one set of fields, so the two screens
 * cannot drift apart.
 */
export const metadata: Metadata = {
  title: "Edit blog",
};

/** Request-time, like the list it came from: the post is a database read. */
export const instant = false;

export default async function AdminEditBlogPage({ params }: PageProps<"/admin/blogs/[id]/edit">) {
  await connection();

  const { id } = await params;
  const [categories, blog] = await Promise.all([listBlogCategories(), getBlogForEdit(id)]);

  // An id in a URL is an id anyone can type: a missing post is a 404.
  if (!blog) notFound();

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/blogs"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Blogs
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">Edit blog</h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          The Journal shows what you save here. Changing the title changes the post&apos;s URL, and saving
          re-translates the languages that were translated automatically.
        </p>
      </div>

      {/*
        Keyed by when the row last changed, for the product edit screen's
        reason: Next keeps a route's client state while you are away, and the
        form seeds its fields once — without a key that moves, reopening a post
        you just saved would show the values from before the save.
      */}
      <BlogForm key={blog.updatedAt} blog={blog} categories={categories} />
    </div>
  );
}
