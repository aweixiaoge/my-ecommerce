import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listBlogCategories } from "@/lib/admin/blog-categories-repo";

/**
 * The blog category list.
 *
 * The same screen as the product category one, one entity over — and titled
 * "Blog category" rather than "Category" so the two do not share an `<h1>` in
 * the same admin. The nav's item keeps the short label, the way a tab and a
 * page title can differ.
 *
 * It reads the database at request time, which the shell layout has already
 * allowed for the whole admin area.
 */
export const metadata: Metadata = {
  title: "Blog category",
};

/**
 * This page is allowed to block, for the reason the product list gives: the
 * shell's own `instant = false` covers the shell, and validation runs per
 * segment, so a page that reads request-time data has to say so itself — an
 * admin list showing what was saved a moment ago is the point.
 */
export const instant = false;

export default async function AdminBlogCategoriesPage() {
  /**
   * The categories are a database read, so this page only means anything at
   * request time. `connection()` is the marker for "prerendering stops here" —
   * baked into the output, the page would render the catalogue as it stood at
   * build time.
   */
  await connection();

  const categories = await listBlogCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            Blog category
          </h1>
          <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
            {countLabel(categories.length)}
          </p>
        </div>

        <Link
          href="/admin/blog-categories/new"
          className="flex h-11 shrink-0 items-center rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Create blog category
        </Link>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Every blog category, in the order they were added.
        </caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Name</Th>
            <Th>Slug</Th>
          </tr>
        </thead>

        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-line align-top">
              <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                {category.name}
              </td>
              {/*
                The slug is the URL the storefront will serve the category's
                posts under, and it is generated rather than typed — so it
                belongs on the list, where it can be read, rather than only in
                the database.
              */}
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                {category.slug}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How many categories there are, said the way a person would say it. */
function countLabel(count: number): string {
  return count === 1 ? "1 blog category." : `${count} blog categories.`;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
