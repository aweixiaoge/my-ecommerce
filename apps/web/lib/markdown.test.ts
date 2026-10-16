import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref } from "./markdown";

describe("parseInline link syntax", () => {
  it("leaves brackets that are not a link as text", () => {
    // `[note]` with no target is a common way to write a bracket in prose, and
    // it must survive as the author's characters rather than becoming an
    // anchor with nowhere to go.
    expect(parseInline("[note]")).toEqual([{ kind: "text", text: "[note]" }]);
  });
});

/** Every character of the source, whatever spans it landed in. */
function flatten(spans: { text: string }[]): string {
  return spans.map((span) => span.text).join("");
}

describe("parseMarkdown — blocks", () => {
  it("reads a bare line as a paragraph", () => {
    expect(parseMarkdown("Tuned flat.")).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "Tuned flat." }] },
    ]);
  });

  it("joins the lines of one paragraph with a space", () => {
    // Markdown's own rule: a single newline is a space; a blank line is what
    // starts a new paragraph.
    const blocks = parseMarkdown("line one\nline two\n\nsecond paragraph");

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.kind === "paragraph" && flatten(blocks[0]!.spans)).toBe(
      "line one line two",
    );
  });

  it("reads headings one to three, and no further", () => {
    expect(parseMarkdown("# One")).toEqual([
      {
        kind: "heading",
        level: 1,
        spans: [{ kind: "text", text: "One" }],
      },
    ]);
    expect(parseMarkdown("## Two")[0]).toMatchObject({ level: 2 });
    expect(parseMarkdown("### Three")[0]).toMatchObject({ level: 3 });

    // Four hashes is not a heading in this subset — it stays text rather than
    // becoming a heading the renderer has no size for.
    expect(parseMarkdown("#### Four")[0]).toMatchObject({ kind: "paragraph" });
  });

  it("reads an unordered list", () => {
    expect(parseMarkdown("- Aluminium\n- Memory foam")).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [
          [{ kind: "text", text: "Aluminium" }],
          [{ kind: "text", text: "Memory foam" }],
        ],
      },
    ]);
  });

  it("reads a starred list the same way", () => {
    expect(parseMarkdown("* One\n* Two")[0]).toMatchObject({
      kind: "list",
      ordered: false,
    });
  });

  it("reads an ordered list without caring about the numbers", () => {
    // "1." on every line is the common way to write one, and renumbering it
    // in the preview would be a lie about what the text says.
    expect(parseMarkdown("1. First\n1. Second")[0]).toMatchObject({
      kind: "list",
      ordered: true,
    });
  });

  it("ends a list when its markers change kind", () => {
    const blocks = parseMarkdown("- Bullet\n1. Number");

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "list", ordered: false });
    expect(blocks[1]).toMatchObject({ kind: "list", ordered: true });
  });

  it("keeps a fenced block exactly as typed", () => {
    const blocks = parseMarkdown("```\nconst a = 1;\n\n  indented\n```");

    expect(blocks).toEqual([
      { kind: "code", text: "const a = 1;\n\n  indented" },
    ]);
  });

  it("takes the rest of the document for an unterminated fence", () => {
    // What the author sees while still typing the block.
    expect(parseMarkdown("```\nconst a = 1;")).toEqual([
      { kind: "code", text: "const a = 1;" },
    ]);
  });

  it("does not read markdown inside a fenced block", () => {
    expect(parseMarkdown("```\n# not a heading\n- not a list\n```")).toEqual([
      { kind: "code", text: "# not a heading\n- not a list" },
    ]);
  });

  it("accepts CRLF line endings", () => {
    // A paste out of Word arrives with them.
    expect(parseMarkdown("# One\r\n\r\nBody")).toEqual([
      { kind: "heading", level: 1, spans: [{ kind: "text", text: "One" }] },
      { kind: "paragraph", spans: [{ kind: "text", text: "Body" }] },
    ]);
  });

  it("returns nothing for an empty document", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("   \n\n  ")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("reads strong, emphasis, code and links", () => {
    expect(parseInline("a **b** c *d* e `f` g")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " c " },
      { kind: "em", text: "d" },
      { kind: "text", text: " e " },
      { kind: "code", text: "f" },
      { kind: "text", text: " g" },
    ]);
  });

  it("reads underscores as emphasis too", () => {
    expect(parseInline("_soft_")).toEqual([{ kind: "em", text: "soft" }]);
  });

  it("reads a strong span as strong, not as two emphasis spans", () => {
    expect(parseInline("**bold**")).toEqual([{ kind: "strong", text: "bold" }]);
  });

  it("leaves markdown inside code alone", () => {
    expect(parseInline("`**not bold**`")).toEqual([
      { kind: "code", text: "**not bold**" },
    ]);
  });

  it("reads a paired marker even when it looks like arithmetic", () => {
    // No flanking rules in this subset: `* 3 *` is emphasis, and the author
    // who wanted asterisks can escape them into a code span.
    expect(parseInline("2 * 3 * 4")).toEqual([
      { kind: "text", text: "2 " },
      { kind: "em", text: " 3 " },
      { kind: "text", text: " 4" },
    ]);
  });

  it("keeps an unpaired marker as text", () => {
    // The author has to be able to see that it did not take.
    expect(parseInline("2 * 3")).toEqual([{ kind: "text", text: "2 * 3" }]);
    expect(parseInline("50% off")).toEqual([{ kind: "text", text: "50% off" }]);
  });

  it("reads a link", () => {
    expect(parseInline("[Specs](/products/studio)")).toEqual([
      { kind: "link", text: "Specs", href: "/products/studio" },
    ]);
  });

  it("leaves a refused link as the text that was typed", () => {
    const spans = parseInline("[click](javascript:alert(1))");

    expect(spans).toEqual([{ kind: "text", text: "[click](javascript:alert(1))" }]);
    expect(spans.some((span) => span.kind === "link")).toBe(false);
  });

  it("never turns typed HTML into anything but text", () => {
    // The preview renders React elements, so there is no HTML sink at all —
    // this holds that line where it could be lost later.
    const spans = parseInline('<img src=x onerror="alert(1)">');

    expect(spans).toEqual([
      { kind: "text", text: '<img src=x onerror="alert(1)">' },
    ]);
  });
});

describe("safeHref", () => {
  it("allows http, https and mailto", () => {
    for (const url of [
      "https://example.com",
      "http://example.com/a?b=c",
      "mailto:shop@example.com",
      "HTTPS://EXAMPLE.COM",
    ]) {
      expect(safeHref(url)).toBe(url);
    }
  });

  it("allows a path or fragment on this site", () => {
    expect(safeHref("/products/studio")).toBe("/products/studio");
    expect(safeHref("#materials")).toBe("#materials");
  });

  it("refuses schemes that run code or fetch local files", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "//evil.example.com",
    ]) {
      expect(safeHref(url)).toBeNull();
    }
  });

  it("refuses a scheme hidden behind whitespace or control characters", () => {
    // Browsers ignore these inside a scheme, so the check has to see the
    // stripped string or it can be walked straight past.
    for (const url of [
      "ja\tvascript:alert(1)",
      "java\nscript:alert(1)",
      " javascript:alert(1)",
      "\u0000javascript:alert(1)",
      "java script:alert(1)",
    ]) {
      expect(safeHref(url)).toBeNull();
    }
  });

  it("refuses an empty URL", () => {
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });
});
