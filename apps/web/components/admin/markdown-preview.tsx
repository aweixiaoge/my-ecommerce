import { MarkdownBody } from "@/components/markdown";
import { parseMarkdown } from "@/lib/markdown";

/**
 * The description preview.
 *
 * The rendering is `MarkdownBody`, which the storefront product page uses too —
 * so what an author sees here is what a shopper gets, rather than two renderers
 * that agree until one of them is changed.
 *
 * What is left, and the reason this wrapper exists at all, is the empty state:
 * an editor pane with nothing in it owes the author a sentence, and a product
 * page with no description owes the shopper silence. That is the only thing the
 * two audiences disagree about.
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
    <MarkdownBody
      blocks={blocks}
      className="flex flex-col gap-4 text-[14px] leading-[23.1px] text-ink"
    />
  );
}
