import { prisma } from "@my-ecommerce/db";
import {
  configuredTranslator,
  translationEngine,
} from "@/lib/i18n/translate/engine";
import {
  TARGET_LOCALES,
  translateFields,
  TranslationError,
  type FieldValues,
  type TargetLocale,
  type TranslationFailureKind,
  type Translator,
} from "@/lib/i18n/translate/translate";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { SLUG_ATTEMPTS, SlugExhaustedError, slugAttempt, slugify } from "./slug";

/**
 * Translating content that already exists, in English, in the database.
 *
 * The admin writes English — every screen's form, every repository — and this
 * is the one thing that writes the other four languages. It is called after a
 * save and from a button on the lists, and it is the same call either way: a
 * row that has not been translated is translated, a row the *machine* wrote is
 * refreshed, and a row a person wrote or corrected is left exactly as it is.
 *
 * That last rule is the whole of the safety story, and it is a column:
 * `autoTranslated` is `false` for everything the admin's own screens write and
 * for everything written before this module existed, so re-translating an
 * English product can never overwrite a German name somebody fixed by hand.
 *
 * It runs *outside* the create transactions, deliberately. Each of those runs a
 * slug-retry loop that treats any unique-constraint failure as a slug
 * collision; translating inside one would multiply that surface across four
 * more locales and misclassify their collisions as the English one's.
 */

/** What a run did, per language. */
export interface TranslationRun {
  /** Languages written (or refreshed) by this run. */
  translated: TargetLocale[];
  /** Languages where a person's row was found and left alone. */
  kept: TargetLocale[];
  /** Languages that could not be done, and why — each reason has its own
   *  remedy, which is why they are reported rather than counted. */
  failed: { locale: TargetLocale; kind: TranslationFailureKind }[];
}

/** How to translate, injectable so that tests (and any future engine) do not
 *  have to be DeepL. Defaults to it. */
export interface TranslationDeps {
  translate?: Translator;
  targets?: readonly TargetLocale[];
}

/** The four kinds of content the admin writes, as the screens that own them
 *  name them. */
export type TranslatableKind = "product" | "category" | "blog" | "blogCategory";

/**
 * One kind of content by name, so that the shared action and the create
 * actions can say "translate what I just wrote" without knowing which module
 * holds the query.
 */
export function translateEntity(
  kind: TranslatableKind,
  id: string,
  deps: TranslationDeps = {},
): Promise<TranslationRun> {
  switch (kind) {
    case "product":
      return translateProduct(id, deps);
    case "category":
      return translateCategory(id, deps);
    case "blog":
      return translateBlog(id, deps);
    case "blogCategory":
      return translateBlogCategory(id, deps);
  }
}

/**
 * A product: its own copy, and the names of the options and values a shopper
 * picks between.
 *
 * All of it goes in one call per language. The option names are two words —
 * "Colour", "Sand" — and translating them beside the product's own name is what
 * tells the translator that "Sand" is a colour here rather than a beach.
 */
export async function translateProduct(
  productId: string,
  deps: TranslationDeps = {},
): Promise<TranslationRun> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      translations: {
        select: {
          locale: true,
          autoTranslated: true,
          name: true,
          shortDescription: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
        },
      },
      options: {
        select: {
          id: true,
          translations: { select: { locale: true, autoTranslated: true, name: true } },
          values: {
            select: {
              id: true,
              translations: {
                select: { locale: true, autoTranslated: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  // No row, or no English to translate from: nothing to do, and not a failure —
  // the English write is what the screen reported on.
  const source = product ? rowFor(product.translations, DEFAULT_LOCALE) : undefined;
  if (!product || !source) return { translated: [], kept: [], failed: [] };

  return run(deps, async (target, translate) => {
    /** Whether this language's row for a thing is one the machine may write:
     *  absent, or written by the machine already. */
    const writable = <T extends { locale: string; autoTranslated: boolean }>(
      rows: T[],
    ) => rowFor(rows, target)?.autoTranslated !== false;

    const fields: FieldValues = writable(product.translations)
      ? {
          name: source.name,
          shortDescription: source.shortDescription,
          description: source.description,
          metaTitle: source.metaTitle,
          metaDescription: source.metaDescription,
        }
      : {};

    for (const option of product.options) {
      if (writable(option.translations)) {
        const name = rowFor(option.translations, DEFAULT_LOCALE)?.name ?? "";
        if (name !== "") fields[`option:${option.id}`] = name;
      }

      for (const value of option.values) {
        if (writable(value.translations)) {
          const name = rowFor(value.translations, DEFAULT_LOCALE)?.name ?? "";
          if (name !== "") fields[`value:${value.id}`] = name;
        }
      }
    }

    // Everything this language would carry is already a person's: leave it.
    if (Object.keys(fields).length === 0) return false;

    const translated = await translateFields(fields, target, translate);
    const name = text(translated.name, source.name);

    if (writable(product.translations)) {
      const row = {
        autoTranslated: true,
        name,
        shortDescription: text(translated.shortDescription, ""),
        description: text(translated.description, ""),
        metaTitle: optional(translated.metaTitle),
        metaDescription: optional(translated.metaDescription),
      };

      await writeWithSlug(
        (slug) =>
          prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: target } },
            create: { productId, locale: target, slug, ...row },
            update: { slug, ...row },
          }),
        name,
        "product",
      );
    }

    await writeNames(translated, product.options, target);

    return true;
  });
}

/** A category: its name, its copy and its meta pair. */
export async function translateCategory(
  categoryId: string,
  deps: TranslationDeps = {},
): Promise<TranslationRun> {
  return translateRow(deps, DEFAULT_LOCALE, {
    findTranslations: () =>
      prisma.categoryTranslation.findMany({
        where: { categoryId },
        select: {
          locale: true,
          autoTranslated: true,
          name: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
        },
      }),
    source: async () => {
      const english = await prisma.categoryTranslation.findUnique({
        where: { categoryId_locale: { categoryId, locale: DEFAULT_LOCALE } },
        select: {
          name: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
        },
      });

      return english ? { ...english } : null;
    },
    write: (target, translated, slug) =>
      prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId, locale: target } },
        create: {
          categoryId,
          locale: target,
          autoTranslated: true,
          slug,
          name: text(translated.name, ""),
          description: text(translated.description, ""),
          metaTitle: optional(translated.metaTitle),
          metaDescription: optional(translated.metaDescription),
        },
        update: {
          autoTranslated: true,
          slug,
          name: text(translated.name, ""),
          description: text(translated.description, ""),
          metaTitle: optional(translated.metaTitle),
          metaDescription: optional(translated.metaDescription),
        },
      }),
    fallbackSlug: "category",
  });
}

/** A blog post: title, copy, meta pair. */
export async function translateBlog(
  blogId: string,
  deps: TranslationDeps = {},
): Promise<TranslationRun> {
  return translateRow(deps, DEFAULT_LOCALE, {
    findTranslations: () =>
      prisma.blogTranslation.findMany({
        where: { blogId },
        select: {
          locale: true,
          autoTranslated: true,
          title: true,
          shortDescription: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
        },
      }),
    source: async () => {
      const english = await prisma.blogTranslation.findUnique({
        where: { blogId_locale: { blogId, locale: DEFAULT_LOCALE } },
        select: {
          title: true,
          shortDescription: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
        },
      });

      return english ? { ...english } : null;
    },
    write: (target, translated, slug) =>
      prisma.blogTranslation.upsert({
        where: { blogId_locale: { blogId, locale: target } },
        create: {
          blogId,
          locale: target,
          autoTranslated: true,
          slug,
          title: text(translated.title, ""),
          shortDescription: text(translated.shortDescription, ""),
          description: text(translated.description, ""),
          metaTitle: optional(translated.metaTitle),
          metaDescription: optional(translated.metaDescription),
        },
        update: {
          autoTranslated: true,
          slug,
          title: text(translated.title, ""),
          shortDescription: text(translated.shortDescription, ""),
          description: text(translated.description, ""),
          metaTitle: optional(translated.metaTitle),
          metaDescription: optional(translated.metaDescription),
        },
      }),
    fallbackSlug: "blog",
    slugFrom: "title",
  });
}

/** A blog category: a name, and that is all its screen collects. */
export async function translateBlogCategory(
  categoryId: string,
  deps: TranslationDeps = {},
): Promise<TranslationRun> {
  return translateRow(deps, DEFAULT_LOCALE, {
    findTranslations: () =>
      prisma.blogCategoryTranslation.findMany({
        where: { categoryId },
        select: { locale: true, autoTranslated: true, name: true },
      }),
    source: async () => {
      const english = await prisma.blogCategoryTranslation.findUnique({
        where: { categoryId_locale: { categoryId, locale: DEFAULT_LOCALE } },
        select: { name: true },
      });

      return english ? { ...english } : null;
    },
    write: (target, translated, slug) =>
      prisma.blogCategoryTranslation.upsert({
        where: { categoryId_locale: { categoryId, locale: target } },
        create: {
          categoryId,
          locale: target,
          autoTranslated: true,
          slug,
          name: text(translated.name, ""),
        },
        update: {
          autoTranslated: true,
          slug,
          name: text(translated.name, ""),
        },
      }),
    fallbackSlug: "category",
  });
}

/**
 * The FAQ page: one description per language, and no slug — the page has one
 * address, `/faq`, in every language.
 *
 * Not `translateRow`, which exists for the slug retry this has no use for. The
 * skip rule is the same: a language a person wrote is left alone. An English
 * description emptied by the admin empties the machine's copies too —
 * `translateFields` passes an empty field through untranslated — so the page
 * is not left answering in four languages after it was cleared in the fifth.
 */
export async function translateFaq(deps: TranslationDeps = {}): Promise<TranslationRun> {
  return translateDescriptionPage(deps, {
    rows: () => prisma.faqTranslation.findMany({ select: { locale: true, autoTranslated: true } }),
    english: () =>
      prisma.faqTranslation.findUnique({
        where: { locale: DEFAULT_LOCALE },
        select: { description: true },
      }),
    write: (locale, description) =>
      prisma.faqTranslation.upsert({
        where: { locale },
        create: { locale, description, autoTranslated: true },
        update: { description, autoTranslated: true },
      }),
  });
}

/** The About page's description: the FAQ's arrangement, in its own table. */
export async function translateAbout(deps: TranslationDeps = {}): Promise<TranslationRun> {
  return translateDescriptionPage(deps, {
    rows: () => prisma.aboutTranslation.findMany({ select: { locale: true, autoTranslated: true } }),
    english: () =>
      prisma.aboutTranslation.findUnique({
        where: { locale: DEFAULT_LOCALE },
        select: { description: true },
      }),
    write: (locale, description) =>
      prisma.aboutTranslation.upsert({
        where: { locale },
        create: { locale, description, autoTranslated: true },
        update: { description, autoTranslated: true },
      }),
  });
}

/**
 * A page that is one markdown description per language, keyed by locale —
 * FAQ and About. The two differ only in their table.
 */
async function translateDescriptionPage(
  deps: TranslationDeps,
  table: {
    rows: () => Promise<{ locale: string; autoTranslated: boolean }[]>;
    english: () => Promise<{ description: string } | null>;
    write: (locale: string, description: string) => Promise<unknown>;
  },
): Promise<TranslationRun> {
  const [rows, english] = await Promise.all([table.rows(), table.english()]);

  if (!english) return { translated: [], kept: [], failed: [] };

  return run(deps, async (target, translate) => {
    const existing = rowFor(rows, target);
    if (existing && !existing.autoTranslated) return false;

    const translated = await translateFields({ description: english.description }, target, translate);
    await table.write(target, text(translated.description, ""));

    return true;
  });
}

/**
 * The three kinds that are one row with a name and some copy — category, post,
 * blog category — in the shape they share.
 *
 * The three differ only in which columns they carry and which table they land
 * in, so the run, the skip rule and the slug retry live here once. The product
 * above keeps its own, because options and values are a second and third table
 * inside one language's turn.
 */
async function translateRow(
  deps: TranslationDeps,
  sourceLocale: string,
  shape: {
    findTranslations: () => Promise<
      { locale: string; autoTranslated: boolean }[]
    >;
    source: () => Promise<FieldValues | null>;
    write: (
      target: TargetLocale,
      translated: FieldValues,
      slug: string,
    ) => Promise<unknown>;
    fallbackSlug: string;
    slugFrom?: string;
  },
): Promise<TranslationRun> {
  const [rows, source] = await Promise.all([
    shape.findTranslations(),
    shape.source(),
  ]);

  if (!source) return { translated: [], kept: [], failed: [] };

  return run(deps, async (target, translate) => {
    const existing = rowFor(rows, target);

    // A row a person wrote — or corrected — is theirs. This is the rule the
    // whole module exists to keep.
    if (existing && !existing.autoTranslated) return false;

    const translated = await translateFields(source, target, translate);
    const name = translated[shape.slugFrom ?? "name"] ?? "";

    await writeWithSlug((slug) => shape.write(target, translated, slug), name, shape.fallbackSlug);

    return true;
  });
}

/**
 * Every language's turn, taken together, with each failure kept to itself.
 *
 * In parallel, because the four are independent and the engine is the slow
 * part: a language model takes seconds per call, and four of them one after
 * another is a save that looks hung. The calls do not share state — each
 * writes its own locale's rows — so the only thing the sequence bought was
 * latency.
 *
 * One language failing — a quota, a timeout, a rate limit — still must not
 * take the other three down with it, so each turn catches its own. And
 * `unconfigured` is answered before anything is sent: with no key there is
 * nothing to try, and four calls to fail is four times nothing.
 */
async function run(
  deps: TranslationDeps,
  attempt: (target: TargetLocale, translate: Translator) => Promise<boolean>,
): Promise<TranslationRun> {
  const targets = deps.targets ?? TARGET_LOCALES;

  if (!deps.translate && translationEngine() === null) {
    return {
      translated: [],
      kept: [],
      failed: targets.map((locale) => ({ locale, kind: "unconfigured" as const })),
    };
  }

  const translate = deps.translate ?? configuredTranslator();

  /** One language's turn: it wrote something, or it failed with a reason. */
  type Turn =
    | { target: TargetLocale; wrote: boolean }
    | { target: TargetLocale; kind: TranslationFailureKind };

  const turns: Turn[] = await Promise.all(
    targets.map(async (target): Promise<Turn> => {
      try {
        return { target, wrote: await attempt(target, translate) };
      } catch (error) {
        return {
          target,
          kind:
            error instanceof TranslationError ? error.kind : ("response" as const),
        };
      }
    }),
  );

  const result: TranslationRun = { translated: [], kept: [], failed: [] };

  // Assembled in the order the languages are declared, not in the order the
  // answers arrived: two runs of the same content should read the same way.
  for (const turn of turns) {
    if ("kind" in turn) {
      result.failed.push({ locale: turn.target, kind: turn.kind });
    } else {
      (turn.wrote ? result.translated : result.kept).push(turn.target);
    }
  }

  return result;
}

/**
 * Writes, retrying while the slug is what the database objected to.
 *
 * The same loop the English writes use, for the same reason and one more: a
 * translated name can collide with another row's translated name in that
 * language — two products called "Kopfhörer" — and the constraint is per
 * locale, so the retry is too.
 */
async function writeWithSlug(
  write: (slug: string) => Promise<unknown>,
  name = "",
  fallback = "product",
): Promise<void> {
  const base = slugify(name, fallback);

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      await write(slugAttempt(base, attempt));
      return;
    } catch (error) {
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

/** The option and value names, written to their own tables. */
async function writeNames(
  translated: FieldValues,
  options: {
    id: string;
    values: { id: string }[];
  }[],
  target: TargetLocale,
): Promise<void> {
  for (const option of options) {
    const name = translated[`option:${option.id}`];
    if (typeof name === "string") {
      await prisma.productOptionTranslation.upsert({
        where: { optionId_locale: { optionId: option.id, locale: target } },
        create: { optionId: option.id, locale: target, name, autoTranslated: true },
        update: { name, autoTranslated: true },
      });
    }

    for (const value of option.values) {
      const valueName = translated[`value:${value.id}`];
      if (typeof valueName === "string") {
        await prisma.productOptionValueTranslation.upsert({
          where: { valueId_locale: { valueId: value.id, locale: target } },
          create: {
            valueId: value.id,
            locale: target,
            name: valueName,
            autoTranslated: true,
          },
          update: { name: valueName, autoTranslated: true },
        });
      }
    }
  }
}

/** The row for a language, if the entity has one. */
function rowFor<T extends { locale: string }>(
  rows: readonly T[],
  locale: string,
): T | undefined {
  return rows.find((row) => row.locale === locale);
}

/** A translated field, or the English one when the translator returned
 *  something that is not a string — `null` and `""` travel through
 *  `translateFields` untouched, so this only guards the type. */
function text(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function optional(value: string | null | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** The unique-constraint sniff the admin repos use, for `(locale, slug)`. */
function isSlugTaken(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}
