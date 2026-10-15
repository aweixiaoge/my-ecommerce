/**
 * The markdown subset a product description is written in, parsed to data.
 *
 * A parser and not a renderer, and no HTML anywhere: the preview maps these
 * spans onto React elements, so text is escaped by React rather than by a
 * sanitiser that has to be right. Nothing an author types can become markup,
 * which is the whole reason this is hand-rolled instead of `marked` +
 * `DOMPurify` — for a preview inside the admin, the dependency would buy a
 * larger attack surface than it removes.
 *
 * Supported, and deliberately no more: `#`–`###` headings, paragraphs,
 * unordered and ordered lists, fenced code, and inline `code`, **strong**,
 * *emphasis* and [links](https://example.com). Emphasis inside strong (and the
 * like) does not nest: spans hold text, not more spans. Tables, blockquotes,
 * images and HTML are not supported — they pass through as the text that was
 * typed, which is what the author needs to see to know it did not take.
 */

export type InlineSpan =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { kind: "paragraph"; spans: InlineSpan[] }
  | { kind: "list"; ordered: boolean; items: InlineSpan[][] }
  | { kind: "code"; text: string };

const HEADING = /^(#{1,3})\s+(.+?)\s*$/;
const UNORDERED_ITEM = /^[-*]\s+(.+)$/;
const ORDERED_ITEM = /^\d+\.\s+(.+)$/;
const FENCE = /^```/;

/**
 * Code first: a backtick run protects what is inside it, so `**` between
 * backticks is a literal and not a strong span. Strong before emphasis for the
 * same reason in miniature — `**bold**` must not be read as an empty emphasis
 * followed by another.
 */
const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]*\]\((?:[^()\s]|\([^()\s]*\))*\))|(\*[^*\n]+\*)|(_[^_\n]+_)/;

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

    const paragraph: string[] = [];
    while (i < lines.length) {
      const next = lines[i]!;
      if (
        next.trim() === "" ||
        HEADING.test(next) ||
        FENCE.test(next.trim()) ||
        UNORDERED_ITEM.test(next) ||
        ORDERED_ITEM.test(next)
      ) {
        break;
      }
      // Markdown's own rule: a single newline inside a paragraph is a space,
      // and a blank line is what starts a new one.
      paragraph.push(next.trim());
      i++;
    }

    blocks.push({ kind: "paragraph", spans: parseInline(paragraph.join(" ")) });
  }

  return blocks;
}

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let rest = text;

  while (rest !== "") {
    const match = INLINE.exec(rest);
    if (!match) break;

    if (match.index > 0) {
      spans.push({ kind: "text", text: rest.slice(0, match.index) });
    }

    spans.push(toSpan(match[0]!));
    rest = rest.slice(match.index + match[0]!.length);
  }

  // Whatever is left over — including a marker with no partner, which stays
  // visible exactly as typed so the author can see it did not take.
  if (rest !== "") spans.push({ kind: "text", text: rest });

  return spans;
}

function toSpan(raw: string): InlineSpan {
  if (raw.startsWith("`")) return { kind: "code", text: raw.slice(1, -1) };
  if (raw.startsWith("**")) return { kind: "strong", text: raw.slice(2, -2) };

  if (raw.startsWith("[")) {
    // The whole bracketed form has already been matched by INLINE, so this is
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

  return { kind: "em", text: raw.slice(1, -1) };
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
