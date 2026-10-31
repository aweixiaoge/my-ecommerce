"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Media, Product, Variant } from "@my-ecommerce/shared";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { StarRating } from "@/components/star-rating";
import { defaultVariant } from "@/lib/catalog/pricing";
import { categoryPath } from "@/lib/catalog/product-path";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import { fill, plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * Choosing one, and looking at it.
 *
 * The storefront's first client component that is not about chrome, and the
 * only place on the page that holds state. It wraps both columns because the
 * gallery and the buy box are one decision — pick a colour and the photograph,
 * the price and the SKU all change together — and React state cannot be shared
 * between siblings.
 *
 * `site-header.tsx` is the precedent for how this is written: `"use client"` on
 * the first line, a comment saying why, and accessible controls.
 *
 * The house rule is that *page* state lives in the URL — the shop's `?page=`
 * and `?sort=` are a GET form for exactly that reason, and the price of getting
 * it wrong is a page a crawler cannot see. A variant selection is not page
 * state. It multiplies URLs for a single product, nothing links to it, and its
 * whole value is answering "what would this one cost" instantly, without a
 * round trip. So it stays here.
 */
export function ProductPurchase({
  product,
  imagesByVariant,
  messages,
  ratingMessages,
  cartMessages,
  locale,
  currency,
}: {
  product: Product;
  /** Media by variant id; a variant with none of its own is absent. */
  imagesByVariant: Record<string, Media[]>;
  /** This locale's `product` slice of the catalog. */
  messages: Messages["product"];
  /**
   * …and its `reviews` slice, for the star row's spoken sentence — the same
   * sentence the review rows below state their own figures with.
   */
  ratingMessages: Messages["reviews"];
  /** …and its `cart.add` slice, for what the button says once pressed. */
  cartMessages: Messages["cart"]["add"];
  locale: Locale;
  /**
   * The currency prices are written in.
   *
   * A plain object of codes and rate strings, which is what lets it cross to
   * this side of the boundary: the prices below are converted in the browser
   * from the same table the server used, rather than the server handing over
   * figures this component could not recompute when a variant is chosen.
   */
  currency: DisplayCurrency;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    firstSelection(product),
  );
  const [imageId, setImageId] = useState<string | null>(null);

  const variant = matchVariant(product.variants, selected);

  const free = freeOptions(product);
  // The size goes to the cart beside the variant. One free option at most is
  // what the admin writes; the first is the one the cart records.
  const sizeOption = product.options.find((option) => free.has(option.id));
  const sizeId = sizeOption ? selected[sizeOption.id] : undefined;

  /*
   * The chosen variant's photographs lead, and the product's own follow.
   *
   * Showing *only* the variant's was the first thing written here, and it lost
   * photographs: the admin attaches a colour's images to that colour, so
   * picking one of a two-colour product hid the other colour's pictures
   * entirely — and a variant with a single image left the gallery one
   * thumbnail where the design draws four. Leading with them instead does what
   * the design's selection implies (the main image changes when the colour
   * does) without throwing away the rest of the product.
   */
  const lead = variant ? (imagesByVariant[variant.id] ?? []) : [];
  const leading = new Set(lead.map((image) => image.id));
  const images = [...lead, ...product.images.filter((image) => !leading.has(image.id))];

  // Tracked by id rather than by index, so changing variant does not need the
  // index resetting: an id that is not in the new set simply does not match,
  // and the first of the new set is what shows.
  const mainImage = images.find((image) => image.id === imageId) ?? images.at(0);

  const hasRange = product.priceMax !== null;

  return (
    <div className="grid grid-cols-1 gap-[40px] pt-[30px] bar:grid-cols-[625fr_625fr] bar:gap-[56px]">
      <Figure
        product={product}
        images={images}
        mainImage={mainImage}
        onSelect={setImageId}
        messages={messages}
      />

      <div className="flex min-w-0 flex-col bar:pt-[10px]">
        {/* The category as a gold eyebrow, the shop card's own register. */}
        {product.categories[0] && (
          <Link
            href={categoryPath(product.categories[0], locale)}
            className="self-start text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase"
          >
            {product.categories[0].name}
          </Link>
        )}

        <h1 className="pt-3 font-display text-[34px] leading-[42px] font-normal [overflow-wrap:anywhere] text-ink">
          {product.name}
        </h1>

        <div className="flex items-center gap-3 pt-4">
          <StarRating
            rating={product.rating}
            messages={ratingMessages}
            className="gap-1 [&_img]:size-3.5 [&_img]:opacity-80"
          />
          <Link
            href="?tab=reviews"
            scroll={false}
            className="text-[12px] leading-5 tracking-[0.08em] text-ink-55 underline-offset-4 hover:text-ink hover:underline"
          >
            ({plural(product.rating?.count ?? 0, messages.reviewCount)})
          </Link>
        </div>

        <p className="pt-5 text-[18px] leading-7 tracking-[0.06em] text-ink-60 tabular-nums">
          {hasRange && product.priceMax
            ? `${formatPrice(product.price, currency, locale)}${messages.rangeSeparator}${formatPrice(product.priceMax, currency, locale)}`
            : formatPrice(product.price, currency, locale)}
        </p>

        {product.shortDescription && (
          <p className="pt-7 text-[15px] leading-[26px] text-ink-62">
            {product.shortDescription}
          </p>
        )}

        <hr className="mt-8 border-line" />

        <div className="flex flex-col pt-8">
          {product.options.map((option, index) => (
            <div key={option.id} className={index === 0 ? "" : "pt-7"}>
              <p className="text-[11px] leading-4 font-medium tracking-[0.2em] text-ink-55 uppercase">
                {option.name}
              </p>

              <div className="flex flex-wrap gap-[10px] pt-3">
                {option.values.map((value) => {
                  // Every value of a free option can be chosen — that is what
                  // Size is: a pick the cart records beside the variant (see
                  // `CartItem` in the schema). A value of a variant-selecting
                  // option that no variant carries cannot.
                  const available =
                    free.has(option.id) ||
                    product.variants.some((candidate) =>
                      candidate.optionValues.some((chosen) => chosen.id === value.id),
                    );
                  const isSelected = selected[option.id] === value.id;

                  return (
                    <button
                      key={value.id}
                      type="button"
                      // `aria-pressed` rather than colour alone: the difference
                      // between chosen and merely available has to survive
                      // being read aloud, or by someone who cannot tell the two
                      // greys apart.
                      aria-pressed={isSelected}
                      disabled={!available}
                      onClick={() =>
                        setSelected((current) => ({
                          ...current,
                          [option.id]: value.id,
                        }))
                      }
                      className={`h-10 min-w-12 border px-4 text-[13px] leading-5 tracking-[0.06em] transition-colors duration-300 ${
                        isSelected
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-ink-62 hover:border-ink hover:text-ink"
                      } ${available ? "" : "line-through opacity-60 hover:border-line hover:text-ink-62"}`}
                    >
                      {value.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="pt-10 font-display text-[26px] leading-9 text-ink tabular-nums">
          {variant ? (
            formatPrice(variant.price, currency, locale)
          ) : (
            <span className="font-sans text-[15px] tracking-[0.06em] text-ink-55">{messages.unavailable}</span>
          )}
        </p>

        <div className="pt-4">
          {/*
            Keyed by the variant and the size, so choosing another colour or
            size starts the button and its counter over: "Added to your cart"
            under the sand pair in M is not true of the onyx pair, or of L.
          */}
          <AddToCartButton
            key={`${variant?.id ?? "none"}:${sizeId ?? ""}`}
            target={{ variantId: variant?.id ?? "", optionValueId: sizeId }}
            quantityMax={variant?.stock ?? 1}
            label={
              variant && !variant.inStock ? cartMessages.soldOut : messages.addToCart
            }
            disabled={!variant?.inStock}
            messages={cartMessages}
            cartHref={localePath(locale, "/cart")}
            placement="page"
            className="flex h-[50px] w-full items-center justify-center border border-ink bg-ink text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-paper"
          />
        </div>

        <hr className="mt-8 border-line" />

        <dl className="flex flex-col gap-1.5 pt-6 text-[11px] leading-[18px] tracking-[0.16em] uppercase">
          {variant && (
            <div className="flex gap-2">
              <dt className="text-ink-55">{messages.sku}</dt>
              <dd className="text-ink">{variant.sku}</dd>
            </div>
          )}

          {product.categories[0] && (
            <div className="flex gap-2">
              <dt className="text-ink-55">{messages.category}</dt>
              <dd>
                <Link
                  href={categoryPath(product.categories[0], locale)}
                  className="text-ink underline-offset-4 hover:underline"
                >
                  {product.categories[0].name}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/**
 * The main image and the row of thumbnails under it.
 *
 * The design puts four thumbs on a 16px gap under a main image, both inside the
 * left column — 12px corners on the thumbs, square on the main image.
 *
 * A product video takes either slot as a `<video>` rather than an `<Image>` —
 * the optimizer only reads pictures. In the main frame it plays muted and
 * looping, the way a product clip is shown, with controls to unmute or pause;
 * as a thumbnail it is its first frame with a play mark.
 */
function Figure({
  product,
  images,
  mainImage,
  onSelect,
  messages,
}: {
  product: Product;
  images: Media[];
  mainImage: Media | undefined;
  onSelect: (id: string) => void;
  messages: Messages["product"];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[625/659] w-full overflow-hidden bg-ivory">
        {mainImage?.kind === "video" ? (
          <video
            // Keyed so choosing another video starts it from the top instead
            // of swapping the source under a player mid-play.
            key={mainImage.id}
            src={mainImage.url}
            aria-label={mainImage.alt ?? product.name}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : mainImage ? (
          <Image
            src={mainImage.url}
            // The design's alt text is `media_translations`, which is not
            // built; the product's name is what a shopper would say the
            // photograph is of.
            alt={mainImage.alt ?? product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            // `loading` rather than the `priority` prop: that one is deprecated
            // in Next 16, and this image is the largest thing above the fold.
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center font-display text-lg text-ink-55 italic">
            {product.name}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-4">
          {images.slice(0, 4).map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onSelect(image.id)}
              aria-pressed={image.id === mainImage?.id}
              aria-label={fill(messages.imageAlt, { name: product.name })}
              className={`relative aspect-[144/149] flex-1 overflow-hidden bg-ivory transition-opacity duration-300 ${
                image.id === mainImage?.id
                  ? "opacity-100 ring-1 ring-gold ring-offset-2"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {image.kind === "video" ? (
                <>
                  <video
                    src={`${image.url}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-paper/85 text-[12px] text-ink"
                  >
                    ▶
                  </span>
                </>
              ) : (
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 12vw, 25vw"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * What to have chosen when the page opens.
 *
 * The cheapest variant that can actually be bought. Two things are deliberate
 * in that. Cheapest, because the design's own picture shows the low end of the
 * range selected — "$18.00 – $21.00" above "$18.00" — and because a shopper
 * arriving here has just been told on the card what this product costs *from*;
 * opening on the dearest colour would contradict the page they came from. In
 * stock, because a sold-out colour would open the page with a disabled button
 * and no explanation. When nothing is in stock, the cheapest, so the page shows
 * a price rather than a blank. `defaultVariant` holds that rule.
 *
 * The options are what map a value back to the option that offers it: a
 * `Variant` carries the values that select it and nothing about which option
 * each came from.
 */
function firstSelection(product: Product): Record<string, string> {
  // The rule is `defaultVariant`'s, because a shop card's "Add to cart" adds
  // the same variant this page opens on — see its note.
  const chosen = defaultVariant(product.variants);

  if (!chosen) return {};

  const free = freeOptions(product);
  const selection: Record<string, string> = {};

  for (const option of product.options) {
    // A free option opens on its first value — the size the server falls back
    // to when a card adds the product, so a card and this page agree.
    const value = free.has(option.id)
      ? option.values.at(0)
      : option.values.find((candidate) =>
          chosen.optionValues.some((chosenValue) => chosenValue.id === candidate.id),
        );

    if (value) selection[option.id] = value.id;
  }

  return selection;
}

/**
 * The options no variant stands behind — Size, on the catalogue the admin
 * writes, which is one variant per colour. Their values are choices the cart
 * records beside the variant rather than a way of picking one.
 *
 * An option whose values *some* variant carries is not free, even when one of
 * its values is carried by none: that value is a gap in the matrix, not a
 * choice, and stays disabled.
 */
function freeOptions(product: Product): Set<string> {
  const used = new Set(
    product.variants.flatMap((variant) => variant.optionValues.map((value) => value.id)),
  );

  return new Set(
    product.options
      .filter((option) => option.values.every((value) => !used.has(value.id)))
      .map((option) => option.id),
  );
}

/**
 * Which variant the current selection names.
 *
 * A variant matches when it carries every value chosen for an option that
 * *selects* a variant at all. That qualifier is not decoration: the admin's form
 * writes one variant per colour, so a product can offer a Size that no variant
 * stands behind, and a rule that demanded every chosen value would make such a
 * page unable to show anything. Values no variant uses are shown, disabled,
 * rather than treated as filters.
 */
function matchVariant(
  variants: Variant[],
  selected: Record<string, string>,
): Variant | undefined {
  const used = new Set(
    variants.flatMap((variant) => variant.optionValues.map((value) => value.id)),
  );
  const wanted = Object.values(selected).filter((value) => used.has(value));

  return variants.find((variant) =>
    wanted.every((value) =>
      variant.optionValues.some((chosen) => chosen.id === value),
    ),
  );
}

