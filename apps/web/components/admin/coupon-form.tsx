"use client";

import { startTransition, useActionState, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { generateCouponCode, type CouponType } from "@my-ecommerce/shared";
import {
  createCouponAction,
  updateCouponAction,
  type CouponFormState,
} from "@/app/admin/(shell)/coupons/actions";
import type { CouponForEdit, CouponProductChoice } from "@/lib/admin/coupons-repo";
import { FieldErrors, inputClass, LABEL } from "./form-controls";

/**
 * The create-coupon form, and — handed a `coupon` — the edit form: the same
 * fields seeded from it, posting to the update action with its id.
 *
 * Every field is controlled, and the submit goes through `onSubmit` rather
 * than the form's own action. React 19 resets a form when its action resolves,
 * and controlled text boxes survive that but controlled radios do not: the
 * reset puts "All products" back on while the state still says "Selected", so
 * the picker shows under the wrong choice. Dispatching the action ourselves
 * never triggers the reset.
 *
 * The expiry is picked in the person's own time (`datetime-local` has no
 * timezone) and sent as an instant in a hidden field, because the browser is
 * the only place that knows which timezone "31 December, 23:59" meant. For the
 * same reason the state is the instant, and the box only shows it once the page
 * is running in the browser: the server would write it in its own timezone.
 */
export function CouponForm({
  products,
  currency,
  coupon,
}: {
  products: CouponProductChoice[];
  /** The shop's currency, which a fixed amount is in. */
  currency: string;
  /** The coupon being edited; absent on the create screen. */
  coupon?: CouponForEdit;
}) {
  const [state, formAction, pending] = useActionState<
    CouponFormState | undefined,
    FormData
  >(coupon ? updateCouponAction : createCouponAction, undefined);

  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "percentage");
  const [amount, setAmount] = useState(coupon?.amount ?? "");
  const [appliesTo, setAppliesTo] = useState<"all" | "selected">(
    coupon && !coupon.appliesToAllProducts ? "selected" : "all",
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(coupon?.productIds ?? []),
  );
  const [search, setSearch] = useState("");
  const [expiresAt, setExpiresAt] = useState(coupon?.expiresAt ?? "");
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query === ""
      ? products
      : products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  const errors = state?.errors;

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="flex max-w-[640px] flex-col gap-8"
    >
      {state?.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      {/* Code */}
      <div className="flex flex-col gap-2">
        <label htmlFor="code" className={LABEL}>
          Code
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            name="code"
            type="text"
            required
            autoFocus={!coupon}
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            aria-invalid={errors?.code ? true : undefined}
            aria-describedby={errors?.code ? "code-error" : "code-hint"}
            className={`h-11 min-w-0 flex-1 font-mono tracking-[1px] ${inputClass(Boolean(errors?.code))}`}
          />
          <button
            type="button"
            onClick={() => setCode(generateCouponCode())}
            className="h-11 shrink-0 rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
          >
            Generate code
          </button>
        </div>
        <p id="code-hint" className="text-[12px] leading-[19.8px] text-ink-55">
          What the customer types at checkout. Letters, digits, dashes and underscores.
        </p>
        <FieldErrors id="code-error" messages={errors?.code} />
      </div>

      {/* Type and amount */}
      <fieldset className="flex flex-col gap-3">
        <legend className={`${LABEL} mb-2`}>Type</legend>
        <div className="flex flex-wrap gap-2">
          <TypeOption
            value="fixed_amount"
            checked={type === "fixed_amount"}
            onSelect={setType}
          >
            Fixed Amount Discount
          </TypeOption>
          <TypeOption
            value="percentage"
            checked={type === "percentage"}
            onSelect={setType}
          >
            Percentage Discount
          </TypeOption>
        </div>
        <FieldErrors id="type-error" messages={errors?.type} />

        <div className="flex flex-col gap-2">
          <label htmlFor="amount" className={LABEL}>
            {type === "percentage" ? "Percentage off" : `Amount off (${currency})`}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              placeholder={type === "percentage" ? "10" : "5.00"}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={errors?.amount ? true : undefined}
              aria-describedby={errors?.amount ? "amount-error" : undefined}
              className={`h-11 w-40 ${inputClass(Boolean(errors?.amount))}`}
            />
            <span className="text-[14px] text-ink-60">
              {type === "percentage" ? "%" : currency}
            </span>
          </div>
          <FieldErrors id="amount-error" messages={errors?.amount} />
        </div>
      </fieldset>

      {/* Associated products */}
      <fieldset className="flex flex-col gap-3">
        <legend className={`${LABEL} mb-2`}>Associated products</legend>
        <div className="flex flex-col gap-2">
          <Radio
            name="appliesTo"
            value="all"
            checked={appliesTo === "all"}
            onChange={() => setAppliesTo("all")}
          >
            All products
          </Radio>
          <Radio
            name="appliesTo"
            value="selected"
            checked={appliesTo === "selected"}
            onChange={() => setAppliesTo("selected")}
          >
            Selected products
          </Radio>
        </div>

        {appliesTo === "selected" && (
          <div className="flex flex-col gap-2 rounded-card border border-line p-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="search"
                aria-label="Search products"
                placeholder="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`h-9 min-w-0 flex-1 ${inputClass(false)}`}
              />
              <span className="shrink-0 text-[12px] text-ink-55" aria-live="polite">
                {selected.size} selected
              </span>
            </div>

            <ul className="flex max-h-64 flex-col overflow-y-auto">
              {visibleProducts.map((product) => (
                <li key={product.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-[13px] text-ink hover:bg-mist">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggle(product.id)}
                      className="size-4 accent-ink"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {product.name || "Untitled product"}
                    </span>
                    {product.status !== "active" && (
                      <span className="text-[12px] text-ink-55">{product.status}</span>
                    )}
                  </label>
                </li>
              ))}
              {visibleProducts.length === 0 && (
                <li className="px-2 py-1.5 text-[13px] text-ink-60">No products match.</li>
              )}
            </ul>
          </div>
        )}

        {/* Sent from state rather than from the checkboxes themselves, so a
            selection hidden by the search box is still submitted. */}
        {appliesTo === "selected" &&
          [...selected].map((id) => (
            <input key={id} type="hidden" name="productIds" value={id} />
          ))}
        <FieldErrors id="products-error" messages={errors?.productIds} />
      </fieldset>

      {/* Expiry */}
      <div className="flex flex-col gap-2">
        <label htmlFor="expiresAtLocal" className={LABEL}>
          Expire date
        </label>
        <input
          id="expiresAtLocal"
          type="datetime-local"
          required
          value={inBrowser ? toLocalInput(expiresAt) : ""}
          onChange={(event) => setExpiresAt(toInstant(event.target.value))}
          aria-invalid={errors?.expiresAt ? true : undefined}
          aria-describedby={errors?.expiresAt ? "expires-error" : "expires-hint"}
          className={`h-11 w-64 ${inputClass(Boolean(errors?.expiresAt))}`}
        />
        <input type="hidden" name="expiresAt" value={expiresAt} />
        <p id="expires-hint" className="text-[12px] leading-[19.8px] text-ink-55">
          In your local time. The coupon stops working at this moment.
        </p>
        <FieldErrors id="expires-error" messages={errors?.expiresAt} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {coupon ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create coupon"}
        </button>

        <Link
          href="/admin/coupons"
          className="flex h-11 items-center rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
        >
          Cancel
        </Link>
      </div>

      {/*
        Last rather than first, as the blog and product forms have it: here,
        first in the form it sat beside the hidden fields React writes for the
        Server Action, and the page failed to hydrate (seen in the browser,
        2026-10-22). At the end it is clear of them.
      */}
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
    </form>
  );
}

/** `useSyncExternalStore`'s subscription for a value that never changes. */
const noSubscription = () => () => {};

/** An ISO instant as a `datetime-local` value in this browser's time, to the minute. */
function toLocalInput(instant: string): string {
  const date = new Date(instant);
  if (instant === "" || Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value as an ISO instant, or "" while it is incomplete. */
function toInstant(local: string): string {
  if (local === "") return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function TypeOption({
  value,
  checked,
  onSelect,
  children,
}: {
  value: CouponType;
  checked: boolean;
  onSelect: (value: CouponType) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-[14px] transition-colors ${
        checked ? "border-ink bg-mist text-ink" : "border-line text-ink-62 hover:bg-mist"
      }`}
    >
      <input
        type="radio"
        name="type"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="accent-ink"
      />
      {children}
    </label>
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="accent-ink"
      />
      {children}
    </label>
  );
}
