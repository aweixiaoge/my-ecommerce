"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { compareMoney, type Media, type Product, type Variant } from "@my-ecommerce/shared";
import { StarRating } from "@/components/star-rating";
import { categoryPath } from "@/lib/catalog/product-path";
import { formatMoney } from "@/lib/format";

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
}: {
  product: Product;
  /** Media by variant id; a variant with none of its own is absent. */
  imagesByVariant: Record<string, Media[]>;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    firstSelection(product),
  );
  const [imageId, setImageId] = useState<string | null>(null);

  const variant = matchVariant(product.variants, selected);

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
    <div className="grid grid-cols-1 gap-[40px] pt-[30px] bar:grid-cols-[625fr_625fr]">
      <Figure
        product={product}
        images={images}
        mainImage={mainImage}
        onSelect={setImageId}
      />

      <div className="flex flex-col">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.396px] text-ink">
          {product.name}
        </h1>

        <div className="flex items-center gap-3 pt-[10px]">
          <StarRating rating={product.rating} />
          <Link
            href="?tab=reviews"
            scroll={false}
            className="text-[20px] leading-[21.45px] tracking-[-0.076px] text-ink"
          >
            ({product.rating?.count ?? 0} customer
            {product.rating?.count === 1 ? " review" : " reviews"})
          </Link>
        </div>

        <p className="pt-[10px] text-[20px] leading-[33px] font-bold tracking-[-0.449px] text-ink">
          {hasRange && product.priceMax
            ? `${formatMoney(product.price)} – ${formatMoney(product.priceMax)}`
            : formatMoney(product.price)}
        </p>

        {product.shortDescription && (
          <p className="pt-[35px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">
            {product.shortDescription}
          </p>
        )}

        <hr className="mt-[35px] border-line" />

        <div className="flex flex-col pt-[35px]">
          {product.options.map((option, index) => (
            <div key={option.id} className={index === 0 ? "" : "pt-[33px]"}>
              <p className="text-[16px] leading-[25px] tracking-[-0.076px] text-ink">
                {option.name}
              </p>

              <div className="flex flex-wrap gap-[20px] pt-[10px]">
                {option.values.map((value) => {
                  // A value no variant is selected by cannot be chosen — the
                  // Size on a product sold only in colours, say.
                  const available = product.variants.some((candidate) =>
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
                      className={`h-10 rounded-[8px] border px-[10px] text-[15px] leading-[24.75px] tracking-[-0.234px] ${
                        isSelected
                          ? "border-ink text-ink"
                          : "border-line text-ink-62"
                      } ${available ? "" : "line-through opacity-60"}`}
                    >
                      {value.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="pt-[50px] text-[20px] leading-[33px] font-bold tracking-[-0.449px] text-ink">
          {variant ? (
            formatMoney(variant.price)
          ) : (
            <span className="text-ink-55">Unavailable in this combination</span>
          )}
        </p>

        <div className="pt-[20px]">
          <button
            type="button"
            disabled
            className="flex h-[50px] w-full items-center justify-center rounded-control bg-ink text-[15px] leading-[24.75px] font-medium tracking-[-0.234px] text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to cart
          </button>
          <p className="pt-2 text-center text-[13px] leading-[21.45px] text-ink-55">
            Cart is wired up in Phase 2.
          </p>
        </div>

        <hr className="mt-[35px] border-line" />

        <dl className="flex flex-col pt-[35px] text-[13px] leading-[21.45px] tracking-[0.574px] uppercase">
          {variant && (
            <div className="flex gap-1">
              <dt className="font-bold text-ink">SKU:</dt>
              <dd className="text-ink">{variant.sku}</dd>
            </div>
          )}

          {product.categories[0] && (
            <div className="flex gap-1 pt-[5px]">
              <dt className="font-bold text-ink">Category:</dt>
              <dd>
                <Link
                  href={categoryPath(product.categories[0])}
                  className="text-ink"
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
 */
function Figure({
  product,
  images,
  mainImage,
  onSelect,
}: {
  product: Product;
  images: Media[];
  mainImage: Media | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[25px]">
      <div className="relative aspect-[625/659] w-full overflow-hidden bg-mist">
        {mainImage ? (
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
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-[13px] font-medium tracking-wide text-ink-55 uppercase">
            {product.name}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-[16px]">
          {images.slice(0, 4).map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onSelect(image.id)}
              aria-pressed={image.id === mainImage?.id}
              aria-label={`Show image of ${product.name}`}
              className={`relative aspect-[144/149] flex-1 overflow-hidden rounded-card border ${
                image.id === mainImage?.id ? "border-ink" : "border-transparent"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="(min-width: 768px) 12vw, 25vw"
                className="object-cover"
              />
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
 * a price rather than a blank.
 *
 * The options are what map a value back to the option that offers it: a
 * `Variant` carries the values that select it and nothing about which option
 * each came from.
 */
function firstSelection(product: Product): Record<string, string> {
  const inStock = product.variants.filter((variant) => variant.inStock);
  const pool = inStock.length > 0 ? inStock : product.variants;

  const chosen = pool.reduce<Variant | undefined>(
    (cheapest, variant) =>
      !cheapest || compareMoney(variant.price, cheapest.price) < 0 ? variant : cheapest,
    undefined,
  );

  if (!chosen) return {};

  const selection: Record<string, string> = {};

  for (const option of product.options) {
    const value = option.values.find((candidate) =>
      chosen.optionValues.some((chosenValue) => chosenValue.id === candidate.id),
    );

    if (value) selection[option.id] = value.id;
  }

  return selection;
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

