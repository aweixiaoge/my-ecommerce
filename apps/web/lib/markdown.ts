/**
 * The markdown subset a product or blog description is written in, parsed to
 * data.
 *
 * A parser and not a renderer, and no HTML anywhere: the preview maps these
 * spans onto React elements, so text is escaped by React rather than by a
 * sanitiser that has to be right. Nothing an author types can become markup,
 * which is the whole reason this is hand-rolled instead of `marked` +
 * `DOMPurify` — for a preview inside the admin, the dependency would buy a
 * larger attack surface than it removes.
 *
 * Supported, and deliberately no more: `#`–`###` headings, paragraphs,
 * unordered and ordered lists, fenced code, `---` rules, GitHub-style pipe
 * tables, and
 * inline `code`, **strong**, *emphasis* and [links](https://example.com).
 * Strong and emphasis nest inside each other — `**bold *and italic***`,
 * `***both***` — while code and link text stay literal. Blockquotes, images and HTML are not supported — they pass
 * through as the text that was typed, which is what the author needs to see to
 * know it did not take.
 */

export type InlineSpan =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; spans: InlineSpan[] }
  | { kind: "em"; spans: InlineSpan[] }
  | { kind: "link"; text: string; href: string };

export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { kind: "paragraph"; spans: InlineSpan[] }
  | { kind: "list"; ordered: boolean; items: InlineSpan[][] }
  | { kind: "code"; text: string }
  | { kind: "rule" }
  | {
      kind: "table";
      /** One entry per column, from the delimiter row's colons. */
      align: TableAlign[];
      /** One cell per column. */
      header: InlineSpan[][];
      /** Every row padded or cut to the header's width, as GitHub does. */
      rows: InlineSpan[][][];
    };

/** `:--` left, `--:` right, `:-:` centre; plain `---` leaves it to the page. */
export type TableAlign = "left" | "right" | "center" | null;

const HEADING = /^(#{1,3})\s+(.+?)\s*$/;
const UNORDERED_ITEM = /^[-*]\s+(.+)$/;
const ORDERED_ITEM = /^\d+\.\s+(.+)$/;
const FENCE = /^```/;

/**
 * A horizontal rule: three or more dashes alone on a line, spaces between them
 * allowed (`- - -`), as CommonMark has it. There are no setext headings here,
 * so `---` under a line of text is a rule after a paragraph, not an `<h2>`.
 */
const RULE = /^ {0,3}-(?:[ \t]*-){2,}[ \t]*$/;

/**
 * The line under a table's header: dashes with optional colons, between
 * pipes. At least one pipe is required, so a lone `---` under a line of text
 * stays a paragraph rather than becoming a one-column table.
 */
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  // CRLF arrives from a paste out of Word or a Windows browser; treat it as a
  // line break rather than as part of the line's text.
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (FENCE.test(line.trim())) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i]!.trim())) {
        code.push(lines[i]!);
        i++;
      }
      // Step past the closing fence. An unterminated block takes the rest of
      // the document, which is what the author is watching happen as they type.
      i++;
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }

    // Before lists: `- - -` would otherwise read as an item holding `- -`.
    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        spans: parseInline(heading[2]!),
      });
      i++;
      continue;
    }

    if (UNORDERED_ITEM.test(line) || ORDERED_ITEM.test(line)) {
      const ordered = ORDERED_ITEM.test(line);
      const items: InlineSpan[][] = [];

      while (i < lines.length) {
        // A list ends when its markers change kind, not only at a blank line,
        // so switching from "-" to "1." starts a new block rather than
        // silently renumbering the previous one.
        if (RULE.test(lines[i]!)) break;
        const item = ordered
          ? ORDERED_ITEM.exec(lines[i]!)
          : UNORDERED_ITEM.exec(lines[i]!);
        if (!item) break;

        items.push(parseInline(item[1]!));
        i++;
      }

      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const header = tableHeaderAt(lines, i);
    if (header) {
      const width = header.cells.length;
      const rows: InlineSpan[][][] = [];
      i += 2;

      // A table runs until a blank line or the start of another block — the
      // same things that end a paragraph.
      while (i < lines.length && !endsRun(lines, i)) {
        const cells = splitRow(lines[i]!);
        rows.push(
          Array.from({ length: width }, (_, column) => parseInline(cells[column] ?? "")),
        );
        i++;
      }

      blocks.push({
        kind: "table",
        align: header.align,
        header: header.cells.map((cell) => parseInline(cell)),
        rows,
      });
      continue;
    }

    const paragraph: string[] = [];
    // The first line is taken unconditionally: every block it could have
    // started was tried above, so here it can only be text.
    do {
      // Markdown's own rule: a single newline inside a paragraph is a space,
      // and a blank line is what starts a new one.
      paragraph.push(lines[i]!.trim());
      i++;
    } while (i < lines.length && !endsRun(lines, i));

    blocks.push({ kind: "paragraph", spans: parseInline(paragraph.join(" ")) });
  }

  return blocks;
}

/** Whether line `i` ends a paragraph or a table: blank, or another block. */
function endsRun(lines: string[], i: number): boolean {
  const line = lines[i]!;

  return (
    line.trim() === "" ||
    HEADING.test(line) ||
    FENCE.test(line.trim()) ||
    RULE.test(line) ||
    UNORDERED_ITEM.test(line) ||
    ORDERED_ITEM.test(line) ||
    tableHeaderAt(lines, i) !== null
  );
}

/**
 * The header of a table starting at line `i`, or null when there is none
 * there: a row with a pipe in it, then a delimiter row with exactly as many
 * columns. A mismatched count is not a table — GitHub's rule, and the one
 * that keeps a stray `a | b` above a `---|---|---` from guessing.
 */
function tableHeaderAt(
  lines: string[],
  i: number,
): { cells: string[]; align: TableAlign[] } | null {
  const line = lines[i]!;
  const delimiter = lines[i + 1];
  if (delimiter === undefined || !line.includes("|")) return null;
  if (!delimiter.includes("|") || !TABLE_DELIMITER.test(delimiter)) return null;

  const cells = splitRow(line);
  const align = splitRow(delimiter).map(toAlign);
  if (cells.length !== align.length) return null;

  return { cells, align };
}

/**
 * A row's cells: split on every pipe that is not escaped as `\|`, with the
 * optional pipes at either end dropped, and each cell trimmed. An escaped pipe
 * is the way to put one in a cell, so it comes back as a bare `|`.
 */
function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);

  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function toAlign(cell: string): TableAlign {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");

  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

/** A link, matched where the scanner stands: `[text](url)`, one level of parens. */
const LINK = /\[[^\]\n]*\]\((?:[^()\s]|\([^()\s]*\))*\)/y;

/** A code span, matched where the scanner stands. */
const CODE = /`[^`\n]+`/y;

/**
 * `pattern` matched at `i` and nowhere else — sticky rather than on a slice,
 * so a long description is not copied once per character it is scanned at.
 */
function matchAt(pattern: RegExp, text: string, i: number): string | null {
  pattern.lastIndex = i;
  return pattern.exec(text)?.[0] ?? null;
}

/**
 * Inline markdown, scanned left to right.
 *
 * Code first, then links: a backtick run or a link protects what is inside it,
 * so `**` between backticks is a literal. Then `*` and `_` runs, which may
 * nest — a run of three opens emphasis around strong, and each closer skips
 * the pairs nested inside it, so `*a **b** c*` is emphasis holding strong
 * rather than two emphases either side of a stray pair.
 *
 * No flanking rules for `*`: `2 * 3 * 4` is emphasis, and an author who wanted
 * asterisks can put them in a code span. `_` is the exception, because it
 * turns up inside words: `snake_case_name` stays text, as GitHub keeps it.
 */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const noCloser: NoCloser = new Map();
  let i = 0;

  // Adjacent plain characters are gathered into one text span.
  const pushText = (value: string) => {
    const last = spans[spans.length - 1];
    if (last?.kind === "text") last.text += value;
    else spans.push({ kind: "text", text: value });
  };

  while (i < text.length) {
    const char = text[i]!;

    const code = char === "`" ? matchAt(CODE, text, i) : null;
    if (code) {
      spans.push({ kind: "code", text: code.slice(1, -1) });
      i += code.length;
      continue;
    }

    const link = char === "[" ? matchAt(LINK, text, i) : null;
    if (link) {
      const span = toLink(link);
      if (span.kind === "text") pushText(span.text);
      else spans.push(span);
      i += link.length;
      continue;
    }

    if (char === "*" || char === "_") {
      const run = runLength(text, i);
      const emphasis = readEmphasis(text, i, run, noCloser);
      if (emphasis) {
        spans.push(emphasis.span);
        i = emphasis.end;
        continue;
      }

      // A marker with no partner stays visible exactly as typed, so the author
      // can see it did not take.
      pushText(text.slice(i, i + run));
      i += run;
      continue;
    }

    pushText(char);
    i++;
  }

  return spans;
}

/**
 * For each marker and width, the earliest position a closer search has failed
 * from. A search from any later position covers less of the same text, so it
 * fails too — which keeps a description full of unpaired `_` from being
 * rescanned to its end once per marker, on every keystroke of the preview.
 */
type NoCloser = Map<string, number>;

/** How many of the marker at `i` stand in a row. */
function runLength(text: string, i: number): number {
  let end = i;
  while (text[end] === text[i]) end++;
  return end - i;
}

/**
 * The emphasis a run of `run` markers at `start` opens, if it closes: three as
 * both when three close it, so `***both***` is not emphasis around a stray
 * `**`. Otherwise a run of three is one opener inside another, and the first
 * run after it says which is inside — the one that closes first:
 *
 *   `***Who** is calling?*`  → `**` comes first: strong inside emphasis
 *   `***Who* is calling?**`  → `*` comes first: emphasis inside strong
 */
function readEmphasis(
  text: string,
  start: number,
  run: number,
  noCloser: NoCloser,
): { span: InlineSpan; end: number } | null {
  const marker = text[start]!;
  if (marker === "_" && isWordChar(text[start - 1])) return null;

  // Two before one by default; one before two when a `**` closes first, so
  // the outer reading is the one whose inner pair is already in sight.
  const widths = run >= 3 && nextRun(text, start + run, marker) === 2 ? [3, 1, 2] : [3, 2, 1];

  for (const width of widths.filter((width) => width <= run)) {
    // The opener is the first `width` markers of the run. When it is narrower
    // than the run — the wider readings found no closer — the markers left
    // over open the inner text, and the recursion below reads them there.
    const open = start + width;
    const key = marker + width;
    if (open >= (noCloser.get(key) ?? Infinity)) continue;

    const close = findCloser(text, open, marker, width);
    if (close === null) {
      noCloser.set(key, Math.min(open, noCloser.get(key) ?? Infinity));
      continue;
    }

    const inner = parseInline(text.slice(open, close));
    const end = close + width;

    const span: InlineSpan =
      width === 3
        ? { kind: "em", spans: [{ kind: "strong", spans: inner }] }
        : width === 2
          ? { kind: "strong", spans: inner }
          : { kind: "em", spans: inner };

    return { span, end };
  }

  return null;
}

/**
 * Where the closer for a `width`-wide opener starts, or null. It skips code
 * spans and links, which hide markers, and the pairs nested inside it: a
 * one-marker closer passes over `**` runs, a two-marker closer over single
 * ones. A run of three closes either, from its far end — `**a *b***` ends the
 * emphasis and the strong together.
 */
function findCloser(text: string, from: number, marker: string, width: number): number | null {
  let i = from;

  while (i < text.length) {
    const hidden =
      (text[i] === "`" && matchAt(CODE, text, i)) || (text[i] === "[" && matchAt(LINK, text, i));
    if (hidden) {
      i += hidden.length;
      continue;
    }

    if (text[i] !== marker) {
      i++;
      continue;
    }

    const run = runLength(text, i);
    const closes =
      i > from &&
      (run === width || (run === 3 && width < 3)) &&
      !(marker === "_" && isWordChar(text[i + run]));

    if (closes) return i + run - width;
    i += run;
  }

  return null;
}

/**
 * The length of the first run of `marker` at or after `from`, past code spans
 * and links (which hide theirs), or null when there is none.
 */
function nextRun(text: string, from: number, marker: string): number | null {
  let i = from;

  while (i < text.length) {
    const hidden =
      (text[i] === "`" && matchAt(CODE, text, i)) || (text[i] === "[" && matchAt(LINK, text, i));
    if (hidden) i += hidden.length;
    else if (text[i] === marker) return runLength(text, i);
    else i++;
  }

  return null;
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function toLink(raw: string): InlineSpan {
  // The whole bracketed form has already been matched by LINK, so this is
  // anchored at both ends on purpose: greedy, to take the last `)` and keep
  // a URL that contains parentheses — `javascript:alert(1)` above all —
  // in one piece. Truncating it at the first `)` would leave the tail as
  // loose text next to a link that had been refused.
  const link = /^\[([^\]]*)\]\((.*)\)$/.exec(raw);
  const href = link ? safeHref(link[2]!) : null;

  // A rejected URL leaves the markdown as text rather than dropping it: the
  // author gets to see that their link was refused, and why, instead of
  // watching it vanish into a link that does nothing.
  return link && href
    ? { kind: "link", text: link[1]!, href }
    : { kind: "text", text: raw };
}

/** The schemes a description may link to. Everything else is not a link. */
const ALLOWED_SCHEMES = ["http:", "https:", "mailto:"];

/**
 * A URL safe to put in `href`, or null to refuse it.
 *
 * The check is on the *stripped* string, and stripping is the point: browsers
 * ignore whitespace and control characters inside a scheme, so "java\tscript:"
 * and "javascript:" reach the same place. Anything that is not an http(s) or
 * mailto URL — or a path or fragment relative to this site — is refused, so
 * `data:`, `vbscript:` and `file:` cannot arrive by a route this parser did not
 * think of.
 */
export function safeHref(url: string): string | null {
  const stripped = url.replace(/[\s\u0000-\u001f\u007f]/g, "");
  if (stripped === "") return null;

  // "//evil.example.com" is a URL to another host, not a path on this one, and
  // it reads like a path at a glance. Refused before the path check below.
  if (stripped.startsWith("//")) return null;
  if (stripped.startsWith("/") || stripped.startsWith("#")) return stripped;

  const lower = stripped.toLowerCase();
  return ALLOWED_SCHEMES.some((scheme) => lower.startsWith(scheme))
    ? stripped
    : null;
}
