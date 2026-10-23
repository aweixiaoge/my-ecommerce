import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CouponForm } from "@/components/admin/coupon-form";
import { listCouponProductChoices } from "@/lib/admin/coupons-repo";
import { SHOP_CURRENCY } from "@/lib/currency/display";

/**
 * The create-coupon screen.
 *
 * A route rather than a dialog on the list, for the reason the category one
 * gives: it can be linked to and reloaded. It reads the catalogue at request
 * time, so the product selection offers what exists now.
 */
export const metadata: Metadata = {
  title: "New coupon",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminNewCouponPage() {
  await connection();

  const products = await listCouponProductChoices();

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/coupons"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Coupons
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New coupon
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          A code, what it takes off, which products it is for, and when it stops
          working.
        </p>
      </div>

      <CouponForm products={products} currency={SHOP_CURRENCY} />
    </div>
  );
}
