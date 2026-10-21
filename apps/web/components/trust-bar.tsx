import type { Money } from "@my-ecommerce/shared";
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
    <section className="border-y-[0.909px] border-line">
      {/* Four equal columns on the design's 1290 column with a 40px gap. */}
      <div className="container-content grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 bar:grid-cols-4 bar:gap-10">
        {messages.map((item) => (
          <div key={item.title}>
            <p className="text-[15px] font-semibold leading-[24.75px] tracking-[-0.234px] text-ink">
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
            <p className="mt-1.5 text-[14px] leading-[23.1px] tracking-[-0.150px] text-ink-60">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The threshold the first promise names.
 *
 * A value rather than the "$50" the copy used to carry: the currency is the
 * shop's, and what changes per language is how it is written. It belongs to
 * the shop rather than to a catalog — moving the number between languages
 * would be moving a price.
 */
const FREE_SHIPPING_THRESHOLD: Money = { amount: "50", currency: "USD" };
