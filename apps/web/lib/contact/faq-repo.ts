import { prisma } from "@my-ecommerce/db";
import type { Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * The FAQ page's copy: one markdown description per language. The admin writes
 * English; `translateFaq` in `lib/admin/translations.ts` writes the rest.
 */

/**
 * The description in `locale`, or in English where that language has no row —
 * the storefront's content rule (`lib/catalog/translation.ts`). Empty when
 * nothing has been written at all.
 */
export async function getFaqDescription(locale: Locale): Promise<string> {
  const rows = await prisma.faqTranslation.findMany({
    where: { locale: { in: [locale, DEFAULT_LOCALE] } },
    select: { locale: true, description: true },
  });

  const shown = rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === DEFAULT_LOCALE);

  return shown?.description ?? "";
}

/** The English description, as the admin edits it. */
export async function getEnglishFaqDescription(): Promise<string> {
  const row = await prisma.faqTranslation.findUnique({
    where: { locale: DEFAULT_LOCALE },
    select: { description: true },
  });

  return row?.description ?? "";
}

/** Writes the English description — a person's words, so never the machine's. */
export async function saveEnglishFaqDescription(description: string): Promise<void> {
  await prisma.faqTranslation.upsert({
    where: { locale: DEFAULT_LOCALE },
    create: { locale: DEFAULT_LOCALE, description, autoTranslated: false },
    update: { description, autoTranslated: false },
  });
}
