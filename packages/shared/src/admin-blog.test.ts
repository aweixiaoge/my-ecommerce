import { describe, expect, it } from "vitest";
import {
  AdminBlogCategoryCreateSchema,
  AdminBlogCreateSchema,
  IMAGES_PER_BLOG_MAX,
} from "./admin-blog";

/** A payload that passes, so each case below can vary one thing. */
function blog(overrides: Record<string, unknown> = {}) {
  return {
    title: "How to judge earphone sound quality",
    shortDescription: "Bass, treble and soundstage, in plain English.",
    description: "## The basics\n\nEvery sound you hear is a frequency.",
    categoryId: "cat_1",
    mediaIds: ["media_1"],
    ...overrides,
  };
}

describe("AdminBlogCreateSchema", () => {
  it("accepts a post with its five fields", () => {
    expect(AdminBlogCreateSchema.safeParse(blog()).success).toBe(true);
  });

  it("trims the title and the blurb", () => {
    // The trimmed title is what the slug is made from, and the trimmed blurb is
    // what the storefront's card shows — neither should carry a stray space into
    // a URL or a card.
    const result = AdminBlogCreateSchema.safeParse(
      blog({ title: "  Sound quality  ", shortDescription: "  Bass  " }),
    );

    expect(result.success && result.data.title).toBe("Sound quality");
    expect(result.success && result.data.shortDescription).toBe("Bass");
  });

  it("rejects a title that is empty or only whitespace", () => {
    for (const title of ["", "   ", "\t\n"]) {
      expect(AdminBlogCreateSchema.safeParse(blog({ title })).success).toBe(
        false,
      );
    }
  });

  it("rejects a title past its bound, and keeps the one at it", () => {
    expect(
      AdminBlogCreateSchema.safeParse(blog({ title: "t".repeat(201) })).success,
    ).toBe(false);
    expect(
      AdminBlogCreateSchema.safeParse(blog({ title: "t".repeat(200) })).success,
    ).toBe(true);
  });

  it("keeps an empty blurb — a post does not need one yet", () => {
    expect(
      AdminBlogCreateSchema.safeParse(blog({ shortDescription: "" })).success,
    ).toBe(true);
  });

  it("rejects a post without a category", () => {
    // The select's placeholder sends the empty string and a missing field sends
    // nothing; both are "no category", and a post nobody can file is one nobody
    // can browse by topic.
    for (const categoryId of ["", undefined]) {
      expect(
        AdminBlogCreateSchema.safeParse(blog({ categoryId })).success,
      ).toBe(false);
    }
  });

  it("defaults the images to none", () => {
    // A post saved before any photograph was chosen is a draft, not an error.
    const result = AdminBlogCreateSchema.safeParse({
      title: "How to judge earphone sound quality",
      shortDescription: "",
      description: "",
      categoryId: "cat_1",
    });

    expect(result.success && result.data.mediaIds).toEqual([]);
  });

  it("rejects a post with more images than it can hold, and keeps the one at the cap", () => {
    const ids = (count: number) =>
      Array.from({ length: count }, (_, index) => `media_${index}`);

    expect(
      AdminBlogCreateSchema.safeParse(
        blog({ mediaIds: ids(IMAGES_PER_BLOG_MAX + 1) }),
      ).success,
    ).toBe(false);
    expect(
      AdminBlogCreateSchema.safeParse(blog({ mediaIds: ids(IMAGES_PER_BLOG_MAX) }))
        .success,
    ).toBe(true);
  });

  it("rejects images that are not a list of ids", () => {
    // A file posted under this name, or a JSON blob that parsed to the wrong
    // shape: neither is a list of media rows, and neither may reach the store.
    for (const mediaIds of ["media_1", {}, [""], [42]]) {
      expect(AdminBlogCreateSchema.safeParse(blog({ mediaIds })).success).toBe(
        false,
      );
    }
  });

  it("carries nothing the form does not offer", () => {
    // The slug is generated from the title and the timestamps are the
    // database's, so a payload that could carry any of them would let a crafted
    // POST decide a URL or a date no screen offers to decide.
    const result = AdminBlogCreateSchema.safeParse(
      blog({ slug: "mine", status: "published", createdAt: "2020-01-01" }),
    );

    expect(result.success && result.data).toEqual(blog());
  });
});

describe("AdminBlogCategoryCreateSchema", () => {
  /** A payload that passes, so each case below can vary one thing. */
  function category(overrides: Record<string, unknown> = {}) {
    return { name: "Engineer", ...overrides };
  }

  it("accepts a category with a name, trimmed", () => {
    const result = AdminBlogCategoryCreateSchema.safeParse(
      category({ name: "  Engineer  " }),
    );

    expect(result.success && result.data.name).toBe("Engineer");
  });

  it("rejects a name that is empty or only whitespace", () => {
    for (const name of ["", "   "]) {
      expect(
        AdminBlogCategoryCreateSchema.safeParse(category({ name })).success,
      ).toBe(false);
    }
  });

  it("rejects a name past its bound", () => {
    expect(
      AdminBlogCategoryCreateSchema.safeParse(
        category({ name: "n".repeat(201) }),
      ).success,
    ).toBe(false);
  });

  it("carries nothing but the name", () => {
    // The slug and the parent are the write side's to decide; a payload that
    // could carry either would let a crafted POST decide a URL or a place in a
    // tree no screen offers.
    const result = AdminBlogCategoryCreateSchema.safeParse(
      category({ slug: "engineer", parentId: "cat_2" }),
    );

    expect(result.success && result.data).toEqual({ name: "Engineer" });
  });
});
