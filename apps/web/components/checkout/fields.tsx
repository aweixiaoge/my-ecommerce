import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The checkout's form controls (Figma 178:7920 and its siblings), in the
 * storefront's luxury register: square 52px boxes on a hairline, the label
 * inside the box.
 *
 * A text box's label is its placeholder until something is typed, then sits
 * small at the top — done in CSS with `peer-placeholder-shown`, so it needs no
 * state and is right on the first paint. A dropdown always has a value to show,
 * so its label is always the small one, as the design's "Country/Region" is.
 *
 * Every control takes its `error` and points `aria-describedby` at it, so a
 * screen reader hears why a box was refused when it lands on it.
 */

const BOX =
  "h-[52px] w-full border bg-paper px-[15px] pt-[22px] pb-[6px] text-[16px] leading-[22px] text-ink outline-none transition-colors focus:border-ink";

export function TextField({
  name,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  required = false,
  maxLength,
  className = "",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const id = fieldId(name);

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // A single space, so `:placeholder-shown` means "empty" — the label
          // is what a reader sees, not this.
          placeholder=" "
          autoComplete={autoComplete}
          required={required}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`peer ${BOX} ${error ? "border-danger" : "border-line"}`}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-[7px] left-[16px] text-[11px] leading-[16px] tracking-[0.14em] text-ink-55 uppercase transition-all peer-placeholder-shown:top-[15px] peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-placeholder-shown:text-[16px] peer-placeholder-shown:leading-[22px] peer-focus:top-[7px] peer-focus:text-[11px] peer-focus:leading-[16px] peer-focus:tracking-[0.14em] peer-focus:uppercase"
        >
          {label}
        </label>
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  error,
  autoComplete,
  required = false,
  className = "",
  children,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
  /** The `<option>`s. */
  children: ReactNode;
}) {
  const id = fieldId(name);

  return (
    <div className={className}>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${BOX} appearance-none pr-[48px] ${error ? "border-danger" : "border-line"}`}
        >
          {children}
        </select>
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-[7px] left-[16px] text-[11px] leading-[16px] tracking-[0.14em] text-ink-55 uppercase"
        >
          {label}
        </label>
        <Image
          src="/icons/chevron-down-24.svg"
          alt=""
          width={24}
          height={24}
          className="pointer-events-none absolute top-[14px] right-[12px]"
        />
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

/** The design's 20px checkbox: a hairline square, ink with a tick when on. */
export function Checkbox({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-[12px] text-[14px] leading-[20px] text-ink-62">
      <span className="relative flex size-[20px] shrink-0">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-[20px] cursor-pointer appearance-none border border-line bg-paper checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-[4px] hidden text-paper peer-checked:block"
        >
          <path d="M2 6.5 4.75 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      {children}
    </label>
  );
}

/** The design's 20px radio: an ink ring, filled at its centre when chosen. */
export function Radio({
  name,
  value,
  checked,
  onChange,
  required = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      required={required}
      className="size-[20px] shrink-0 cursor-pointer appearance-none rounded-full border border-ink bg-paper checked:border-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    />
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;

  return (
    <p id={`${id}-error`} className="pt-1 text-[13px] leading-[18.2px] text-danger">
      {error}
    </p>
  );
}

/** A DOM id for a field name: `shipping.firstName` → `checkout-shipping-firstName`. */
export function fieldId(name: string): string {
  return `checkout-${name.replace(/\./g, "-")}`;
}
