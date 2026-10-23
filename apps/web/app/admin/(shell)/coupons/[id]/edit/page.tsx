import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CouponForm } from "@/components/admin/coupon-form";
import { getCouponForEdit, listCouponProductChoices } from "@/lib/admin/coupons-repo";
import { SHOP_CURRENCY } from "@/lib/currency/display";

/**
 * Editing a coupon.
 *
 * The same form as `/admin/coupons/new`, handed the coupon — the blog edit
 * screen's arrangement, for its reason: one set of fields, so the two screens
 * cannot drift apart.
 */
export const metadata: Metadata = {
  title: "Edit coupon",
};

/** Request-time, like the list it came from: the coupon is a database read. */
export const instant = false;

export default async function AdminEditCouponPage({
  params,
}: PageProps<"/admin/coupons/[id]/edit">) {
  await connection();

  const { id } = await params;
  const [products, coupon] = await Promise.all([listCouponProductChoices(), getCouponForEdit(id)]);

  // An id in a URL is an id anyone can type: a missing coupon is a 404.
  if (!coupon) notFound();

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
          Edit coupon
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Changes apply to checkouts from now on. Orders already placed keep the
          discount they were placed with.
        </p>
      </div>

      {/*
        Keyed by when the row last changed, for the blog edit screen's reason:
        the form seeds its fields once, and Next keeps a route's client state
        while you are away.
      */}
      <CouponForm
        key={coupon.updatedAt}
        coupon={coupon}
        products={products}
        currency={SHOP_CURRENCY}
      />
    </div>
  );
}
