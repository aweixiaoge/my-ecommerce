import type { Metadata } from "next";
import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await requestLocale()).cart.title };
}

/**
 * The cart.
 *
 * A placeholder until Phase 2 wires up sessions and checkout — the page, its
 * title and its empty state are all the catalog's, so it is translated like
 * every other screen even though it does nothing yet.
 */
export default async function CartPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).cart;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {messages.heading}
      </h1>

      <div className="mt-8 rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">{messages.empty}</p>
        <Link
          href={localePath(locale, "/")}
          className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          {messages.continue}
        </Link>
      </div>
    </div>
  );
}
