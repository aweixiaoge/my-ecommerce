import { FREE_SHIPPING_THRESHOLD } from "@/lib/cart/shipping";
import { formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

export function TrustBar({
  messages,
  locale,
}: {
  /** This locale's four promises, in order. */
  messages: Messages["trustBar"];
  locale: Locale;
}) {
  return (
    <section className="border-b border-line">
      {/* Four equal columns on the design's 1290 column with a 40px gap. */}
      <div className="container-content grid grid-cols-1 gap-8 py-12 text-center sm:grid-cols-2 bar:grid-cols-4 bar:gap-0 bar:divide-x bar:divide-line">
        {messages.map((item) => (
          <div key={item.title} className="bar:px-6">
            <p className="font-display text-[18px] leading-[26px] text-ink">
              {/*
                The free-shipping threshold is money, so it is formatted for the
                language rather than written into the sentence: `50,00 $` under
                `/de`, `$50.00` under `/en`. A title with no `{amount}` in it
                comes back from `fill` unchanged, which is why the same call
                covers all four.
              */}
              {fill(item.title, {
                amount: formatMoney(FREE_SHIPPING_THRESHOLD, locale),
              })}
            </p>
            <p className="mt-2 text-[13px] leading-[22px] text-ink-60">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
