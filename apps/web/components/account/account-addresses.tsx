import Link from "next/link";
import type { Address } from "@my-ecommerce/shared";
import type { AddressBook, AddressKind } from "@/lib/account/addresses-repo";
import { countryName, DEFAULT_COUNTRY } from "@/lib/checkout/countries";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The Addresses tab (Figma 178:6843): a sentence, then the billing and the
 * shipping address side by side, each in a hairline card with its edit link.
 *
 * Two cards from `lg`; below it the content column is too narrow for two
 * address blocks to sit side by side without breaking every line, so they
 * stack.
 */
export function AccountAddresses({
  book,
  locale,
  messages,
}: {
  book: AddressBook;
  locale: Locale;
  messages: Messages["account"];
}) {
  const copy = messages.addressBook;
  const cards: { kind: AddressKind; title: string; edit: string; add: string }[] = [
    { kind: "billing", title: copy.billing, edit: copy.editBilling, add: copy.addBilling },
    { kind: "shipping", title: copy.shipping, edit: copy.editShipping, add: copy.addShipping },
  ];

  return (
    <div className="text-ink">
      <p className="text-[16px] leading-[26.4px] tracking-[-0.3125px]">{copy.intro}</p>

      <div className="grid grid-cols-1 gap-[30px] pt-[24px] lg:grid-cols-2">
        {cards.map((card) => {
          const address = book[card.kind];

          return (
            <section key={card.kind} className="rounded-[5px] border-[0.91px] border-line p-[24px]">
              <header className="flex flex-wrap items-center justify-between gap-x-[16px]">
                <h2 className="pb-[15.4px] text-[18px] leading-[27px] font-bold tracking-[-0.44px]">
                  {card.title}
                </h2>
                <Link
                  href={localePath(locale, `/account/addresses/${card.kind}`)}
                  className="text-[16px] leading-[26.4px] tracking-[-0.3125px] hover:underline"
                >
                  {address ? card.edit : card.add}
                </Link>
              </header>

              <div className="pt-[20px] text-[15px] leading-[24.75px] tracking-[-0.234px]">
                {address ? <AddressLines address={address} locale={locale} /> : <p>{copy.empty}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The design's three lines — name, street, "City, REGION POSTCODE" — with the
 * apartment line after the street when there is one.
 *
 * The country is written only when it is not the shop's own, as WooCommerce
 * does and as the design's sample (a Shenzhen address, no country) shows. The
 * phone is not shown: the card is an address, and the edit form holds it.
 */
function AddressLines({ address, locale }: { address: Address; locale: Locale }) {
  const place = [address.region, address.postalCode].filter(Boolean).join(" ");

  return (
    <address className="flex flex-col not-italic">
      <span>
        {address.firstName} {address.lastName}
      </span>
      <span>{address.line1}</span>
      {address.line2 && <span>{address.line2}</span>}
      <span>{[address.city, place].filter(Boolean).join(", ")}</span>
      {address.countryCode !== DEFAULT_COUNTRY && <span>{countryName(address.countryCode, locale)}</span>}
    </address>
  );
}
