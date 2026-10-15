import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductForm } from "@/components/admin/product-form";
import { getProductForEdit } from "@/lib/admin/products-repo";

/**
 * Editing a product.
 *
 * The same form as `/admin/products/new`, handed the product instead of
 * nothing. Not a variation on it and not a second layout: the fields a product
 * has are the fields the create form collects, and two screens showing them
 * separately would be two screens to keep in step — with the one you are not
 * looking at being the one that quietly stops showing a field.
 *
 * A page rather than a modal, for the same reason the create screen is one: it
 * can be linked to, bookmarked, and reloaded without losing what has been typed
 * into it.
 */
export const metadata: Metadata = {
  title: "Edit product",
};

/**
 * Request-time, like the list it came from: the row it loads is a database
 * read, and a prerendered edit form would be a form full of last build's copy.
 */
export const instant = false;

export default async function AdminEditProductPage({
  params,
}: PageProps<"/admin/products/[id]/edit">) {
  await connection();

  const { id } = await params;

  // An id in a URL is an id anyone can type, so a missing product is a 404
  // rather than an exception — the difference between a wrong link and a bug.
  const product = await getProductForEdit(id);
  if (!product) notFound();

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
          Edit product
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {product.status === "active"
            ? "This product is published — the storefront shows what you save here."
            : "Saved as a draft. Everything below is what the product is made of; changing it changes what the storefront shows."}
        </p>
      </div>

      {/*
        Keyed by when the row last changed, and that key is load-bearing.
        Next keeps a route's client component state alive while you are away
        from it, so the form's own values — which it holds in `useState` and
        seeds once — survive a navigation back. Without a key that moves, saving
        and reopening the same product shows the values from before the save: the
        server sends the new ones, the form ignores them, and it looks as though
        the save silently failed. A new `updatedAt` is a new key, and a new key
        is a remount.
      */}
      <ProductForm key={product.updatedAt} product={product} />
    </div>
  );
}
