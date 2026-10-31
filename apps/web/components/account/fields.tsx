"use client";

import { useState, type ReactNode } from "react";

/**
 * The My account forms' controls, as the design draws them (Figma 178:2772
 * and 178:2807): a 14px label above a 40px box with a hairline #E1E8ED border
 * and 3px corners, and a red asterisk on every required label.
 *
 * Not the checkout's `TextField`: that one floats its label inside a 50px
 * box, and this design puts it outside a shorter one. The two would have to
 * fight each other's every class to share a component.
 *
 * The pale blue the design shows inside the Login boxes is Chrome's autofill
 * tint, captured with the page — not a fill of the design's own. The Register
 * boxes, which nothing had autofilled, are the drawing.
 */

const BOX =
  "h-[46px] w-full border bg-paper px-[15px] text-[16px] leading-[26.4px] text-ink outline-none transition-colors focus:border-ink";

export function AccountField({
  id,
  name,
  label,
  requiredLabel,
  error,
  type,
  autoComplete,
  defaultValue,
  showLabel,
  hideLabel,
}: {
  /** A DOM id unique on the page — both forms have an `email`. */
  id: string;
  name: string;
  label: string;
  /** What the asterisk reads as. */
  requiredLabel: string;
  error?: string;
  type: "email" | "password";
  autoComplete?: string;
  defaultValue?: string;
  /** For a password box: the eye button's name in either state. */
  showLabel?: string;
  hideLabel?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <FieldLabel htmlFor={id} requiredLabel={requiredLabel}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${BOX} ${isPassword ? "pr-[40px]" : ""} ${error ? "border-danger" : "border-line"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? hideLabel : showLabel}
            aria-pressed={revealed}
            aria-controls={id}
            // The design's 14px button, 12px in from the box's right edge,
            // given a 40px target around it so it can be hit with a thumb.
            className="absolute top-0 right-0 flex size-[40px] items-center justify-center text-ink"
          >
            <EyeIcon crossed={revealed} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="pt-1 text-[13px] leading-[18.2px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** The 14px medium label, and its bold red asterisk. */
export function FieldLabel({
  htmlFor,
  requiredLabel,
  children,
}: {
  htmlFor: string;
  requiredLabel: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block pb-2 text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase"
    >
      {children}{" "}
      {/* Gold rather than the design's #FF0000; the sr-only text says it. */}
      <span aria-hidden className="text-gold">
        *
      </span>
      <span className="sr-only">({requiredLabel})</span>
    </label>
  );
}

/** A 46px ink button in tracked type, which turns to an outline on hover. */
export function AccountButton({ pending, children }: { pending?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[46px] items-center justify-center border border-ink bg-ink px-8 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:hover:text-paper"
    >
      {children}
    </button>
  );
}

/** A sentence for the whole form, announced as it arrives. */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mb-[20px] border border-danger px-[15px] py-[8px] text-[14px] leading-[23.1px] tracking-[-0.15px] text-danger"
    >
      {message}
    </p>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5Z" />
      <circle cx="8" cy="8" r="2.25" />
      {crossed && <path d="M2 14 14 2" />}
    </svg>
  );
}
