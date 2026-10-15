import { describe, expect, it } from "vitest";
import { IMAGES_PER_VARIANT_MAX, MAX_IMAGE_BYTES } from "@my-ecommerce/shared";
import { fileProblem, mediaUrl, planUploads } from "./product-media";

/**
 * A file with the three fields the checks read.
 *
 * The real thing would mean allocating megabytes to test a limit, which proves
 * nothing the size property does not.
 */
function file(name: string, type = "image/png", size = 1024): File {
  return { name, type, size } as File;
}

describe("mediaUrl", () => {
  it("addresses an image by the id the upload returned", () => {
    expect(mediaUrl("media_01")).toBe("/admin/media/media_01");
  });
});

describe("fileProblem", () => {
  it("accepts every image type the shared schema allows", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]) {
      expect(fileProblem(file("photo", type))).toBeNull();
    }
  });

  it("refuses a file that is not an image", () => {
    // Named, because the message has to tell someone which file to remove from
    // a batch of twenty.
    expect(fileProblem(file("invoice.pdf", "application/pdf"))).toContain(
      "invoice.pdf",
    );
  });

  it("refuses an SVG", () => {
    // A document, not a picture: served from this origin it would run as this
    // origin.
    expect(fileProblem(file("logo.svg", "image/svg+xml"))).not.toBeNull();
  });

  it("refuses a file over the size limit", () => {
    expect(fileProblem(file("huge.png", "image/png", MAX_IMAGE_BYTES + 1))).not.toBeNull();
  });

  it("accepts a file exactly at the limit", () => {
    expect(fileProblem(file("edge.png", "image/png", MAX_IMAGE_BYTES))).toBeNull();
  });

  it("names the size the file was refused for", () => {
    expect(fileProblem(file("huge.png", "image/png", MAX_IMAGE_BYTES + 1))).toContain(
      "3 MB",
    );
  });
});

describe("planUploads", () => {
  it("accepts files that fit and says nothing about them", () => {
    const result = planUploads([file("a.png"), file("b.png")], 6);

    expect(result.accepted.map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(result.problems).toEqual([]);
  });

  it("takes as many as there is room for and reports the rest once", () => {
    const result = planUploads([file("a.png"), file("b.png"), file("c.png")], 2);

    expect(result.accepted.map((f) => f.name)).toEqual(["a.png", "b.png"]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("1 image was not uploaded");
  });

  it("counts the files that did not fit rather than naming them", () => {
    const result = planUploads(
      [file("a.png"), file("b.png"), file("c.png")],
      1,
    );

    expect(result.problems[0]).toContain("2 images were not uploaded");
    expect(result.problems[0]).toContain(String(IMAGES_PER_VARIANT_MAX));
  });

  it("accepts nothing when the colour is already full", () => {
    const result = planUploads([file("a.png")], 0);

    expect(result.accepted).toEqual([]);
    expect(result.problems[0]).toContain("1 image was not uploaded");
  });

  it("reports a bad file separately from one that did not fit", () => {
    const result = planUploads(
      [file("notes.txt", "text/plain"), file("a.png"), file("b.png")],
      1,
    );

    expect(result.accepted.map((f) => f.name)).toEqual(["a.png"]);
    expect(result.problems).toHaveLength(2);
    expect(result.problems[0]).toContain("notes.txt");
    expect(result.problems[1]).toContain("not uploaded");
  });

  it("does not count a refused file against the room", () => {
    // Otherwise dropping in one PDF would silently use up a slot.
    const result = planUploads([file("notes.txt", "text/plain"), file("a.png")], 1);

    expect(result.accepted.map((f) => f.name)).toEqual(["a.png"]);
    expect(result.problems).toHaveLength(1);
  });

  it("says nothing when there was nothing to do", () => {
    expect(planUploads([], 6)).toEqual({ accepted: [], problems: [] });
  });
});
