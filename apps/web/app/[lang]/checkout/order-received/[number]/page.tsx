import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderReceived } from "@/components/checkout/order-received";
import { getOrder } from "@/lib/checkout/order-repo";
import { getMessages } from "@/lib/i18n/messages";
import { requestLocale } from "@/lib/i18n/request";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getMessages(await requestLocale()).checkout.received.title,
    // A capability URL: it must never be indexed, and crawlers never have the key.
    robots: { index: false, follow: false },
  };
}

/**
 * An order's confirmation: `/<lang>/checkout/order-received/<number>?key=…`.
 *
 * The number alone opens nothing. Order numbers count up from 1001 and are
 * printed on the page, so they are guessable by design; the `key` is the
 * order's own random access key, and a number with any other key — or none —
 * is the same 404 as a number that does not exist, so the page does not even
 * confirm that an order was placed.
 *
 * The params and the search params are runtime data, read inside the
 * `<Suspense>` boundary for the reason the product route gives.
 */
export default async function OrderReceivedRoute(
  props: PageProps<"/[lang]/checkout/order-received/[number]">,
) {
  const locale = await requestLocale();
  const messages = getMessages(locale).checkout;

  return (
    <div className="bg-wash">
      <div className="container-content pt-[60px] pb-[100px]">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.396px] text-ink">
          {messages.received.title}
        </h1>

        <div className="pt-[24px]">
          <Suspense fallback={<div aria-hidden className="h-[480px] animate-pulse bg-mist" />}>
            {Promise.all([props.params, props.searchParams]).then(async ([params, searchParams]) => {
              const key = Array.isArray(searchParams.key) ? searchParams.key[0] : searchParams.key;
              const order = /^\d+$/.test(params.number)
                ? await getOrder(Number(params.number), key ?? "")
                : null;
              if (!order) notFound();

              return <OrderReceived order={order} messages={messages} locale={locale} />;
            })}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
