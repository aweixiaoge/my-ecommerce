import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The checkout's form controls, as the design draws them (Figma 178:7920 and
 * its siblings): 50px boxes with a hairline #E1E8ED border and 3px corners,
 * the label inside the box.
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
  "h-[50px] w-full rounded-[3px] border-[0.91px] bg-transparent px-[15px] pt-[22px] pb-[6px] text-[16px] leading-[22px] tracking-[-0.31px] text-ink outline-none focus:border-ink";

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
          className="pointer-events-none absolute top-[6px] left-[16px] text-[13px] leading-[18px] tracking-[-0.26px] text-ink-55 transition-all peer-placeholder-shown:top-[14px] peer-placeholder-shown:text-[16px] peer-placeholder-shown:leading-[22px] peer-focus:top-[6px] peer-focus:text-[13px] peer-focus:leading-[18px]"
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
          className="pointer-events-none absolute top-[6px] left-[16px] text-[13px] leading-[18px] tracking-[-0.08px] text-ink-55"
        >
          {label}
        </label>
        <Image
          src="/icons/chevron-down-24.svg"
          alt=""
          width={24}
          height={24}
          className="pointer-events-none absolute top-[13px] right-[12px]"
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
    <label className="flex w-fit cursor-pointer items-center gap-[12px] text-[13px] leading-[20px] tracking-[-0.08px] text-ink">
      <span className="relative flex size-[20px] shrink-0">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-[20px] cursor-pointer appearance-none rounded-[4px] border-[0.91px] border-line bg-paper checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
      className="size-[20px] shrink-0 cursor-pointer appearance-none rounded-full border-[0.91px] border-ink bg-paper checked:border-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
