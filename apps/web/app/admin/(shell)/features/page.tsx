import type { Metadata } from "next";
import { connection } from "next/server";
import { setFeaturedProductAction } from "./actions";
import { listFeaturedProductIds } from "@/lib/admin/featured-products-repo";
import { listProducts, type AdminProductSummary } from "@/lib/admin/products-repo";

/**
 * The featured set.
 *
 * Every product in the catalogue with a Feature / Unfeature pair beside it, the
 * same shape the product list uses for publishing — the disabled half of the
 * pair is what says which state the row is in, so the screen teaches its own
 * convention. What it writes is the list the home page will show; rendering it
 * there is the storefront's read, which does not exist yet, and this screen
 * does not pretend otherwise.
 */
export const metadata: Metadata = {
  title: "Feature",
};

/**
 * This page is allowed to block, for the reason the product list gives: the
 * shell's own `instant = false` covers the shell, and validation runs per
 * segment, so a page that reads request-time data has to say so itself —
 * otherwise every navigation to it is reported as one that could have been
 * instant, which is true and not fixable: a list showing what was saved a
 * moment ago is the point.
 */
export const instant = false;

type StatusLabel = "Draft" | "Active" | "Archived";

export default async function AdminFeaturesPage() {
  /**
   * The products and the featured set are database reads, so this page only
   * means anything at request time. `connection()` is the marker for
   * "prerendering stops here" — baked into the output, the page would render
   * the catalogue and the selection as they stood at build time, and what was
   * clicked a moment ago is the whole point of the screen.
   *
   * One `Promise.all` rather than two awaits in a row: the two reads do not
   * depend on each other, and there is no reason to pay for two round trips.
   */
  await connection();

  const [products, featuredIds] = await Promise.all([
    listProducts(),
    listFeaturedProductIds(),
  ]);
  const featured = new Set(featuredIds);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Feature
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {countLabel(featured.size, products.length)} The home page will show
          these products.
        </p>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Every product in the catalogue, newest first, with the ones the home
          page will feature.
        </caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line align-top">
              <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                {product.name}
              </td>
              {/*
                The product's own draft/active state, not its featured one —
                the featured state is the pair's to show, and this is the fact
                the pair cannot: featuring a draft is a decision someone should
                get to see themselves making.
              */}
              <td className="py-3 pr-4">
                <StatusBadge status={statusLabel(product.status)} />
              </td>
              <td className="py-3">
                <FeaturedActions
                  id={product.id}
                  name={product.name}
                  featured={featured.has(product.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How much of the catalogue is in the featured set, said the way a person would. */
function countLabel(featured: number, total: number): string {
  return total === 1
    ? `${featured} of 1 product is featured.`
    : `${featured} of ${total} products are featured.`;
}

/** The database's word for a status, as the badge shows it. */
function statusLabel(status: AdminProductSummary["status"]): StatusLabel {
  return status === "draft"
    ? "Draft"
    : status === "active"
      ? "Active"
      : "Archived";
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
 * Two forms rather than one with two submit buttons, because a form has a
 * single action and these are two different writes — and the payload carries
 * the resulting state, not which button was pressed. The one that does not
 * apply is disabled rather than hidden, so the pair stays where the eye left
 * it, exactly as the product list's Publish/Unpublish pair does.
 *
 * Neither has a client component above it: a row is markup and a Server
 * Action, so choosing what the home page shows works before React has loaded.
 *
 * `aria-label` carries the product name, because "Feature" repeated down a
 * column tells a screen reader nothing about which row it is in.
 */
function FeaturedActions({
  id,
  name,
  featured,
}: {
  id: string;
  name: string;
  featured: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FeatureForm
        id={id}
        featured="featured"
        disabled={featured}
        label={`Feature ${name}`}
      >
        Feature
      </FeatureForm>
      <FeatureForm
        id={id}
        featured="unfeatured"
        disabled={!featured}
        label={`Unfeature ${name}`}
      >
        Unfeature
      </FeatureForm>
    </div>
  );
}

function FeatureForm({
  id,
  featured,
  disabled,
  label,
  children,
}: {
  id: string;
  featured: "featured" | "unfeatured";
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setFeaturedProductAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="featured" value={featured} />
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
 * A product's status reads the way it does on the product list: Active is not a
 * styling variant of the other two, it can be bought and they cannot, so it is
 * worth a shape as well as a colour — and draft and archived share the quiet
 * one, because the word beside it is what tells them apart.
 */
function StatusBadge({ status }: { status: StatusLabel }) {
  const className =
    status === "Active"
      ? "rounded-control border border-line px-2 py-0.5 text-[12px] leading-[19.8px] text-ink"
      : "rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62";

  return <span className={className}>{status}</span>;
}
