import { parseMarkdown, type InlineSpan, type MarkdownBlock } from "@/lib/admin/markdown";

/**
 * The description preview.
 *
 * Every author's word below arrives as a React text node, which React escapes
 * on the way out. There is no `dangerouslySetInnerHTML` here or in the parser
 * behind it, so there is no HTML sink for a description to reach — the reason
 * the parser returns spans instead of a string.
 */
export function MarkdownPreview({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  if (blocks.length === 0) {
    return (
      <p className="text-[13px] leading-[21.45px] text-ink-55">
        Nothing to preview yet — what you write on the left appears here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-[14px] leading-[23.1px] text-ink">
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

    case "code":
      return (
        <pre className="overflow-x-auto rounded-control border border-line bg-mist p-3 text-[12px] leading-[19.8px]">
          <code>{block.text}</code>
        </pre>
      );
  }
}

function Spans({ spans }: { spans: InlineSpan[] }) {
  return spans.map((span, index) => {
    switch (span.kind) {
      case "text":
        return <span key={index}>{span.text}</span>;

      case "strong":
        return (
          <strong key={index} className="font-bold">
            {span.text}
          </strong>
        );

      case "em":
        return (
          <em key={index} className="italic">
            {span.text}
          </em>
        );

      case "code":
        return (
          <code
            key={index}
            className="rounded-[3px] border border-line bg-mist px-1 py-0.5 text-[12px]"
          >
            {span.text}
          </code>
        );

      case "link":
        return (
          <a
            key={index}
            href={span.href}
            // An author's link leaves the admin; `noopener` keeps the page it
            // lands on from reaching back through `window.opener`.
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {span.text}
          </a>
        );
    }
  });
}
