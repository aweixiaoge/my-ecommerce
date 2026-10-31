import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref, type InlineSpan } from "./markdown";

describe("parseInline link syntax", () => {
  it("leaves brackets that are not a link as text", () => {
    // `[note]` with no target is a common way to write a bracket in prose, and
    // it must survive as the author's characters rather than becoming an
    // anchor with nowhere to go.
    expect(parseInline("[note]")).toEqual([{ kind: "text", text: "[note]" }]);
  });
});

/** Every character of the source, whatever spans it landed in. */
function flatten(spans: InlineSpan[]): string {
  return spans
    .map((span) => (span.kind === "strong" || span.kind === "em" ? flatten(span.spans) : span.text))
    .join("");
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

  it("reads three or more dashes as a rule", () => {
    for (const source of ["---", "-----", "- - -", " --- ", "---\t"]) {
      expect(parseMarkdown(source)).toEqual([{ kind: "rule" }]);
    }
  });

  it("does not read fewer than three dashes, or dashes with text, as a rule", () => {
    expect(parseMarkdown("--")[0]).toMatchObject({ kind: "paragraph" });
    expect(parseMarkdown("--- a")[0]).toMatchObject({ kind: "paragraph" });
    expect(parseMarkdown("-- -x")[0]).toMatchObject({ kind: "paragraph" });
  });

  it("ends a paragraph at a rule rather than making it a heading", () => {
    // No setext headings in this subset: `---` under text is a break after it.
    expect(parseMarkdown("Who we are\n---\nSince 2019.")).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "Who we are" }] },
      { kind: "rule" },
      { kind: "paragraph", spans: [{ kind: "text", text: "Since 2019." }] },
    ]);
  });

  it("ends a list and a table at a rule", () => {
    expect(parseMarkdown("- a\n- - -\n- b").map((block) => block.kind)).toEqual([
      "list",
      "rule",
      "list",
    ]);
    expect(parseMarkdown("|a|\n|-|\n|1|\n---").map((block) => block.kind)).toEqual([
      "table",
      "rule",
    ]);
  });

  it("keeps a rule inside a fenced block as code", () => {
    expect(parseMarkdown("```\n---\n```")).toEqual([{ kind: "code", text: "---" }]);
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

/** A table's cells as plain strings, so a test can read like the table. */
function cellText(block: ReturnType<typeof parseMarkdown>[number] | undefined) {
  if (block?.kind !== "table") throw new Error(`expected a table, got ${block?.kind}`);

  return {
    align: block.align,
    header: block.header.map(flatten),
    rows: block.rows.map((row) => row.map(flatten)),
  };
}

describe("parseMarkdown — tables", () => {
  it("reads a header, a delimiter row and body rows", () => {
    const blocks = parseMarkdown(
      "| Size | Weight |\n| --- | --- |\n| S | 210 g |\n| L | 240 g |",
    );

    expect(blocks).toHaveLength(1);
    expect(cellText(blocks[0])).toEqual({
      align: [null, null],
      header: ["Size", "Weight"],
      rows: [
        ["S", "210 g"],
        ["L", "240 g"],
      ],
    });
  });

  it("does not need the pipes at either end", () => {
    expect(cellText(parseMarkdown("a | b\n--|--\n1 | 2")[0])).toEqual({
      align: [null, null],
      header: ["a", "b"],
      rows: [["1", "2"]],
    });
  });

  it("reads each column's alignment from the delimiter's colons", () => {
    const table = cellText(parseMarkdown("|a|b|c|d|\n|:--|:-:|--:|---|")[0]);

    expect(table.align).toEqual(["left", "center", "right", null]);
    expect(table.rows).toEqual([]);
  });

  it("pads a short row and cuts a long one to the header's width", () => {
    expect(cellText(parseMarkdown("|a|b|\n|-|-|\n|1|\n|1|2|3|")[0]).rows).toEqual([
      ["1", ""],
      ["1", "2"],
    ]);
  });

  it("reads inline markdown inside a cell", () => {
    const [block] = parseMarkdown("|Spec|\n|-|\n|**40 h** battery|");

    expect(block?.kind === "table" && block.rows[0]![0]).toEqual([
      { kind: "strong", spans: [{ kind: "text", text: "40 h" }] },
      { kind: "text", text: " battery" },
    ]);
  });

  it("keeps an escaped pipe inside its cell", () => {
    expect(cellText(parseMarkdown("|a|b|\n|-|-|\n|x \\| y|z|")[0]).rows).toEqual([
      ["x | y", "z"],
    ]);
  });

  it("ends at a blank line or the next block", () => {
    const blocks = parseMarkdown("|a|\n|-|\n|1|\n\nAfter.\n\n|b|\n|-|\n|2|\n## Next");

    expect(blocks.map((block) => block.kind)).toEqual([
      "table",
      "paragraph",
      "table",
      "heading",
    ]);
  });

  it("starts a table straight after a paragraph", () => {
    const blocks = parseMarkdown("Sizes below.\n|a|b|\n|-|-|\n|1|2|");

    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "table"]);
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      spans: [{ kind: "text", text: "Sizes below." }],
    });
  });

  it("is not a table when the column counts disagree", () => {
    // GitHub's rule: a header of two over a delimiter of three is text.
    expect(parseMarkdown("a | b\n--|--|--")).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "a | b --|--|--" }] },
    ]);
  });

  it("is not a table without a pipe in the delimiter row", () => {
    // `---` alone under a line is a rule, not a one-column table nobody meant.
    expect(parseMarkdown("a | b\n---")).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "a | b" }] },
      { kind: "rule" },
    ]);
  });

  it("leaves a lone row of pipes as the text that was typed", () => {
    expect(parseMarkdown("| a | b |")).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "| a | b |" }] },
    ]);
  });
});

describe("parseInline", () => {
  it("reads strong, emphasis, code and links", () => {
    expect(parseInline("a **b** c *d* e `f` g")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", spans: [{ kind: "text", text: "b" }] },
      { kind: "text", text: " c " },
      { kind: "em", spans: [{ kind: "text", text: "d" }] },
      { kind: "text", text: " e " },
      { kind: "code", text: "f" },
      { kind: "text", text: " g" },
    ]);
  });

  it("reads underscores as emphasis too", () => {
    expect(parseInline("_soft_")).toEqual([
      { kind: "em", spans: [{ kind: "text", text: "soft" }] },
    ]);
  });

  it("reads a strong span as strong, not as two emphasis spans", () => {
    expect(parseInline("**bold**")).toEqual([
      { kind: "strong", spans: [{ kind: "text", text: "bold" }] },
    ]);
  });

  it("reads three markers as strong inside emphasis", () => {
    expect(parseInline("***both***")).toEqual([
      {
        kind: "em",
        spans: [{ kind: "strong", spans: [{ kind: "text", text: "both" }] }],
      },
    ]);
  });

  it("nests emphasis inside strong", () => {
    expect(parseInline("**bold *italic* bold**")).toEqual([
      {
        kind: "strong",
        spans: [
          { kind: "text", text: "bold " },
          { kind: "em", spans: [{ kind: "text", text: "italic" }] },
          { kind: "text", text: " bold" },
        ],
      },
    ]);
  });

  it("nests strong inside emphasis", () => {
    expect(parseInline("*italic **bold** italic*")).toEqual([
      {
        kind: "em",
        spans: [
          { kind: "text", text: "italic " },
          { kind: "strong", spans: [{ kind: "text", text: "bold" }] },
          { kind: "text", text: " italic" },
        ],
      },
    ]);
  });

  it("closes both at once when a run of three ends them", () => {
    expect(parseInline("**bold *italic***")).toEqual([
      {
        kind: "strong",
        spans: [
          { kind: "text", text: "bold " },
          { kind: "em", spans: [{ kind: "text", text: "italic" }] },
        ],
      },
    ]);
    expect(parseInline("*italic **bold***")).toEqual([
      {
        kind: "em",
        spans: [
          { kind: "text", text: "italic " },
          { kind: "strong", spans: [{ kind: "text", text: "bold" }] },
        ],
      },
    ]);
  });

  it("opens strong inside emphasis when the strong closes first", () => {
    expect(parseInline("***Who** is calling?*")).toEqual([
      {
        kind: "em",
        spans: [
          { kind: "strong", spans: [{ kind: "text", text: "Who" }] },
          { kind: "text", text: " is calling?" },
        ],
      },
    ]);
  });

  it("opens emphasis inside strong when the emphasis closes first", () => {
    expect(parseInline("***Who* is calling?**")).toEqual([
      {
        kind: "strong",
        spans: [
          { kind: "em", spans: [{ kind: "text", text: "Who" }] },
          { kind: "text", text: " is calling?" },
        ],
      },
    ]);
  });

  it("reads emphasis inside a link's sentence but not inside its text", () => {
    expect(parseInline("*see [a *b*](/c)*")).toEqual([
      {
        kind: "em",
        spans: [
          { kind: "text", text: "see " },
          { kind: "link", text: "a *b*", href: "/c" },
        ],
      },
    ]);
  });

  it("leaves underscores inside a word alone", () => {
    // GitHub's rule, and the one that keeps an identifier or a file name
    // readable: only an underscore at a word's edge is a marker.
    expect(parseInline("snake_case_name")).toEqual([
      { kind: "text", text: "snake_case_name" },
    ]);
    expect(parseInline("a _soft_ b")).toEqual([
      { kind: "text", text: "a " },
      { kind: "em", spans: [{ kind: "text", text: "soft" }] },
      { kind: "text", text: " b" },
    ]);
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
      { kind: "em", spans: [{ kind: "text", text: " 3 " }] },
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
