import { prisma, type PrismaClient, type ProductStatus } from "@my-ecommerce/db";
import type {
  AdminProductCreate,
  AttributeKind,
  Money,
  VariantDraft,
} from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import { ATTRIBUTE_LABELS } from "./product-form";
import {
  productCreateData,
  variantCreateData,
  variantDraftsByName,
  variantFields,
} from "./product-rows";
import { SLUG_ATTEMPTS, slugAttempt, slugify } from "./slug";

/**
 * Where the admin reads and writes products.
 *
 * It replaces `lib/mock/admin-products.ts`, which held created products in an
 * array pinned to `globalThis` and lost them on the next restart. The
 * signatures are the ones that file had, because that file's whole promise was
 * that the real store would be a swap rather than a rewrite.
 *
 * What is left here is the part that needs a database: a transaction, and the
 * retry that a unique constraint forces on anyone who generates a slug. Every
 * decision about *what rows to write* is in `product-rows.ts`, where a test
 * with no database can reach it.
 */

/**
 * A product's SKU is already taken by another product.
 *
 * Worth its own type because it is the one failure here that a person can act
 * on: the payload's own schema checks SKUs against each other, but only a
 * database knows what else is in the catalogue, so this is the first point at
 * which a collision is knowable at all.
 */
export class DuplicateSkuError extends Error {
  constructor() {
    super("A product already uses one of these SKUs.");
    this.name = "DuplicateSkuError";
  }
}

/**
 * A product no slug could be found for.
 *
 * Only reachable after `SLUG_ATTEMPTS` collisions on the same name, which is
 * not a thing that happens by accident — but a loop that can give up needs to
 * say so rather than return undefined.
 */
export class SlugExhaustedError extends Error {
  constructor(base: string) {
    super(`Could not find a free slug for "${base}".`);
    this.name = "SlugExhaustedError";
  }
}

/**
 * Stores a draft and returns its id.
 *
 * The slug is generated from the name and then *retried* rather than checked
 * first. Querying for a free slug and inserting it is two statements with a gap
 * between them, and two admins saving the same name at once is exactly the case
 * that gap loses — the unique constraint is the only thing that actually knows,
 * so the insert is what asks it.
 */
export async function createProduct(
  input: AdminProductCreate,
): Promise<string> {
  const base = slugify(input.name);
  const drafts = variantDraftsByName(input.variants);

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      return await insertProduct(input, drafts, slugAttempt(base, attempt));
    } catch (error) {
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

/**
 * The whole product, in one transaction.
 *
 * Two statements rather than one nested create: a variant is selected by an
 * option value, and the option values are rows this same insert is creating, so
 * their ids do not exist until it has run. Either the product and all of its
 * variants are stored, or none of it is — a product whose colours lost their
 * prices to a half-finished insert would look like the form had not been filled
 * in.
 */
async function insertProduct(
  input: AdminProductCreate,
  drafts: Map<string, VariantDraft>,
  slug: string,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: productCreateData(input, slug),
      // Read back with their translations so each colour can be matched to the
      // option value that carries it. Matching on the id would mean the caller
      // had to generate one; matching on the name is what the payload and the
      // form already agree on.
      include: {
        options: { include: { values: { include: { translations: true } } } },
      },
    });

    const valueIdsByColor = new Map<string, string>();
    for (const option of product.options) {
      for (const value of option.values) {
        for (const translation of value.translations) {
          if (translation.locale !== DEFAULT_LOCALE) continue;
          valueIdsByColor.set(translation.name.trim().toLowerCase(), value.id);
        }
      }
    }

    for (const [color, draft] of drafts) {
      const optionValueId = valueIdsByColor.get(color);
      // Unreachable through the form — the shared schema refuses a variant
      // whose colour is not one of the product's — and skipped rather than
      // thrown over, because a direct POST that got this far has nothing to
      // gain from taking the whole save down with it.
      if (optionValueId === undefined) continue;

      const variant = await tx.productVariant.create({
        data: {
          ...variantCreateData(draft, optionValueId),
          productId: product.id,
        },
      });

      // The images were uploaded before the product existed, so they are
      // claimed here instead of created here. `updateMany` rather than
      // `update`: an id that names nothing — a tampered payload, or an upload
      // from a form someone abandoned — is a no-op, where `update` would throw
      // and lose the whole product over an image nobody will see.
      for (const [position, mediaId] of draft.mediaIds.entries()) {
        await tx.media.updateMany({
          where: { id: mediaId },
          data: { productId: product.id, variantId: variant.id, position },
        });
      }
    }

    return product.id;
  });
}

/**
 * Moves a product between the two statuses the list's buttons mean.
 *
 * `updateMany` rather than `update`: the id arrives in a form field, and a
 * product deleted in another tab between the page rendering and the click is a
 * no-op rather than an exception. The count is the answer to "did anything
 * happen", which the action turns into a message.
 *
 * The variants keep their own status. Nothing reads it yet — the storefront
 * still reads its fixture — and a publish that quietly rewrote a second table
 * would be deciding policy about what makes a variant sellable that no screen
 * has stated.
 */
export async function setProductStatus(
  id: string,
  status: "draft" | "active",
): Promise<number> {
  const { count } = await prisma.product.updateMany({
    where: { id },
    data: { status },
  });

  return count;
}

/**
 * What the edit screen shows, loaded from the row it is going to rewrite.
 *
 * It is the same shape the create form holds, in the same units: prices and
 * stock as the strings a text box contains, `mediaIds` in the order they are
 * shown. The screen is the same screen — the point of loading it this way is
 * that the form above it cannot tell which one it is.
 */
export interface ProductForEdit {
  id: string;
  status: ProductStatus;
  /**
   * When the row last changed.
   *
   * It travels to the screen so the form can be keyed by it — see the edit
   * page, which has to explain why that is not belt-and-braces.
   */
  updatedAt: string;
  name: string;
  shortDescription: string;
  description: string;
  slug: string;
  attributes: {
    id: string;
    kind: AttributeKind;
    /** `variants` is how many are selected by this value — see the edit screen. */
    values: { id: string; name: string; variants: number }[];
  }[];
  /** One per colour that has a variant, with the colour it is selected by. */
  variants: {
    color: string;
    sku: string;
    price: string;
    stock: string;
    mediaIds: string[];
  }[];
}

/**
 * The product, or null when there is no such row.
 *
 * Null rather than a throw: the id is in the URL, and a URL anyone can type is
 * a URL anyone can get wrong. The page turns it into a 404.
 */
export async function getProductForEdit(
  id: string,
): Promise<ProductForEdit | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      options: {
        orderBy: { position: "asc" },
        include: {
          values: {
            orderBy: { position: "asc" },
            include: {
              translations: { where: { locale: DEFAULT_LOCALE } },
              // Counted, not loaded: the edit screen only needs to know
              // whether removing a value would take a variant with it.
              _count: { select: { variants: true } },
            },
          },
        },
      },
      variants: {
        include: {
          optionValues: {
            include: { optionValue: { include: { translations: true } } },
          },
          media: { orderBy: { position: "asc" }, select: { id: true } },
        },
      },
    },
  });

  if (!product) return null;

  const translation = product.translations[0];

  return {
    id: product.id,
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
    attributes: product.options.map((option) => ({
      id: option.id,
      kind: option.kind,
      values: option.values.map((value) => ({
        id: value.id,
        name: value.translations[0]?.name ?? "",
        variants: value._count.variants,
      })),
    })),
    variants: product.variants.map((variant) => ({
      // The colour it is selected by, which is what the form's rows are keyed
      // on — a variant is one colour's row, and the row is found by name.
      color:
        variant.optionValues[0]?.optionValue.translations[0]?.name ?? "",
      sku: variant.sku ?? "",
      price: variant.priceAmount?.toString() ?? "",
      // A number in the database, a string in a text box — the form's unit, so
      // that loading is not a special case the form has to know about.
      stock: String(variant.stock),
      mediaIds: variant.media.map((media) => media.id),
    })),
    // A row with no translation in this locale is not something this app
    // writes; an empty form is a better answer than a crash on a hand-inserted
    // row, and saving will write the translation it was missing.
    name: translation?.name ?? "",
    shortDescription: translation?.shortDescription ?? "",
    description: translation?.description ?? "",
    slug: translation?.slug ?? "",
  };
}

/**
 * Rewrites a product: what it says, what it is offered in, what each colour
 * costs, and which images belong to it.
 *
 * One transaction and one reconcile, because it is one save. The alternative —
 * the screen sending three payloads and the repository writing three times —
 * leaves a product that is half of what was on screen if the second write
 * fails, and gives every partial state a chance to be read by someone.
 *
 * The reconciliation is by *name*, which is what the create form's colour box
 * holds: a colour is the word in the list, and renaming it is replacing it. The
 * variant that belonged to the old name goes with it, and the screen says so
 * before anyone types — the row for a colour with a variant behind it carries
 * the warning, and the row a rename produces is empty, so the loss is visible
 * before Save rather than after.
 */
export async function updateProduct(
  id: string,
  input: AdminProductCreate,
): Promise<void> {
  const base = slugify(input.name);

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      await writeProduct(id, input, slugAttempt(base, attempt));
      return;
    } catch (error) {
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

async function writeProduct(
  id: string,
  input: AdminProductCreate,
  slug: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    /*
     * Move the row's own timestamp.
     *
     * Everything a product is made of lives in other tables, so without this
     * `products.updated_at` would say a product had not changed since the day
     * it was created — and the column is not decoration: plan.md lists it, and
     * the edit screen keys the form by it. Keyed by the id, the form would keep
     * the values it first mounted with; keyed by this, opening a product you
     * have just saved shows what you saved.
     */
    await tx.product.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId: id, locale: DEFAULT_LOCALE } },
      create: {
        productId: id,
        locale: DEFAULT_LOCALE,
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
      },
      update: {
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
      },
    });

    const current = await tx.productOption.findMany({
      where: { productId: id },
      include: {
        values: {
          include: { translations: { where: { locale: DEFAULT_LOCALE } } },
        },
      },
    });

    const wanted = new Set(input.attributes.map((attribute) => attribute.kind));

    // An option the product is no longer offered in. Its values and the
    // variants selected by them go with it.
    for (const option of current) {
      if (wanted.has(option.kind)) continue;

      await deleteVariantsForOption(tx, option.id);
      await tx.productOption.delete({ where: { id: option.id } });
    }

    for (const [position, attribute] of input.attributes.entries()) {
      const existing = current.find((option) => option.kind === attribute.kind);

      if (!existing) {
        await tx.productOption.create({
          data: {
            productId: id,
            kind: attribute.kind,
            position,
            translations: {
              create: {
                locale: DEFAULT_LOCALE,
                name: ATTRIBUTE_LABELS[attribute.kind],
              },
            },
            values: {
              create: attribute.values.map((name, valuePosition) => ({
                position: valuePosition,
                translations: {
                  create: { locale: DEFAULT_LOCALE, name },
                },
              })),
            },
          },
        });

        continue;
      }

      await tx.productOption.update({
        where: { id: existing.id },
        data: { position },
      });

      // Read before anything is written, so a name that is already there is
      // matched once rather than matched against a row this loop just created.
      const byName = new Map(
        existing.values.map((value) => [
          (value.translations[0]?.name ?? "").trim().toLowerCase(),
          value,
        ]),
      );
      const kept = new Set<string>();

      for (const [valuePosition, name] of attribute.values.entries()) {
        const match = byName.get(name.trim().toLowerCase());

        if (!match) {
          await tx.productOptionValue.create({
            data: {
              optionId: existing.id,
              position: valuePosition,
              translations: { create: { locale: DEFAULT_LOCALE, name } },
            },
          });

          continue;
        }

        kept.add(match.id);
        await tx.productOptionValue.update({
          where: { id: match.id },
          data: {
            position: valuePosition,
            translations: {
              upsert: {
                where: {
                  valueId_locale: { valueId: match.id, locale: DEFAULT_LOCALE },
                },
                create: { locale: DEFAULT_LOCALE, name },
                update: { name },
              },
            },
          },
        });
      }

      for (const value of existing.values) {
        if (kept.has(value.id)) continue;

        await deleteVariantsForOptionValue(tx, value.id);
        await tx.productOptionValue.delete({ where: { id: value.id } });
      }
    }

    const valueIdByColor = await colourValueIds(tx, id);
    const drafts = variantDraftsByName(input.variants);
    const claimed: string[] = [];

    for (const [color, draft] of drafts) {
      const optionValueId = valueIdByColor.get(color);
      // Unreachable through the form — the shared schema refuses a variant
      // whose colour the product does not offer — and skipped rather than
      // thrown over, so a crafted payload cannot take the whole save down.
      if (optionValueId === undefined) continue;

      const existing = await tx.productVariant.findFirst({
        where: {
          productId: id,
          optionValues: { some: { optionValueId } },
        },
      });

      const variant = existing
        ? await tx.productVariant.update({
            where: { id: existing.id },
            data: variantFields(draft),
          })
        : await tx.productVariant.create({
            data: {
              ...variantCreateData(draft, optionValueId),
              productId: id,
            },
          });

      for (const [mediaPosition, mediaId] of draft.mediaIds.entries()) {
        await tx.media.updateMany({
          where: { id: mediaId },
          data: { productId: id, variantId: variant.id, position: mediaPosition },
        });

        claimed.push(mediaId);
      }
    }

    // Images that were taken off the form. They belong to nothing else — an
    // upload is made for one row and claimed by one save — so a removed one is
    // a row with no reader, and leaving it is how a store fills up with files
    // nobody can find.
    await tx.media.deleteMany({
      where: { productId: id, id: { notIn: claimed } },
    });
  });
}

/**
 * The option value that selects each colour, by the colour's canonical name.
 */
async function colourValueIds(
  tx: Pick<PrismaClient, "productOption">,
  productId: string,
): Promise<Map<string, string>> {
  const options = await tx.productOption.findMany({
    where: { productId },
    include: {
      values: {
        include: { translations: { where: { locale: DEFAULT_LOCALE } } },
      },
    },
  });

  const byColor = new Map<string, string>();

  for (const option of options) {
    for (const value of option.values) {
      const name = value.translations[0]?.name;
      if (name === undefined) continue;

      byColor.set(name.trim().toLowerCase(), value.id);
    }
  }

  return byColor;
}

/**
 * The variants selected by an option, deleted along with the join rows that
 * pointed at it.
 *
 * Deleting the join rows alone is what a cascade does, and it is the wrong
 * answer: the variant would survive with no colour, invisible to every reader
 * and to the product page, which is exactly the half-filled matrix the create
 * form's rules exist to avoid.
 */
async function deleteVariantsForOption(
  tx: Pick<PrismaClient, "productVariant">,
  optionId: string,
): Promise<void> {
  await tx.productVariant.deleteMany({
    where: { optionValues: { some: { optionValue: { optionId } } } },
  });
}

async function deleteVariantsForOptionValue(
  tx: Pick<PrismaClient, "productVariant">,
  optionValueId: string,
): Promise<void> {
  await tx.productVariant.deleteMany({
    where: { optionValues: { some: { optionValueId } } },
  });
}

/**
 * Whether this is the `(locale, slug)` constraint, rather than any other.
 *
 * A P2002 on this insert could just as well be the SKU's unique constraint, and
 * retrying with a different slug would never fix that — it would loop the whole
 * hundred attempts and then report the wrong problem. So the target decides:
 * the slug one is retried, the SKU one is handed up as something to tell
 * someone about.
 */
function isSlugTaken(error: unknown): boolean {
  const constraint = uniqueConstraint(error);
  if (constraint === null) return false;

  // The only other unique constraint this insert can trip is the SKU's, and
  // retrying with a different slug would never fix that — it would spend the
  // whole hundred attempts and then report the wrong problem.
  if (constraint.includes("productvariant") || constraint.includes("sku")) {
    throw new DuplicateSkuError();
  }

  return constraint.includes("producttranslation") || constraint.includes("slug");
}

/**
 * Which unique constraint a violation names, lowercased, or null when the error
 * is not one.
 *
 * Two shapes, because two things can produce this error. Prisma reports the
 * columns under `meta.target`; a driver adapter — which is how this app runs,
 * through `@prisma/adapter-pg` — reports the model and the index instead, under
 * `meta.driverAdapterError`. Both are read rather than only the one in use, so
 * that changing the adapter does not quietly turn every constraint violation
 * into an unrecognised error.
 *
 * The result is a haystack, not a field: what the caller needs to know is
 * *which* of two constraints was hit, and both shapes name their model and
 * their columns well enough to say.
 */
function uniqueConstraint(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  const { code, meta } = error as {
    code?: unknown;
    meta?: {
      modelName?: unknown;
      target?: unknown;
      driverAdapterError?: {
        cause?: { constraint?: { index?: unknown; fields?: unknown } };
      };
    };
  };

  if (code !== "P2002") return null;

  const parts: unknown[] = [
    meta?.modelName,
    meta?.target,
    meta?.driverAdapterError?.cause?.constraint?.index,
    meta?.driverAdapterError?.cause?.constraint?.fields,
  ];

  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
}

/**
 * What the admin list needs, one row per product.
 *
 * Reduced here rather than in the page, because the page is a Server Component
 * and the shape of a query belongs with the query. The prices come back as
 * `Money`, with the amount still a decimal string — `Decimal.toString()` is
 * exact, and `money.ts` is explicit that a monetary value never becomes a
 * JavaScript number.
 */
export interface AdminProductSummary {
  id: string;
  name: string;
  shortDescription: string;
  status: ProductStatus;
  prices: Money[];
  options: { name: string; values: string[] }[];
  imageCount: number;
}

/**
 * Every product in the catalogue, newest first.
 *
 * "Every" and not "the drafts": this used to be `listCreatedProducts`, named
 * for the only rows that existed when the rest of the catalogue was a fixture
 * in the web app. The query never filtered, and now that the list reads from
 * here alone the name would be the misleading part — the page above it shows
 * whatever the database holds.
 */
export async function listProducts(): Promise<AdminProductSummary[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      options: {
        orderBy: { position: "asc" },
        include: {
          translations: { where: { locale: DEFAULT_LOCALE } },
          values: {
            orderBy: { position: "asc" },
            include: { translations: { where: { locale: DEFAULT_LOCALE } } },
          },
        },
      },
      variants: true,
      media: { select: { id: true } },
    },
  });

  return products.map((product) => {
    const translation = product.translations[0];

    return {
      id: product.id,
      // A product with no translation in this locale is not a state this app
      // can produce — every create writes one — so the fallback is for a row
      // someone inserted by hand, and an empty name beats a crash in a list.
      name: translation?.name ?? "",
      shortDescription: translation?.shortDescription ?? "",
      status: product.status,
      prices: product.variants.flatMap((variant) =>
        variant.priceAmount !== null && variant.priceCurrency !== null
          ? [
              {
                // `toString` and not `toNumber`: plan.md, decision 3.
                amount: variant.priceAmount.toString(),
                currency: variant.priceCurrency,
              },
            ]
          : [],
      ),
      options: product.options.map((option) => ({
        name: option.translations[0]?.name ?? "",
        values: option.values.map(
          (value) => value.translations[0]?.name ?? "",
        ),
      })),
      imageCount: product.media.length,
    };
  });
}
