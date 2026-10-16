import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { Money } from "@my-ecommerce/shared";
import { compareMoney } from "@my-ecommerce/shared";
import { setProductStatusAction } from "./actions";
import { priceRange } from "@/lib/admin/product-variants";
import { listProducts } from "@/lib/admin/products-repo";
import { formatMoney } from "@/lib/format";

/**
 * The product list.
 *
 * One source: the `products` table. It used to be two — this and the fixture
 * the storefront read — and the page's own comment admitted the problem with
 * that: a list built from two places is a lie in one direction or the other,
 * and it was the seeded half that lied, showing rows nobody could edit through
 * the admin. The fixture is gone now — the home page's grid was its last
 * reader, and it reads the database too.
 *
 * It reads the database at request time, which the shell layout has already
 * allowed for the whole admin area.
 */
export const metadata: Metadata = {
  title: "Product",
};

/**
 * This page is allowed to block.
 *
 * The shell's own `instant = false` covers the shell; validation runs per
 * segment, so a page that reads request-time data needs to say so itself —
 * otherwise every navigation to it is reported as one that could have been
 * instant, which is true and not fixable: an admin list showing what was saved
 * a moment ago is the point.
 */
export const instant = false;

interface Row {
  id: string;
  name: string;
  price: string;
  attributes: string;
  status: "Draft" | "Active" | "Archived";
}

export default async function AdminProductsPage() {
  /**
   * The products are a database read, so this page only means anything at
   * request time. Left prerenderable, the build would render it and bake the
   * catalogue as it stood then into the output — and a list of what was saved a
   * moment ago is the whole point of the screen. `connection()` is the marker
   * for "prerendering stops here"; `dynamic = "force-dynamic"` was removed from
   * Next for Cache Components apps, so this is the mechanism now.
   */
  await connection();

  const products = await listProducts();

  const rows: Row[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: priceLabel(product.prices),
    attributes: [
      // "Color: Black, Sand", with the option names the database holds — the
      // row's own word for them, already resolved to this locale rather than
      // looked up from the kind here.
      product.options
        .map((option) => `${option.name}: ${option.values.join(", ")}`)
        .join(" · "),
      // The count rather than the images themselves: a list is not a gallery,
      // and what a person wants to know here is whether any were attached.
      imageLabel(product.imageCount),
    ]
      .filter(Boolean)
      .join(" · "),
    status:
      product.status === "draft"
        ? ("Draft" as const)
        : product.status === "active"
          ? ("Active" as const)
          : ("Archived" as const),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            Product
          </h1>
          <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
            {rows.length} products.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="flex h-11 shrink-0 items-center rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Create product
        </Link>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Every product in the catalogue, newest first.
        </caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Name</Th>
            <Th>Price</Th>
            <Th>Attributes</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line align-top">
              <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                {row.name}
              </td>
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                {row.price}
              </td>
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                {row.attributes || "—"}
              </td>
              <td className="py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="py-3">
                <RowActions id={row.id} name={row.name} status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * What a product costs, as the list shows it.
 *
 * One figure when every variant costs the same, a range when they differ, and a
 * dash when nothing is priced yet. A dash is the honest answer there, not
 * "$0.00", which reads as free.
 */
function priceLabel(prices: Money[]): string {
  const range = priceRange(prices);
  if (!range) return "—";

  // `compareMoney`, not `===` on the amounts: "79" and "79.00" are the same
  // price written two ways, and a string comparison would render the range
  // "$79.00 – $79.00" for a product that costs one thing.
  return compareMoney(range.min, range.max) === 0
    ? formatMoney(range.min)
    : `${formatMoney(range.min)} – ${formatMoney(range.max)}`;
}

/** How many images the product carries, or nothing to say about it. */
function imageLabel(count: number): string {
  return count === 0 ? "" : `${count} image${count === 1 ? "" : "s"}`;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}

/**
 * What can be done to a row.
 *
 * Two forms rather than one with two submit buttons, because a form has a single
 * action and these are two different writes — `formAction` on the second button
 * would work, and would also make the button's meaning depend on which one you
 * pressed rather than on what it says. Neither has a client component above it:
 * a row is markup and a Server Action, so changing what a shop sells works
 * before React has loaded.
 *
 * The one that does not apply is disabled rather than hidden, so the pair stays
 * where the eye left it — a Publish that vanishes when a product goes live
 * moves Unpublish into the space the cursor is in.
 *
 * `aria-label` carries the product name, because "Publish" repeated down a
 * column tells a screen reader nothing about which row it is in.
 */
function RowActions({ id, name, status }: { id: string; name: string; status: Row["status"] }) {
  const published = status === "Active";

  return (
    <div className="flex items-center gap-1.5">
      <StatusForm id={id} status="active" disabled={published} label={`Publish ${name}`}>
        Publish
      </StatusForm>
      <StatusForm id={id} status="draft" disabled={!published} label={`Unpublish ${name}`}>
        Unpublish
      </StatusForm>

      {/*
        An anchor, not a `<Link>`, and that is the point rather than an
        oversight.

        A client-side navigation re-renders the edit route from the tree React
        kept for it — Next holds a route's component state while you are away —
        so clicking Edit a moment after saving shows the values from *before*
        the save, then corrects itself when the server's response lands. The
        correction is the good news; the quarter of a second of the wrong
        numbers above it is what makes a save look like it did not happen.

        A document load has nothing to restore, so the form is built from what
        the server just sent. It costs a page load, on a screen whose entire job
        is showing what is in the database now.
      */}
      <a
        href={`/admin/products/${id}/edit`}
        aria-label={`Edit ${name}`}
        className="flex h-7 items-center rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist"
      >
        Edit
      </a>
    </div>
  );
}

function StatusForm({
  id,
  status,
  disabled,
  label,
  children,
}: {
  id: string;
  status: "draft" | "active";
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="h-7 rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {children}
      </button>
    </form>
  );
}

/**
 * Active is not a styling variant of the other two: it can be bought and they
 * cannot. The difference is worth a shape as well as a colour, so it reads the
 * same to someone who cannot tell the two greys apart — and draft and archived
 * share the quiet one, because the word beside it is what tells them apart.
 */
function StatusBadge({ status }: { status: Row["status"] }) {
  const className =
    status === "Active"
      ? "rounded-control border border-line px-2 py-0.5 text-[12px] leading-[19.8px] text-ink"
      : "rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62";

  return <span className={className}>{status}</span>;
}
