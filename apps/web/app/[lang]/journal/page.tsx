import { Suspense } from "react";
import type { Metadata } from "next";
import { JournalCard } from "@/components/journal-card";
import { ShopPagination } from "@/components/shop-pagination";
import { JOURNAL_PAGE_SIZE, listJournalPage } from "@/lib/blog/blog-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";
import { parseShopQuery } from "@/lib/shop";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return { title: messages.journalPage.title, description: messages.journalPage.description };
}

type JournalSearchParams = Awaited<PageProps<"/[lang]/journal">["searchParams"]>;

/**
 * The Journal (Figma 178:2586): every post written under Blogs in the admin,
 * newest first, as a grid of cards — three across from `bar`, two from `sm`,
 * one below that, 30px apart.
 *
 * The design has no visible title, so the page's `<h1>` is for screen readers
 * and the document outline only; the cards start 60px under the header, as
 * drawn.
 *
 * `?page=` is read on the server, as on the Shop page, so every page of the
 * journal is a real, linkable address. Reading it is request-time data, so the
 * grid streams inside `<Suspense>` while the shell around it prerenders.
 */
export default async function JournalPage(props: PageProps<"/[lang]/journal">) {
  const locale = await requestLocale();
  const messages = getMessages(locale);

  return (
    <section className="py-[60px]">
      <div className="container-content">
        <h1 className="sr-only">{messages.journalPage.title}</h1>

        <Suspense fallback={<JournalGridFallback />}>
          {props.searchParams.then((searchParams) => (
            <JournalResults searchParams={searchParams} locale={locale} messages={messages} />
          ))}
        </Suspense>
      </div>
    </section>
  );
}

async function JournalResults({
  searchParams,
  locale,
  messages,
}: {
  searchParams: JournalSearchParams;
  locale: Locale;
  messages: Messages;
}) {
  // The shop's parser, for its page rule alone: an unparseable page is page 1.
  const { page } = parseShopQuery(searchParams);
  const { items, pagination } = await listJournalPage(page, locale);

  if (items.length === 0) {
    return (
      <p className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">{messages.journalPage.empty}</p>
    );
  }

  return (
    <>
      <div className={GRID}>
        {items.map((post) => (
          <JournalCard key={post.id} post={post} locale={locale} />
        ))}
      </div>

      <ShopPagination pagination={pagination} path={localePath(locale, "/journal")} messages={messages.listing} />
    </>
  );
}

/**
 * `sm`, not `md`, for the step to two columns — the home page's journal gives
 * the reason: `bar` is 768, and a `md:` step would land on the same query.
 */
const GRID = "grid grid-cols-1 gap-[30px] sm:grid-cols-2 bar:grid-cols-3";

function JournalGridFallback() {
  return (
    <div aria-hidden className={`${GRID} animate-pulse`}>
      {Array.from({ length: Math.min(JOURNAL_PAGE_SIZE, 3) }, (_, index) => (
        <div key={index} className="h-[373px] bg-mist" />
      ))}
    </div>
  );
}
