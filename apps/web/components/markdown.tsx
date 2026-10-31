import type { InlineSpan, MarkdownBlock, TableAlign } from "@/lib/markdown";

/**
 * Parsed markdown, as React.
 *
 * The renderer half of `lib/markdown.ts`, and the only place either audience
 * turns a description into elements: the admin previews what an author is
 * typing, and the product page shows a shopper the same thing. One renderer
 * means the preview cannot promise something the shop does not deliver.
 *
 * It takes parsed blocks rather than a source string so the caller decides what
 * an *empty* description means — the editor says "nothing to preview yet", and
 * a product page says nothing at all — which is the only thing the two
 * audiences disagree about.
 *
 * Every author's word arrives as a React text node, which React escapes on the
 * way out. There is no `dangerouslySetInnerHTML` here or in the parser behind
 * it, so there is no HTML sink for a description to reach — the reason the
 * parser returns spans instead of a string.
 */
export function MarkdownBody({
  blocks,
  className,
}: {
  blocks: MarkdownBlock[];
  /** Typography for the body copy; the block elements inherit it. */
  className?: string;
}) {
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.kind) {
    case "heading": {
      // The description sits inside a page that already owns the <h1>, so
      // markdown's levels start at h2 and stop at h4.
      const Heading = (["h2", "h3", "h4"] as const)[block.level - 1]!;

      return (
        <Heading
          className={
            block.level === 1
              ? "text-[19px] font-bold leading-[28.5px] tracking-[0.11px]"
              : "text-[16px] font-bold leading-[24px]"
          }
        >
          <Spans spans={block.spans} />
        </Heading>
      );
    }

    case "paragraph":
      return (
        <p>
          <Spans spans={block.spans} />
        </p>
      );

    case "list": {
      const List = block.ordered ? "ol" : "ul";

      return (
        <List
          className={`flex flex-col gap-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Spans spans={item} />
            </li>
          ))}
        </List>
      );
    }

    case "table":
      return (
        // Its own scroller, so a table wider than a phone scrolls inside the
        // column instead of widening the page around it.
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left tabular-nums">
            <thead>
              <tr>
                {block.header.map((cell, column) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-ink/20 pr-6 pb-3 align-bottom text-[11px] leading-4 font-medium tracking-[0.16em] text-ink-55 uppercase last:pr-0 ${ALIGN[block.align[column] ?? "none"]}`}
                  >
                    <Spans spans={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, column) => (
                    <td
                      key={column}
                      className={`border-b border-line py-3 pr-6 align-top last:pr-0 ${ALIGN[block.align[column] ?? "none"]}`}
                    >
                      <Spans spans={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "rule":
      // A hairline in the page's rule colour, with room either side so it
      // reads as a break between sections rather than an underline.
      return <hr className="my-2 border-line" />;

    case "code":
      return (
        <pre className="overflow-x-auto border border-line bg-mist p-3 text-[12px] leading-[19.8px]">
          <code>{block.text}</code>
        </pre>
      );
  }
}

/** A column's alignment as a class; a plain `---` column keeps the table's left. */
const ALIGN: Record<NonNullable<TableAlign> | "none", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  none: "",
};

function Spans({ spans }: { spans: InlineSpan[] }) {
  return spans.map((span, index) => {
    switch (span.kind) {
      case "text":
        return <span key={index}>{span.text}</span>;

      case "strong":
        return (
          <strong key={index} className="font-bold">
            <Spans spans={span.spans} />
          </strong>
        );

      case "em":
        return (
          <em key={index} className="italic">
            <Spans spans={span.spans} />
          </em>
        );

      case "code":
        return (
          <code
            key={index}
            className="border border-line bg-mist px-1 py-0.5 text-[12px]"
          >
            {span.text}
          </code>
        );

      case "link":
        return (
          <a
            key={index}
            href={span.href}
            // A description is written by an administrator and read by anyone,
            // so the link leaves the site; `noopener` keeps the page it lands
            // on from reaching back through `window.opener`.
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gold underline-offset-4 hover:decoration-current"
          >
            {span.text}
          </a>
        );
    }
  });
}
