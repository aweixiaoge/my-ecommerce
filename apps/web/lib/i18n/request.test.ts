import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestLocale } from "./request";

/**
 * The one place the URL's first segment becomes the app's locale.
 *
 * Both of the things it reads are request-scoped — the root parameter the
 * framework fills in, and the 404 — so both are stood in for here. What is
 * worth asserting is the decision between them, which is the whole function.
 */
const rootParams = vi.hoisted(() => ({ lang: vi.fn() }));

vi.mock("next/root-params", () => ({ lang: rootParams.lang }));

/** `notFound()` throws in the framework, and this has to as well: the caller
 *  is expected to stop, which is the difference between a 404 and a page
 *  rendering in a language nobody asked for. */
const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: navigation.notFound }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestLocale", () => {
  it("answers the language of the address", async () => {
    rootParams.lang.mockResolvedValue("de");

    expect(await requestLocale()).toBe("de");
    expect(navigation.notFound).not.toHaveBeenCalled();
  });

  it("turns away a segment that is not a language", async () => {
    // The proxy redirects anything without a language, so a segment that
    // reaches here and is not one means the URL is wrong — and a wrong URL
    // should not render a page in a language nobody asked for.
    rootParams.lang.mockResolvedValue("xx");

    await expect(requestLocale()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
  });

  it("turns away a route with no language segment at all", async () => {
    // `lang()` is `string | undefined` rather than `string`: the admin's root
    // layout has no such segment, and the getter is typed for every route.
    rootParams.lang.mockResolvedValue(undefined);

    await expect(requestLocale()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
