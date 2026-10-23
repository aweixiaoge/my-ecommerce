"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CART_LINE_QUANTITY_MAX } from "@my-ecommerce/shared";
import { addToCartAction, type AddToCartState } from "@/app/[lang]/cart/actions";
import { plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";

/**
 * "Add to cart", and what happened when it was pressed.
 *
 * One component for the two places the design draws the button — the shop
 * card and the product page's buy box — because both send the same thing to
 * the same action and must say the same things back. What differs is the
 * button's own box, which each caller passes, and where the answer goes:
 *
 * - `card`: under the button but out of the flow. A card's height is the
 *   design's 425.186px and the grid's rows are drawn to it; a sentence that
 *   pushed one card taller would step the whole row. The grid's 30px gap is
 *   where it sits.
 * - `page`: in the flow, in a line reserved for it whether or not there is
 *   anything to say, so the SKU and category rows below do not move when it
 *   appears. The page also draws the quantity counter beside the button
 *   (Figma 178:3045) — a card has no room for one, and adds one.
 *
 * It is a form, not an `onClick`, so the button works before the page's
 * JavaScript has loaded: the action is a POST either way, and the counter is a
 * real `<input name="quantity">`. The answer is announced through
 * `role="status"`, which is polite — a shopper who pressed the button is told
 * it worked without having their place in the page taken.
 */
export function AddToCartButton({
  target,
  label,
  disabled = false,
  messages,
  cartHref,
  placement,
  quantityMax,
  className,
}: {
  /**
   * What to add. A variant from the product page, where one is chosen, with
   * the size when the product offers one; the product from a card, where the
   * server picks the variant the card's price is for (`CartAddSchema`).
   */
  target: { variantId: string; optionValueId?: string } | { productId: string };
  /** The button's label at rest — the design's two spellings differ. */
  label: string;
  /** Nothing to add: sold out, or a combination no variant stands behind. */
  disabled?: boolean;
  /** This locale's `cart.add` slice of the catalog. */
  messages: Messages["cart"]["add"];
  /** The cart page, in this locale — where "View cart" goes. */
  cartHref: string;
  placement: "card" | "page";
  /**
   * The most the counter offers — the variant's stock. Given on the product
   * page only; without it there is no counter, and the add is one.
   */
  quantityMax?: number;
  /** The button's own box, which is each caller's design. */
  className: string;
}) {
  const [state, formAction, pending] = useActionState<
    AddToCartState | undefined,
    FormData
  >(addToCartAction, undefined);

  const button = (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? messages.adding : label}
    </button>
  );

  return (
    <form
      action={formAction}
      className={placement === "card" ? "relative" : "flex flex-col"}
    >
      {"variantId" in target ? (
        <>
          <input type="hidden" name="variantId" value={target.variantId} />
          {target.optionValueId && (
            <input type="hidden" name="optionValueId" value={target.optionValueId} />
          )}
        </>
      ) : (
        <input type="hidden" name="productId" value={target.productId} />
      )}

      {quantityMax === undefined ? (
        button
      ) : (
        // The design's row: a 120px counter, 10px, and the button taking
        // the rest of the column.
        <div className="flex gap-[10px]">
          <QuantityCounter
            max={Math.min(Math.max(quantityMax, 1), CART_LINE_QUANTITY_MAX)}
            disabled={disabled}
            messages={messages}
          />
          <div className="flex-1">{button}</div>
        </div>
      )}

      <p
        role="status"
        className={
          placement === "card"
            ? "absolute inset-x-0 top-full pt-1 text-[13px] leading-[21.45px] text-ink-62"
            : "min-h-[29.45px] pt-2 text-center text-[13px] leading-[21.45px] text-ink-62"
        }
      >
        {state && !pending && <Outcome state={state} messages={messages} cartHref={cartHref} />}
      </p>
    </form>
  );
}

/**
 * The design's `Number Input - Product quantity` (Figma 178:3046): a 120×50
 * box with an ink hairline, the figure in the middle, "−" and "+" either side.
 *
 * A real number input, so it can be typed into and is what the form posts. The
 * buttons step it within 1…`max`; a typed figure out of range is pulled back
 * when the box is left, and the server caps it again either way — the browser's
 * bound is feedback, not enforcement.
 */
function QuantityCounter({
  max,
  disabled,
  messages,
}: {
  max: number;
  disabled: boolean;
  messages: Messages["cart"]["add"];
}) {
  // A string, because that is what a text box holds mid-edit: clearing the
  // box to type "3" passes through "" and must not snap back to 1.
  const [value, setValue] = useState("1");
  const current = clamp(Number.parseInt(value, 10), max);

  const step = (by: number) => setValue(String(clamp(current + by, max)));

  return (
    <div className="relative h-[50px] w-[120px] shrink-0 rounded-[3px] border-[0.909px] border-ink">
      <button
        type="button"
        aria-label={messages.decrease}
        disabled={disabled || current <= 1}
        onClick={() => step(-1)}
        className="absolute top-[11.1px] left-[10.8px] flex size-[27.78px] items-center justify-center disabled:opacity-30"
      >
        <Image src="/icons/minus.svg" alt="" width={9} height={9} />
      </button>

      <input
        type="number"
        name="quantity"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={messages.quantity}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => setValue(String(current))}
        className="h-full w-full appearance-none bg-transparent px-[38.57px] text-center text-[14.4px] leading-[23.76px] font-medium tracking-[-0.183px] text-ink [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        aria-label={messages.increase}
        disabled={disabled || current >= max}
        onClick={() => step(1)}
        className="absolute top-[11.1px] right-[10.8px] flex size-[27.78px] items-center justify-center disabled:opacity-30"
      >
        <Image src="/icons/plus.svg" alt="" width={9} height={9} />
      </button>
    </div>
  );
}

/** A typed figure as a quantity: a whole number from 1 to `max`. */
function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, max);
}

/** The sentence for an answer, and the way to the cart when there is one. */
function Outcome({
  state,
  messages,
  cartHref,
}: {
  state: AddToCartState;
  messages: Messages["cart"]["add"];
  cartHref: string;
}) {
  switch (state.status) {
    case "added":
    case "limited":
      return (
        <>
          {state.status === "added"
            ? messages.added
            : plural(state.quantity ?? 0, messages.limited)}{" "}
          <Link href={cartHref} className="font-semibold text-ink underline">
            {messages.view}
          </Link>
        </>
      );
    case "outOfStock":
      return messages.outOfStock;
    case "unavailable":
      return messages.unavailable;
    case "failed":
      return messages.failed;
  }
}
