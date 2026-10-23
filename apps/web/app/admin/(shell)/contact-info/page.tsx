import type { Metadata } from "next";
import { connection } from "next/server";
import { StoreContactForm } from "@/components/admin/store-contact-form";
import { getStoreContact } from "@/lib/contact/store-contact-repo";

/**
 * Contact → Info: how the shop can be reached — phone, email, WhatsApp,
 * address and the three social links — as the storefront's Contact page
 * ("Get in Touch") and footer show them.
 */
export const metadata: Metadata = {
  title: "Info",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminContactInfoPage() {
  await connection();

  const contact = await getStoreContact();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">Info</h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          What the storefront&apos;s Contact page and footer show.
        </p>
      </div>

      <StoreContactForm contact={contact} />
    </div>
  );
}
