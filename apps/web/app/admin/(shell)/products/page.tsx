import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ATTRIBUTE_LABELS } from "@/lib/admin/product-form";
import { formatMoney } from "@/lib/format";
import { listCreatedProducts } from "@/lib/mock/admin-products";
import { getProducts } from "@/lib/mock/catalog";

/**
 * The product list.
 *
 * Two sources, one list: the seeded catalogue the storefront reads, and the
 * drafts the create form has written. Anything else would be a lie in one
 * direction or the other — a list that hid the shop's real products, or one
 * that hid what you just created.
 *
 * It reads the product store at request time, which the shell layout has
 * already allowed for the whole admin area.
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
  status: "Draft" | "Active";
}

export default async function AdminProductsPage() {
  /**
   * The draft list lives in this process's memory, so it only means anything
   * at request time. Left prerenderable, the build would render this page and
   * bake in whatever the store held then — nothing — and a production build
   * would trip the mock store's guard on the way out. `connection()` is the
   * marker for "prerendering stops here"; `dynamic = "force-dynamic"` was
   * removed from Next for Cache Components apps, so this is the mechanism now.
   */
  await connection();

  const [seeded, created] = await Promise.all([
    getProducts(),
    listCreatedProducts(),
  ]);

  const rows: Row[] = [
    // Drafts first: the thing you just made is the thing you are looking for.
    ...created.map((product) => ({
      id: product.id,
      name: product.name,
      // No variants, so no price — and no price is the honest answer, not
      // "$0.00", which reads as free.
      price: "—",
      attributes: product.attributes
        .map(
          (attribute) =>
            `${ATTRIBUTE_LABELS[attribute.kind]}: ${attribute.values.join(", ")}`,
        )
        .join(" · "),
      status: "Draft" as const,
    })),
    ...seeded.map((product) => ({
      id: product.id,
      name: product.name,
      price:
        product.priceMax === null
          ? formatMoney(product.price)
          : `${formatMoney(product.price)} – ${formatMoney(product.priceMax)}`,
      // `ProductSummary` — the shape a list endpoint returns — carries no
      // options, so a seeded product cannot show them without a second request
      // per row. The real list API either includes them or this column goes.
      attributes: "",
      status: "Active" as const,
    })),
  ];

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
          Products, newest draft first, then the seeded catalogue.
        </caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Name</Th>
            <Th>Price</Th>
            <Th>Attributes</Th>
            <Th>Status</Th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}

/**
 * Draft and Active are not styling variants of one thing: a draft cannot be
 * bought, and active can. The difference is worth a shape as well as a colour,
 * so it reads the same to someone who cannot tell the two greys apart.
 */
function StatusBadge({ status }: { status: "Draft" | "Active" }) {
  const className =
    status === "Draft"
      ? "rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62"
      : "rounded-control border border-line px-2 py-0.5 text-[12px] leading-[19.8px] text-ink";

  return <span className={className}>{status}</span>;
}
