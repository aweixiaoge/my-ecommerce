import type { Metadata } from "next";
import { connection } from "next/server";
import { FaqForm } from "@/components/admin/faq-form";
import { getEnglishFaqDescription } from "@/lib/contact/faq-repo";

/**
 * Contact → FAQ: the storefront FAQ page's copy, written in English and
 * translated into the other four languages on save.
 */
export const metadata: Metadata = {
  title: "FAQ",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminContactFaqPage() {
  await connection();

  const description = await getEnglishFaqDescription();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">FAQ</h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          What the storefront&apos;s FAQ page shows. Write it in English; saving translates it into the other
          four languages.
        </p>
      </div>

      <FaqForm description={description} />
    </div>
  );
}
