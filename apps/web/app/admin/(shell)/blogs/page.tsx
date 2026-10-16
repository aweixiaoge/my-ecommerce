import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listBlogs } from "@/lib/admin/blogs-repo";

/**
 * The post list.
 *
 * Newest first, with the category each post is filed under and the day it was
 * written. Today the screen's job is the button and the proof it worked — a
 * post can be created and seen; editing arrives as its own step, the way it did
 * for products.
 *
 * It reads the database at request time, which the shell layout has already
 * allowed for the whole admin area.
 */
export const metadata: Metadata = {
  title: "Blog",
};

/**
 * This page is allowed to block, for the reason the product list gives: the
 * shell's own `instant = false` covers the shell, and validation runs per
 * segment, so a page that reads request-time data needs to say so itself — an
 * admin list showing what was saved a moment ago is the point.
 */
export const instant = false;

export default async function AdminBlogsPage() {
  /**
   * The posts are a database read, so this page only means anything at request
   * time. `connection()` is the marker for "prerendering stops here" — baked
   * into the output, the page would render the journal as it stood at build
   * time.
   */
  await connection();

  const blogs = await listBlogs();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            Blog
          </h1>
          <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
            {countLabel(blogs.length)}
          </p>
        </div>

        <Link
          href="/admin/blogs/new"
          className="flex h-11 shrink-0 items-center rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Create blog
        </Link>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Every post in the journal, newest first.
        </caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Title</Th>
            <Th>Category</Th>
            <Th>Created</Th>
          </tr>
        </thead>

        <tbody>
          {blogs.map((blog) => (
            <tr key={blog.id} className="border-b border-line align-top">
              <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                {blog.title}
              </td>
              {/*
                A dash for a post with no category: the form requires one, and
                the column is nullable only so `SetNull` can unfile a post when
                its category is deleted — a dash is the honest way to show that
                state rather than an empty cell that reads as a rendering bug.
              */}
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                {blog.categoryName || "—"}
              </td>
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                {formatDate(blog.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How many posts there are, said the way a person would say it. */
function countLabel(count: number): string {
  return count === 1 ? "1 post." : `${count} posts.`;
}

/**
 * When a post was written, as the list shows it.
 *
 * The admin's first date rendering, so the format is decided here rather than
 * left to `toString()`: `Intl` with a fixed locale, because the admin is
 * English-only for now and a locale that followed the server's environment
 * would change what the same row says depending on where it runs. The value
 * arrives as ISO 8601 and is formatted, never stored preformatted.
 */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
