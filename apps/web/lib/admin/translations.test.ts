import { beforeEach, describe, expect, it, vi } from "vitest";
import { TranslationError, type TargetLocale, type Translator } from "@/lib/i18n/translate/translate";
import {
  translateBlog,
  translateBlogCategory,
  translateCategory,
  translateEntity,
  translateAbout,
  translateFaq,
  translateProduct,
} from "./translations";

/**
 * The translation pass, against a stand-in for the database and a translator
 * that is a function in the test.
 *
 * What is worth asserting is which rows get written, with which slug, and —
 * the rule the whole module exists for — which rows are left alone because a
 * person wrote them.
 */
const db = vi.hoisted(() => ({
  product: { findUnique: vi.fn() },
  productTranslation: { upsert: vi.fn() },
  productOptionTranslation: { upsert: vi.fn() },
  productOptionValueTranslation: { upsert: vi.fn() },
  categoryTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  blogTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  blogCategoryTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  faqTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  aboutTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

/** A translator that marks each text, so a test can see what was asked — and
 *  what it answered, which is what makes the slugs testable. */
function translator(overrides: Record<string, string> = {}, failFor?: TargetLocale) {
  return vi.fn(async (texts: readonly string[], target: TargetLocale) => {
    if (target === failFor) throw new TranslationError("rate", "slow down");

    return texts.map((text) => overrides[text] ?? `[${target}] ${text}`);
  });
}

/** A product as the pass reads it: one English row, one option, one value. */
function productRow(overrides: Record<string, unknown> = {}) {
  return {
    translations: [
      {
        locale: "en",
        autoTranslated: false,
        name: "Studio Over-Ear",
        shortDescription: "Closed-back, tuned flat.",
        description: "## The basics",
        metaTitle: null,
        metaDescription: null,
      },
    ],
    options: [
      {
        id: "opt_1",
        translations: [{ locale: "en", autoTranslated: false, name: "Color" }],
        values: [
          {
            id: "val_1",
            translations: [{ locale: "en", autoTranslated: false, name: "Onyx" }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findUnique.mockResolvedValue(productRow());
  db.productTranslation.upsert.mockResolvedValue({});
  db.productOptionTranslation.upsert.mockResolvedValue({});
  db.productOptionValueTranslation.upsert.mockResolvedValue({});
  db.categoryTranslation.findMany.mockResolvedValue([]);
  db.categoryTranslation.upsert.mockResolvedValue({});
  db.blogTranslation.findMany.mockResolvedValue([]);
  db.blogTranslation.upsert.mockResolvedValue({});
  db.blogCategoryTranslation.findMany.mockResolvedValue([]);
  db.blogCategoryTranslation.upsert.mockResolvedValue({});
});

/** The arguments of the nth call to a mock, as an object. */
const callOf = (mock: ReturnType<typeof vi.fn>, index: number) =>
  mock.mock.calls[index]?.[0] as Record<string, never>;

describe("translateProduct", () => {
  it("writes all four languages, from the English row", async () => {
    const translate = translator({ "Studio Over-Ear": "Studio Überohr" });

    const result = await translateProduct("prod_1", { translate });

    expect(result).toEqual({
      translated: ["de", "fr", "pt", "es"],
      kept: [],
      failed: [],
    });
    expect(db.productTranslation.upsert).toHaveBeenCalledTimes(4);
  });

  it("makes each language's slug from that language's name", async () => {
    // The whole point of a slug per locale: a German page's address says the
    // German name, with the accents taken off — `slugify` is the same
    // transformation the English write uses.
    const translate = translator({ "Studio Over-Ear": "Studio Überohr" });

    await translateProduct("prod_1", { translate });

    const german = callOf(db.productTranslation.upsert, 0);
    expect(german.create).toMatchObject({
      locale: "de",
      name: "Studio Überohr",
      slug: "studio-uberohr",
      autoTranslated: true,
    });
  });

  it("translates the option and value names into their own tables", async () => {
    const translate = translator({ Color: "Farbe", Onyx: "Onyx-Schwarz" });

    await translateProduct("prod_1", { translate });

    expect(callOf(db.productOptionTranslation.upsert, 0)).toMatchObject({
      create: { optionId: "opt_1", locale: "de", name: "Farbe", autoTranslated: true },
    });
    expect(callOf(db.productOptionValueTranslation.upsert, 0)).toMatchObject({
      create: { valueId: "val_1", locale: "de", name: "Onyx-Schwarz" },
    });
  });

  it("asks for a product's copy and its option names in one call per language", async () => {
    // One request per language rather than one per field: the names are two
    // words, and beside the product's own sentences the translator can tell
    // that "Sand" is a colour here.
    const translate = translator();

    await translateProduct("prod_1", { translate });

    expect(translate).toHaveBeenCalledTimes(4);
    expect(translate.mock.calls[0]?.[0]).toEqual([
      "Studio Over-Ear",
      "Closed-back, tuned flat.",
      "## The basics",
      "Color",
      "Onyx",
    ]);
  });

  it("leaves a language a person wrote alone", async () => {
    // The rule that makes re-translating safe: a German name somebody fixed by
    // hand is theirs, and an English edit does not overwrite it. Here the whole
    // language is theirs — the product row and the names its options carry.
    db.product.findUnique.mockResolvedValue(
      productRow({
        translations: [
          ...productRow().translations,
          {
            locale: "de",
            autoTranslated: false,
            name: "Studio Überohr",
            shortDescription: "Von Hand geschrieben",
            description: "",
            metaTitle: null,
            metaDescription: null,
          },
        ],
        options: [
          {
            id: "opt_1",
            translations: [
              { locale: "en", autoTranslated: false, name: "Color" },
              { locale: "de", autoTranslated: false, name: "Farbe" },
            ],
            values: [
              {
                id: "val_1",
                translations: [
                  { locale: "en", autoTranslated: false, name: "Onyx" },
                  { locale: "de", autoTranslated: false, name: "Onyx-Schwarz" },
                ],
              },
            ],
          },
        ],
      }),
    );

    const translate = translator();
    const result = await translateProduct("prod_1", { translate });

    expect(result.kept).toEqual(["de"]);
    expect(result.translated).toEqual(["fr", "pt", "es"]);
    expect(db.productTranslation.upsert).toHaveBeenCalledTimes(3);
    expect(db.productOptionTranslation.upsert).toHaveBeenCalledTimes(3);
    // The German rows are not among the writes.
    for (const [args] of db.productTranslation.upsert.mock.calls) {
      expect((args as { where: unknown }).where).not.toMatchObject({
        productId_locale: { locale: "de" },
      });
    }
  });

  it("keeps the rows a person wrote even when it writes others in that language", async () => {
    // The rule is per row, not per language. A product a person translated
    // whose *option* names nobody has done yet still gets its option names —
    // an untranslated "Color" beside a German product is the gap this is here
    // to close — and the language is reported as one it wrote, because it did.
    db.product.findUnique.mockResolvedValue(
      productRow({
        translations: [
          ...productRow().translations,
          {
            locale: "de",
            autoTranslated: false,
            name: "Studio Überohr",
            shortDescription: "Von Hand geschrieben",
            description: "",
            metaTitle: null,
            metaDescription: null,
          },
        ],
      }),
    );

    const result = await translateProduct("prod_1", { translate: translator() });

    expect(result.kept).toEqual([]);
    expect(result.translated).toContain("de");
    expect(db.productOptionTranslation.upsert).toHaveBeenCalledTimes(4);
    // The product row itself was not among the writes: the German name stands.
    for (const [args] of db.productTranslation.upsert.mock.calls) {
      expect((args as { where: unknown }).where).not.toMatchObject({
        productId_locale: { locale: "de" },
      });
    }
  });

  it("refreshes a language the machine wrote", async () => {
    db.product.findUnique.mockResolvedValue(
      productRow({
        translations: [
          ...productRow().translations,
          {
            locale: "de",
            autoTranslated: true,
            name: "Alte Übersetzung",
            shortDescription: "",
            description: "",
            metaTitle: null,
            metaDescription: null,
          },
        ],
      }),
    );

    const result = await translateProduct("prod_1", { translate: translator() });

    expect(result.translated).toContain("de");
    expect(db.productTranslation.upsert).toHaveBeenCalledTimes(4);
  });

  it("keeps one language's failure to that language", async () => {
    // A rate limit on Portuguese must not cost the other three their German,
    // French and Spanish pages.
    const result = await translateProduct("prod_1", {
      translate: translator({}, "pt"),
    });

    expect(result.translated).toEqual(["de", "fr", "es"]);
    expect(result.failed).toEqual([{ locale: "pt", kind: "rate" }]);
  });

  it("stops at once when there is no key, rather than failing four times", async () => {
    const translate = vi.fn(async () => {
      throw new TranslationError("unconfigured", "no key");
    }) as unknown as Translator;

    const result = await translateProduct("prod_1", { translate });

    expect(result.failed.map((failure) => failure.kind)).toEqual([
      "unconfigured",
      "unconfigured",
      "unconfigured",
      "unconfigured",
    ]);
    expect(db.productTranslation.upsert).not.toHaveBeenCalled();
  });

  it("counts a translator that throws a plain error as a failed language", async () => {
    const translate = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as Translator;

    const result = await translateProduct("prod_1", { translate });

    expect(result.failed.every((failure) => failure.kind === "response")).toBe(true);
  });

  it("tries the next slug when this language already has one", async () => {
    // The constraint is per locale, so the retry is too: two products can be
    // called the same thing in German without being the same product. One
    // language, so the order of the calls is the test's rather than the
    // scheduler's.
    db.productTranslation.upsert
      .mockRejectedValueOnce(Object.assign(new Error("taken"), { code: "P2002" }))
      .mockResolvedValue({});

    await translateProduct("prod_1", { translate: translator(), targets: ["de"] });

    expect(callOf(db.productTranslation.upsert, 0).create).toMatchObject({
      slug: "de-studio-over-ear",
    });
    expect(callOf(db.productTranslation.upsert, 1).create).toMatchObject({
      slug: "de-studio-over-ear-2",
    });
  });

  it("translates the four languages at the same time", async () => {
    // Not a detail of the implementation: the engine is the slow part — a
    // language model takes seconds — and four of them one after another is a
    // save that looks hung. In flight together, the pass takes as long as its
    // slowest language rather than the sum of all four.
    let inFlight = 0;
    let mostAtOnce = 0;

    const translate = vi.fn(async (texts: readonly string[], target: TargetLocale) => {
      inFlight += 1;
      mostAtOnce = Math.max(mostAtOnce, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;

      return texts.map((text) => `[${target}] ${text}`);
    });

    await translateProduct("prod_1", { translate });

    expect(mostAtOnce).toBe(4);
  });

  it("does nothing for a product with no English row", async () => {
    db.product.findUnique.mockResolvedValue(productRow({ translations: [] }));

    expect(await translateProduct("prod_1", { translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
    expect(db.productTranslation.upsert).not.toHaveBeenCalled();
  });

  it("does nothing for a product that is not there", async () => {
    db.product.findUnique.mockResolvedValue(null);

    expect(await translateProduct("gone", { translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
  });
});

describe("translateCategory", () => {
  beforeEach(() => {
    db.categoryTranslation.findUnique.mockResolvedValue({
      name: "Headphones",
      description: "",
      metaTitle: null,
      metaDescription: null,
    });
  });

  it("writes a name, a slug from it, and the copy it has", async () => {
    await translateCategory("cat_1", {
      translate: translator({ Headphones: "Kopfhörer" }),
    });

    expect(callOf(db.categoryTranslation.upsert, 0)).toMatchObject({
      where: { categoryId_locale: { categoryId: "cat_1", locale: "de" } },
      create: {
        locale: "de",
        name: "Kopfhörer",
        slug: "kopfhorer",
        autoTranslated: true,
      },
    });
  });

  it("falls back to a word when the translated name slugs to nothing", async () => {
    // "日本語" and "!!!" both reduce to the empty string, and the `(locale,
    // slug)` unique means two of them would collide.
    await translateCategory("cat_1", {
      translate: translator({ Headphones: "!!!" }),
    });

    expect(callOf(db.categoryTranslation.upsert, 0).create).toMatchObject({
      slug: "category",
    });
  });

  it("has nothing to do when the category has no English row", async () => {
    db.categoryTranslation.findUnique.mockResolvedValue(null);

    expect(await translateCategory("cat_1", { translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
  });

  it("stops at once when there is no key", async () => {
    // The same shortcut the product takes: with nothing configured there is
    // nothing to try four times.
    const translate = vi.fn(async () => {
      throw new TranslationError("unconfigured", "no key");
    }) as unknown as Translator;

    const result = await translateCategory("cat_1", { translate });

    expect(result.failed.map((failure) => failure.kind)).toEqual([
      "unconfigured",
      "unconfigured",
      "unconfigured",
      "unconfigured",
    ]);
    expect(db.categoryTranslation.upsert).not.toHaveBeenCalled();
  });
});

describe("translateBlog", () => {
  beforeEach(() => {
    db.blogTranslation.findUnique.mockResolvedValue({
      title: "How to judge earphone sound quality",
      shortDescription: "Bass, treble and soundstage.",
      description: "## The basics",
      metaTitle: null,
      metaDescription: null,
    });
  });

  it("takes the slug from the title, which is what a post's address is", async () => {
    await translateBlog("blog_1", {
      translate: translator({ "How to judge earphone sound quality": "Klang richtig beurteilen" }),
    });

    expect(callOf(db.blogTranslation.upsert, 0)).toMatchObject({
      where: { blogId_locale: { blogId: "blog_1", locale: "de" } },
      create: {
        title: "Klang richtig beurteilen",
        slug: "klang-richtig-beurteilen",
      },
    });
  });

  it("has nothing to do for a post with no English row", async () => {
    db.blogTranslation.findUnique.mockResolvedValue(null);

    expect(await translateBlog("blog_1", { translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
  });
});

describe("translateBlogCategory", () => {
  beforeEach(() => {
    db.blogCategoryTranslation.findUnique.mockResolvedValue({ name: "Engineer" });
  });

  it("writes the one field the screen collects", async () => {
    await translateBlogCategory("bcat_1", {
      translate: translator({ Engineer: "Technik" }),
    });

    expect(callOf(db.blogCategoryTranslation.upsert, 0)).toMatchObject({
      where: { categoryId_locale: { categoryId: "bcat_1", locale: "de" } },
      create: { locale: "de", name: "Technik", slug: "technik" },
    });
  });

  it("has nothing to do for a category with no English row", async () => {
    db.blogCategoryTranslation.findUnique.mockResolvedValue(null);

    expect(
      await translateBlogCategory("bcat_1", { translate: translator() }),
    ).toEqual({ translated: [], kept: [], failed: [] });
  });
});

describe("translateEntity", () => {
  it("sends each kind to its own query", async () => {
    // The shared action knows a kind and an id and nothing else; this is what
    // turns "product" into the product query.
    db.categoryTranslation.findUnique.mockResolvedValue({
      name: "Headphones",
      description: "",
      metaTitle: null,
      metaDescription: null,
    });
    db.blogTranslation.findUnique.mockResolvedValue({
      title: "A post",
      shortDescription: "",
      description: "",
      metaTitle: null,
      metaDescription: null,
    });
    db.blogCategoryTranslation.findUnique.mockResolvedValue({ name: "Engineer" });

    const translate = translator();

    await translateEntity("product", "prod_1", { translate });
    expect(db.product.findUnique).toHaveBeenCalled();

    await translateEntity("category", "cat_1", { translate });
    expect(db.categoryTranslation.findUnique).toHaveBeenCalled();

    await translateEntity("blog", "blog_1", { translate });
    expect(db.blogTranslation.findUnique).toHaveBeenCalled();

    await translateEntity("blogCategory", "bcat_1", { translate });
    expect(db.blogCategoryTranslation.findUnique).toHaveBeenCalled();
  });
});

describe("the edges a row can be in", () => {
  it("skips an option whose English name is missing", async () => {
    // Not a state the form writes — it always names an option — but a
    // hand-inserted row must not become an empty pill in four languages.
    db.product.findUnique.mockResolvedValue(
      productRow({
        options: [
          {
            id: "opt_1",
            translations: [],
            values: [{ id: "val_1", translations: [] }],
          },
        ],
      }),
    );

    const translate = translator();
    await translateProduct("prod_1", { translate });

    // The product's own copy still went; the names did not.
    expect(translate.mock.calls[0]?.[0]).toEqual([
      "Studio Over-Ear",
      "Closed-back, tuned flat.",
      "## The basics",
    ]);
    expect(db.productOptionTranslation.upsert).not.toHaveBeenCalled();
    expect(db.productOptionValueTranslation.upsert).not.toHaveBeenCalled();
  });

  it("keeps the English when a translator answers nothing for a field", async () => {
    // The type says a translator answers with strings; a service is not a type.
    // An empty answer must not become an empty product name — the English one
    // is what a page falls back to anyway, and writing "" over it would delete
    // it from the row.
    const translate = vi.fn(async (texts: readonly string[], target: TargetLocale) =>
      texts.map((text) => (text === "Studio Over-Ear" ? undefined : `[${target}] ${text}`)),
    ) as unknown as Translator;

    db.productTranslation.upsert.mockResolvedValue({});
    await translateProduct("prod_1", { translate });

    expect(callOf(db.productTranslation.upsert, 0).create).toMatchObject({
      name: "Studio Over-Ear",
    });
  });

  it("writes a meta pair when the English has one, and leaves it absent when it does not", async () => {
    await translateProduct("prod_1", { translate: translator() });
    expect(callOf(db.productTranslation.upsert, 0).create).toMatchObject({
      metaTitle: null,
      metaDescription: null,
    });

    db.product.findUnique.mockResolvedValue(
      productRow({
        translations: [
          {
            ...productRow().translations[0],
            metaTitle: "Studio Over-Ear",
            metaDescription: "Closed-back, tuned flat.",
          },
        ],
      }),
    );

    await translateProduct("prod_1", { translate: translator() });
    expect(callOf(db.productTranslation.upsert, 4).create).toMatchObject({
      metaTitle: "[de] Studio Over-Ear",
      metaDescription: "[de] Closed-back, tuned flat.",
    });
  });

  it("treats a thrown non-Error as a failure, not as a slug collision", async () => {
    // Only the database's own P2002 is a collision. Anything else — a socket
    // that closed, a rejection that is not even an Error — is reported, and
    // reported for every language it happened to.
    db.productTranslation.upsert.mockRejectedValue("connection lost");

    const result = await translateProduct("prod_1", { translate: translator() });

    expect(result.translated).toEqual([]);
    expect(result.failed).toEqual([
      { locale: "de", kind: "response" },
      { locale: "fr", kind: "response" },
      { locale: "pt", kind: "response" },
      { locale: "es", kind: "response" },
    ]);
  });
});

describe("when a write fails for a reason that is not a slug", () => {
  it("reports that language as failed, and the other three carry on", async () => {
    // A dropped connection is not a collision, so it is not retried a hundred
    // times — it is reported, and the languages that did not fail are still
    // translated.
    db.productTranslation.upsert
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { code: "P1001" }))
      .mockResolvedValue({});

    const result = await translateProduct("prod_1", { translate: translator() });

    expect(result.failed).toEqual([{ locale: "de", kind: "response" }]);
    expect(result.translated).toEqual(["fr", "pt", "es"]);
  });
});

describe("when every slug is taken", () => {
  it("reports the language as failed rather than throwing out of the pass", async () => {
    // A hundred collisions in one language is a language this run cannot
    // finish — and the other three must still get their turn, so it is
    // reported rather than thrown.
    db.productTranslation.upsert.mockRejectedValue(
      Object.assign(new Error("taken"), { code: "P2002" }),
    );

    const result = await translateProduct("prod_1", { translate: translator() });

    expect(result.translated).toEqual([]);
    expect(result.failed).toHaveLength(4);
  });
});

describe("translateFaq", () => {
  beforeEach(() => {
    db.faqTranslation.findMany.mockResolvedValue([{ locale: "en", autoTranslated: false }]);
    db.faqTranslation.findUnique.mockResolvedValue({ description: "## Shipping" });
    db.faqTranslation.upsert.mockResolvedValue({});
  });

  it("writes the description into all four languages, marked as the machine's", async () => {
    const result = await translateFaq({ translate: translator() });

    expect(result).toEqual({ translated: ["de", "fr", "pt", "es"], kept: [], failed: [] });
    expect(callOf(db.faqTranslation.upsert, 0)).toEqual({
      where: { locale: "de" },
      create: { locale: "de", description: "[de] ## Shipping", autoTranslated: true },
      update: { description: "[de] ## Shipping", autoTranslated: true },
    });
  });

  it("leaves a language a person wrote alone", async () => {
    db.faqTranslation.findMany.mockResolvedValue([
      { locale: "en", autoTranslated: false },
      { locale: "fr", autoTranslated: false },
      { locale: "de", autoTranslated: true },
    ]);

    const result = await translateFaq({ translate: translator() });

    expect(result.kept).toEqual(["fr"]);
    expect(result.translated).toEqual(["de", "pt", "es"]);
    const written = db.faqTranslation.upsert.mock.calls.map(
      ([args]) => (args as { where: { locale: string } }).where.locale,
    );
    expect(written).not.toContain("fr");
  });

  it("empties the machine's copies when English is emptied, without asking the translator", async () => {
    db.faqTranslation.findUnique.mockResolvedValue({ description: "" });
    const translate = translator();

    await translateFaq({ translate });

    expect(translate).not.toHaveBeenCalled();
    expect(callOf(db.faqTranslation.upsert, 0)).toMatchObject({ update: { description: "" } });
  });

  it("has nothing to do before English has been written", async () => {
    db.faqTranslation.findUnique.mockResolvedValue(null);

    expect(await translateFaq({ translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
  });

  it("reports one language's failure without losing the others", async () => {
    const result = await translateFaq({ translate: translator({}, "pt") });

    expect(result.translated).toEqual(["de", "fr", "es"]);
    expect(result.failed).toEqual([{ locale: "pt", kind: "rate" }]);
  });
});

describe("translateAbout", () => {
  beforeEach(() => {
    db.aboutTranslation.findMany.mockResolvedValue([
      { locale: "en", autoTranslated: false },
      { locale: "fr", autoTranslated: false },
    ]);
    db.aboutTranslation.findUnique.mockResolvedValue({ description: "## Who we are" });
    db.aboutTranslation.upsert.mockResolvedValue({});
  });

  it("writes the About table, as the machine's, and leaves a language a person wrote", async () => {
    const result = await translateAbout({ translate: translator() });

    expect(result).toEqual({ translated: ["de", "pt", "es"], kept: ["fr"], failed: [] });
    expect(callOf(db.aboutTranslation.upsert, 0)).toEqual({
      where: { locale: "de" },
      create: { locale: "de", description: "[de] ## Who we are", autoTranslated: true },
      update: { description: "[de] ## Who we are", autoTranslated: true },
    });
    expect(db.faqTranslation.upsert).not.toHaveBeenCalled();
  });

  it("does nothing before English is written", async () => {
    db.aboutTranslation.findUnique.mockResolvedValue(null);

    expect(await translateAbout({ translate: translator() })).toEqual({
      translated: [],
      kept: [],
      failed: [],
    });
    expect(db.aboutTranslation.upsert).not.toHaveBeenCalled();
  });
});
