"use client";

import { useActionState, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  addMoney,
  compareMoney,
  subtractMoney,
  CHECKOUT_EMAIL_MAX,
  CHECKOUT_NOTE_MAX,
  COUPON_CODE_MAX,
  type CartItem,
  type Money,
} from "@my-ecommerce/shared";
import {
  applyCouponAction,
  placeOrderAction,
  type CheckoutFormState,
} from "@/app/[lang]/checkout/actions";
import { shippingCost } from "@/lib/cart/shipping";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import {
  AddressFields,
  blankAddress,
  type AddressField,
  type AddressState,
  type CheckoutCountry,
} from "./address-fields";
import { Checkbox, FieldError, Radio, TextField } from "./fields";

export type { CheckoutCountry } from "./address-fields";

/**
 * The checkout (Figma 178:7839): the form on the left, the order summary on
 * the right.
 *
 * A client component for one reason the server cannot serve: the design's
 * shipping options and the summary's delivery line answer the address as it
 * is typed — "Enter address to calculate" until there is one, then the price.
 * Everything that decides anything is still the server's: the action re-reads
 * the cart and recomputes every figure, so what is drawn here is a preview of a
 * rule the server applies, from the same functions (`shippingCost`,
 * `addMoney`). A coupon is the same: "Apply" asks the server what the code
 * takes off this cart, and the form sends only the code back — "Place Order"
 * works the discount out again.
 *
 * Every field is controlled. React 19 resets a form when its action returns —
 * a refusal included — and an uncontrolled box would come back empty exactly
 * when a shopper needs what they typed kept (the review form's note says the
 * same).
 */

export function CheckoutForm({
  locale,
  idempotencyKey,
  countries,
  defaultCountry,
  items,
  subtotal,
  hasUnavailable,
  currency,
  messages,
  cartMessages,
  cartHref,
  initialEmail = "",
  saved,
}: {
  locale: Locale;
  /** Minted by the page, once per checkout, so a resubmission finds its order. */
  idempotencyKey: string;
  countries: CheckoutCountry[];
  defaultCountry: string;
  /** The lines that will be ordered — the cart's buyable ones. */
  items: CartItem[];
  subtotal: Money;
  /** Whether the cart holds lines that will be left out, to say so. */
  hasUnavailable: boolean;
  currency: DisplayCurrency;
  /** This locale's `checkout` slice of the catalog. */
  messages: Messages["checkout"];
  /** …and the three cart strings the summary shares with the cart page. */
  cartMessages: Pick<Messages["cart"], "coupons" | "optionLabel">;
  cartHref: string;
  /** The signed-in customer's email, to start the contact box with. */
  initialEmail?: string;
  /**
   * The signed-in customer's address book — what My account → Addresses
   * promises "will be used on the checkout page by default". Each one only
   * starts its box; the shopper can still change anything before ordering,
   * and the order snapshots what was sent, not the book.
   */
  saved?: { shipping: AddressState | null; billing: AddressState | null };
}) {
  // The coupon "Apply" accepted, with the discount it previewed.
  const [coupon, setCoupon] = useState<{ code: string; discount: Money } | null>(null);

  const [state, formAction, pending] = useActionState<
    CheckoutFormState | undefined,
    FormData
  >(async (previous, formData) => {
    const result = await placeOrderAction(previous, formData);
    // Refused at placing: drop it, so the total drawn is what the next
    // submission would charge.
    if (result.couponRefused) setCoupon(null);
    return result;
  }, undefined);

  const [email, setEmail] = useState(initialEmail);
  const [shipping, setShipping] = useState(() => saved?.shipping ?? blankAddress(defaultCountry));
  const [billing, setBilling] = useState(() => saved?.billing ?? blankAddress(defaultCountry));
  // Unticked, as the design draws it — the billing form below is the state the
  // frame shows.
  const [sameBilling, setSameBilling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [addNote, setAddNote] = useState(false);
  const [note, setNote] = useState("");

  const errors = state?.errors ?? {};
  const regionsOf = (code: string) =>
    countries.find((country) => country.code === code)?.regions ?? null;

  // The design shows the shipping options, and the delivery price, once there
  // is an address to ship to: every required box filled.
  const addressComplete =
    ["firstName", "lastName", "line1", "city", "postalCode"].every(
      (field) => shipping[field as AddressField].trim() !== "",
    ) && (regionsOf(shipping.countryCode) === null || shipping.region !== "");

  // Shipping is read on the subtotal before the discount, as `placeOrder` does.
  const delivery = addressComplete ? shippingCost(subtotal) : null;
  const discounted = coupon ? subtractMoney(subtotal, coupon.discount) : subtotal;
  const total = delivery ? addMoney(discounted, delivery) : discounted;
  const price = (money: Money) => formatPrice(money, currency, locale);
  const deliveryLabel = (money: Money) =>
    compareMoney(money, { amount: "0", currency: money.currency }) === 0
      ? messages.free
      : price(money);

  return (
    <form
      action={formAction}
      noValidate
      className="grid grid-cols-1 gap-[48px] pt-[24px] lg:grid-cols-[1fr_360px]"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {coupon && <input type="hidden" name="couponCode" value={coupon.code} />}

      <div className="flex flex-col">
        {(state?.message || hasUnavailable) && (
          <div className="flex flex-col gap-2 pb-[24px]">
            {state?.message && (
              <p
                role="alert"
                className="rounded-[3px] border-[0.91px] border-danger px-[16px] py-[12px] text-[13px] leading-[18.2px] text-danger"
              >
                {state.message}{" "}
                {state.reviewCart && (
                  <Link href={cartHref} className="font-semibold underline">
                    {messages.errors.reviewCart}
                  </Link>
                )}
              </p>
            )}
            {hasUnavailable && (
              <p className="rounded-[3px] border-[0.91px] border-line px-[16px] py-[12px] text-[13px] leading-[18.2px] text-ink">
                {messages.unavailableNote}{" "}
                <Link href={cartHref} className="font-semibold underline">
                  {messages.errors.reviewCart}
                </Link>
              </p>
            )}
          </div>
        )}

        <Section title={messages.contact} first>
          <TextField
            name="email"
            type="email"
            label={messages.email}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            maxLength={CHECKOUT_EMAIL_MAX}
            error={errors.email}
          />
        </Section>

        <Section title={messages.shippingAddress}>
          <AddressFields
            prefix="shipping"
            value={shipping}
            onChange={setShipping}
            countries={countries}
            errors={errors}
            messages={messages}
          />
          <div className="pt-[16px]">
            <Checkbox
              name="billingSameAsShipping"
              checked={sameBilling}
              onChange={setSameBilling}
            >
              {messages.sameBilling}
            </Checkbox>
          </div>
        </Section>

        {!sameBilling && (
          <Section title={messages.billingAddress}>
            <AddressFields
              prefix="billing"
              value={billing}
              onChange={setBilling}
              countries={countries}
              errors={errors}
              messages={messages}
            />
          </Section>
        )}

        <Section title={messages.shippingOptions}>
          {delivery ? (
            <OptionBox checked>
              <label className="flex cursor-pointer items-center gap-[12px] p-[16px]">
                <Radio name="shippingMethod" value="standard" checked onChange={() => {}} />
                <span className="flex-1">
                  {messages.standard}
                  <span className="block text-ink-62">{messages.standardTime}</span>
                </span>
                <span className="font-medium">{deliveryLabel(delivery)}</span>
              </label>
            </OptionBox>
          ) : (
            <p className="rounded-[4px] p-[24px] text-center text-[13px] leading-[18.2px] tracking-[-0.08px] text-ink">
              {messages.shippingPending}
            </p>
          )}
        </Section>

        <Section title={messages.paymentOptions}>
          <OptionBox checked={paymentMethod === "cod"}>
            <label className="flex cursor-pointer items-center gap-[12px] px-[16px] pt-[16px] pb-[16px]">
              <Radio
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                required
              />
              {messages.cod}
            </label>
            <p className="px-[16px] pb-[16px]">{messages.codBody}</p>
          </OptionBox>
          <FieldError id="checkout-paymentMethod" error={errors.paymentMethod} />
        </Section>

        <div className="pt-[24px]">
          <Checkbox name="addNote" checked={addNote} onChange={setAddNote}>
            {messages.addNote}
          </Checkbox>
          {addNote && (
            <div className="pt-[12px]">
              <textarea
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={CHECKOUT_NOTE_MAX}
                rows={3}
                aria-label={messages.addNote}
                placeholder={messages.note}
                className="w-full rounded-[3px] border-[0.91px] border-line bg-transparent px-[15px] py-[12px] text-[16px] leading-[22px] tracking-[-0.31px] text-ink outline-none placeholder:text-ink-55 focus:border-ink"
              />
              <FieldError id="checkout-note" error={errors.note} />
            </div>
          )}
        </div>

        {/*
          Plain text, not links: the shop has no terms or privacy pages yet,
          and a link to a 404 is worse than none. They become links when the
          pages exist.
        */}
        <p className="mt-[24px] border-t border-line pt-[24px] text-[13px] leading-[18.2px] tracking-[-0.08px] text-ink">
          {messages.terms}
        </p>

        <div className="pt-[24px]">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex h-[57px] w-full items-center justify-center rounded-[3px] bg-ink px-[30px] text-[15px] leading-[21px] font-medium tracking-[-0.23px] text-paper disabled:cursor-progress disabled:opacity-60"
          >
            {pending ? messages.placing : messages.placeOrder}
          </button>
        </div>
      </div>

      {/* First on a phone, where the total is what a shopper checks before
          scrolling through a form; beside the form from `lg`. */}
      <OrderSummary
        items={items}
        subtotal={subtotal}
        delivery={delivery}
        total={total}
        price={price}
        deliveryLabel={deliveryLabel}
        messages={messages}
        cartMessages={cartMessages}
        couponBox={
          <CouponBox
            locale={locale}
            applied={coupon}
            onApplied={setCoupon}
            refusal={errors.couponCode}
            messages={messages.coupon}
          />
        }
        coupon={coupon}
      />
    </form>
  );
}

/** A fieldset: the design's 20/28 heading over 16px of space and its fields. */
function Section({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={first ? "" : "pt-[24px]"}>
      <legend className="float-left w-full text-[20px] leading-[28px] font-medium tracking-[-0.45px] text-ink">
        {title}
      </legend>
      <div className="clear-left pt-[16px] text-[13px] leading-[18.2px] tracking-[-0.08px] text-ink">
        {children}
      </div>
    </fieldset>
  );
}

/** A bordered choice — a shipping method, a payment method — inked when chosen. */
function OptionBox({ checked, children }: { checked: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-[4px] border-[1.5px] text-[13px] leading-[18.2px] tracking-[-0.08px] ${
        checked ? "border-ink" : "border-line"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * The design's order summary (178:8119): each line with its quantity on a
 * badge over the photograph, the coupons disclosure, subtotal, discount and
 * delivery, and the total.
 */
function OrderSummary({
  items,
  subtotal,
  delivery,
  total,
  price,
  deliveryLabel,
  messages,
  cartMessages,
  couponBox,
  coupon,
}: {
  items: CartItem[];
  subtotal: Money;
  delivery: Money | null;
  total: Money;
  price: (money: Money) => string;
  deliveryLabel: (money: Money) => string;
  messages: Messages["checkout"];
  cartMessages: Pick<Messages["cart"], "coupons" | "optionLabel">;
  /** What the coupons disclosure opens on. */
  couponBox: ReactNode;
  coupon: { code: string; discount: Money } | null;
}) {
  return (
    <aside
      aria-labelledby="checkout-summary"
      className="order-first self-start rounded-[5px] border-[0.91px] border-line text-[13px] leading-[18.2px] tracking-[-0.08px] text-ink lg:order-none"
    >
      <h2
        id="checkout-summary"
        className="px-[16px] pt-[16px] pb-[8px] text-[20px] leading-[28px] font-medium tracking-[-0.45px]"
      >
        {messages.summary}
      </h2>

      <ul className="px-[16px] pt-[8px] pb-[16px]">
        {items.map((item) => (
          <li key={item.id} className="flex">
            <div className="relative w-[48px] shrink-0 pt-[8px] pb-[16px]">
              <div className="relative size-[48px] overflow-hidden bg-mist">
                {item.product.image && (
                  <Image
                    src={item.product.image.url}
                    alt={item.product.image.alt ?? item.product.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <span
                aria-label={fill(messages.quantity, { count: item.quantity })}
                className="absolute top-[-2px] left-[38px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-ink px-[4px] text-[13px] leading-[13px] font-semibold text-paper"
              >
                {item.quantity}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[4px] pt-[4px] pr-[12px] pb-[12px] pl-[24px]">
              <h3 className="font-medium">{item.product.name}</h3>
              <p>{price(item.variant.price)}</p>
              {item.optionValues
                .filter((value) => value.name !== "")
                .map((value) => (
                  <p key={value.id}>
                    {value.option
                      ? fill(cartMessages.optionLabel, { option: value.option, value: value.name })
                      : value.name}
                  </p>
                ))}
            </div>
            <p className="pt-[4px] text-right">{price(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      {/*
        Uncontrolled: a coupon is only ever applied from inside the open box,
        and tying `open` to it would fold the box shut on "Remove".
      */}
      <details className="group border-t border-line px-[16px] py-[16px]">
        <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          {cartMessages.coupons}
          <Image
            src="/icons/chevron-down-24.svg"
            alt=""
            width={24}
            height={24}
            className="-my-[3px] transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="pt-[12px]">{couponBox}</div>
      </details>

      <dl className="border-t border-line px-[16px] pb-[16px]">
        <div className="flex justify-between gap-4 pt-[16px]">
          <dt>{messages.subtotal}</dt>
          <dd>{price(subtotal)}</dd>
        </div>
        {coupon && (
          <div className="flex justify-between gap-4 pt-[16px]">
            <dt>{fill(messages.coupon.discount, { code: coupon.code })}</dt>
            <dd>−{price(coupon.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-[16px]">
          <dt>{messages.delivery}</dt>
          <dd className="text-right">
            {delivery ? deliveryLabel(delivery) : messages.deliveryPending}
          </dd>
        </div>
      </dl>

      <p className="flex justify-between gap-4 border-t border-line px-[16px] py-[16px] text-[24px] leading-[33.6px] font-medium tracking-[0.07px]">
        <span>{messages.total}</span>
        <span>{price(total)}</span>
      </p>
    </aside>
  );
}

/**
 * The coupons disclosure's contents: a code and "Apply", or — once one is
 * accepted — which code is on the order and a way to take it off.
 *
 * It sits inside the checkout's `<form>`, so Enter in the box is caught and
 * made "Apply"; left alone it would place the order.
 */
function CouponBox({
  locale,
  applied,
  onApplied,
  refusal,
  messages,
}: {
  locale: Locale;
  applied: { code: string; discount: Money } | null;
  onApplied: (coupon: { code: string; discount: Money } | null) => void;
  /** Why "Place Order" refused the coupon it was sent, if it did. */
  refusal?: string;
  messages: Messages["checkout"]["coupon"];
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [applying, startApplying] = useTransition();

  const apply = () => {
    if (code.trim() === "") {
      setError(messages.required);
      return;
    }

    startApplying(async () => {
      const result = await applyCouponAction(locale, code);
      if (result.status === "applied") {
        onApplied({ code: result.code, discount: result.discount });
        setCode("");
        setError(undefined);
      } else {
        setError(messages[result.status]);
      }
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      apply();
    }
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p role="status">{fill(messages.applied, { code: applied.code })}</p>
        <button
          type="button"
          onClick={() => onApplied(null)}
          className="font-semibold underline"
        >
          {messages.remove}
        </button>
      </div>
    );
  }

  return (
    <div onKeyDown={onKeyDown} className="flex items-start gap-[8px]">
      <TextField
        name="couponEntry"
        label={messages.label}
        value={code}
        onChange={(value) => {
          setCode(value);
          setError(undefined);
        }}
        autoComplete="off"
        maxLength={COUPON_CODE_MAX}
        error={error ?? refusal}
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={apply}
        disabled={applying}
        aria-busy={applying}
        className="h-[50px] shrink-0 rounded-[3px] border-[0.91px] border-ink px-[20px] text-[15px] leading-[21px] font-medium tracking-[-0.23px] text-ink disabled:cursor-progress disabled:opacity-60"
      >
        {applying ? messages.applying : messages.apply}
      </button>
    </div>
  );
}
