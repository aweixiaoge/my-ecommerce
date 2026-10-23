import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listCoupons, type AdminCouponSummary } from "@/lib/admin/coupons-repo";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * The coupon list, the button that makes one, and a way into each to edit it.
 *
 * Read at request time like the other admin lists. The checkout's coupon box
 * redeems them.
 */
export const metadata: Metadata = {
  title: "Coupon",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminCouponsPage() {
  await connection();

  const coupons = await listCoupons();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            Coupon
          </h1>
          <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
            {coupons.length === 1 ? "1 coupon." : `${coupons.length} coupons.`}
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className="flex h-11 shrink-0 items-center rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Create coupon
        </Link>
      </div>

      {coupons.length === 0 ? (
        <p className="text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          No coupons have been created yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Every coupon, newest first.</caption>

          <thead>
            <tr className="border-b border-line">
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Products</Th>
              <Th>Expires</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>

          <tbody>
            {coupons.map((coupon) => {
              return (
                <tr key={coupon.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4 font-mono text-[13px] font-medium tracking-[1px] text-ink">
                    {coupon.code}
                  </td>
                  <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                    {discountLabel(coupon)}
                  </td>
                  <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                    {coupon.appliesToAllProducts
                      ? "All products"
                      : coupon.productCount === 1
                        ? "1 product"
                        : `${coupon.productCount} products`}
                  </td>
                  <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                    {formatDate(coupon.expiresAt)}
                    {coupon.expired && (
                      <span className="ml-2 rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62">
                        expired
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {/*
                      An anchor rather than a `<Link>`, for the blog list's
                      reason: a document load builds the edit form from what
                      the server just sent, where a client navigation could
                      restore the form as it was before the last save.
                    */}
                    <a
                      href={`/admin/coupons/${coupon.id}/edit`}
                      aria-label={`Edit ${coupon.code}`}
                      className="inline-flex h-7 items-center rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** "10% off" or "$5.00 off". */
function discountLabel(coupon: AdminCouponSummary): string {
  return coupon.value.kind === "fixed"
    ? `${formatMoney(coupon.value.money)} off`
    : `${Number(coupon.value.percent)}% off`;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
