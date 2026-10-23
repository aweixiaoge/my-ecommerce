import type { Metadata } from "next";
import { connection } from "next/server";
import { AboutForm } from "@/components/admin/about-form";
import { getAboutForEdit } from "@/lib/contact/about-repo";

/**
 * Contact → About: the storefront About page's images and copy, the copy
 * written in English and translated into the other four languages on save.
 */
export const metadata: Metadata = {
  title: "About",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminContactAboutPage() {
  await connection();

  const about = await getAboutForEdit();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">About</h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          What the storefront&apos;s About page shows. The first image is the main one, above the text; the
          rest follow it. Write in English; saving translates it into the other four languages.
        </p>
      </div>

      <AboutForm description={about.description} mediaIds={about.mediaIds} />
    </div>
  );
}
