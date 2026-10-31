import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "./markdown";
import { parseMarkdown } from "@/lib/markdown";

/**
 * The renderer, checked on the things it promises.
 *
 * Plain markup rather than a testing library: there is none in this project,
 * and the assertions here are about which element an author's characters become
 * — which is a string question.
 */
const render = (source: string) =>
  renderToStaticMarkup(<MarkdownBody blocks={parseMarkdown(source)} className="prose" />);

describe("MarkdownBody", () => {
  it("renders a paragraph", () => {
    expect(render("Closed-back with a flat response.")).toContain(
      "<p><span>Closed-back with a flat response.</span></p>",
    );
  });

  it("starts headings at h2, because the page owns the h1", () => {
    // Every level shifts down one: `#` would be a second <h1> on a page whose
    // title is already one, and markdown offers no way to start lower.
    expect(render("# Materials")).toContain("<h2");
    expect(render("## Materials")).toContain("<h3");
    expect(render("### Materials")).toContain("<h4");
  });

  it("renders a list, ordered or not", () => {
    expect(render("- foam\n- leather")).toContain("<ul");
    expect(render("1. foam\n2. leather")).toContain("<ol");
  });

  it("renders strong and emphasis", () => {
    expect(render("**Memory foam**")).toContain("<strong");
    expect(render("*Memory foam*")).toContain("<em");
  });

  it("renders emphasis and strong nested in each other", () => {
    expect(render("***both***")).toContain(
      '<em class="italic"><strong class="font-bold"><span>both</span></strong></em>',
    );
    expect(render("**bold *italic***")).toContain(
      '<strong class="font-bold"><span>bold </span><em class="italic"><span>italic</span></em></strong>',
    );
  });

  it("renders a rule as an hr", () => {
    expect(render("Above\n\n---\n\nBelow")).toMatch(
      /<p><span>Above<\/span><\/p><hr[^>]*\/><p><span>Below<\/span><\/p>/,
    );
  });

  it("renders inline code and a fenced block", () => {
    expect(render("A `tip` that fits")).toContain("<code");
    expect(render("```\nnpm install\n```")).toContain("<pre");
  });

  it("renders a table with column headers and its alignment", () => {
    const html = render("| Size | Weight |\n|:--|--:|\n| S | 210 g |");

    expect(html).toContain("<table");
    expect(html).toContain('<th scope="col"');
    expect(html).toContain("<td");
    expect(html).toContain("text-right");
    expect(html).toMatch(/<td[^>]*><span>210 g<\/span><\/td>/);
  });

  it("escapes markup typed into a table cell", () => {
    const html = render("|a|\n|-|\n|<img src=x onerror=alert(1)>|");

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("renders a link so it leaves the site safely", () => {
    const html = render("[sizes](https://example.com/sizes)");

    expect(html).toContain('href="https://example.com/sizes"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders a script URL as text rather than a link", () => {
    // The parser refuses it and leaves the author's characters visible; the
    // assertion is that no anchor is produced at all.
    const html = render("[click](javascript:alert(1))");

    expect(html).not.toContain("<a ");
    expect(html).toContain("click");
  });

  it("escapes markup an author typed", () => {
    // No `dangerouslySetInnerHTML` anywhere: the characters are text nodes, and
    // React escapes them on the way out.
    const html = render("<script>alert(1)</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("passes the caller's typography through", () => {
    expect(render("hello")).toContain('class="prose"');
  });

  it("renders nothing at all for an empty description", () => {
    // The empty state belongs to the caller — the editor owes an author a
    // sentence, and a product page owes a shopper silence.
    expect(render("")).toBe('<div class="prose"></div>');
  });
});
