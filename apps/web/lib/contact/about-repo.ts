import { prisma } from "@my-ecommerce/db";
import type { About } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * The About page: one markdown description per language — the FAQ's
 * arrangement (`faq-repo.ts`) — and its images, which are `media` rows with
 * `about_page` set, ordered by `position`. The admin writes the English and
 * the images; `translateAbout` in `lib/admin/translations.ts` writes the rest.
 */

/**
 * An image id in the save that is not an upload this page may take: gone,
 * or already a product's or a post's. Only a crafted POST or a deleted upload
 * gets here — the form only ever sends ids its own uploads came back with.
 */
export class UnknownAboutMediaError extends Error {
  constructor() {
    super("One of the images could not be found. Remove it and upload it again.");
    this.name = "UnknownAboutMediaError";
  }
}

/** The page as the storefront draws it. */
export interface AboutPage {
  /** Markdown, in the reader's language or English; "" when nothing is written. */
  description: string;
  /** In the order the admin set; the first is the main image. */
  imageIds: string[];
}

export async function getAboutPage(locale: Locale): Promise<AboutPage> {
  const [rows, images] = await Promise.all([
    prisma.aboutTranslation.findMany({
      where: { locale: { in: [locale, DEFAULT_LOCALE] } },
      select: { locale: true, description: true },
    }),
    aboutImageIds(),
  ]);

  // The storefront's content rule (`lib/catalog/translation.ts`): the reader's
  // language where there is a row, English where there is not.
  const shown =
    rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === DEFAULT_LOCALE);

  return { description: shown?.description ?? "", imageIds: images };
}

/** The page as the admin edits it: the English, and the images. */
export async function getAboutForEdit(): Promise<About> {
  const [row, images] = await Promise.all([
    prisma.aboutTranslation.findUnique({
      where: { locale: DEFAULT_LOCALE },
      select: { description: true },
    }),
    aboutImageIds(),
  ]);

  return { description: row?.description ?? "", mediaIds: images };
}

/**
 * Writes the English description — a person's words, so never the machine's —
 * and makes the images exactly the ones given, in that order. One transaction,
 * the blog edit's reasoning: a page that is half of what was on screen is
 * worse than one that did not change.
 */
export async function saveAbout(input: About): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.aboutTranslation.upsert({
      where: { locale: DEFAULT_LOCALE },
      create: { locale: DEFAULT_LOCALE, description: input.description, autoTranslated: false },
      update: { description: input.description, autoTranslated: false },
    });

    for (const [position, id] of input.mediaIds.entries()) {
      const claimed = await tx.media.updateMany({
        where: {
          id,
          // Already the page's, or a fresh upload nothing has claimed. Never
          // another owner's: a product photograph is not the About page's to take.
          OR: [{ aboutPage: true }, { productId: null, variantId: null, blogId: null }],
        },
        data: { aboutPage: true, position },
      });
      if (claimed.count === 0) throw new UnknownAboutMediaError();
    }

    // Images taken off the form. An upload made for this page has no other
    // reader, so it goes — the blog edit's rule.
    await tx.media.deleteMany({ where: { aboutPage: true, id: { notIn: [...input.mediaIds] } } });
  });
}

async function aboutImageIds(): Promise<string[]> {
  const rows = await prisma.media.findMany({
    where: { aboutPage: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  return rows.map((row) => row.id);
}
