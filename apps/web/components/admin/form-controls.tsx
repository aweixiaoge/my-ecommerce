/**
 * The little pieces every admin form is built from.
 *
 * Extracted when a second form appeared. Two screens that render the same
 * input with the same border, the same focus ring and the same red-on-invalid
 * are two screens that drift the first time one of them is touched — and the
 * drift is invisible until someone puts them side by side.
 */

export const LABEL =
  "text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink";

export function inputClass(invalid: boolean): string {
  return `rounded-control border bg-paper px-3 text-[14px] text-ink transition-colors outline-none focus:ring-2 ${
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
      : "border-line focus:border-ink focus:ring-ink/15"
  }`;
}

export function FieldErrors({
  id,
  messages,
  announce = false,
}: {
  id: string;
  messages?: string[];
  announce?: boolean;
}) {
  if (!messages || messages.length === 0) return null;

  return (
    <ul
      id={id}
      role={announce ? "alert" : undefined}
      className="text-[12px] leading-[19.8px] text-red-600"
    >
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
