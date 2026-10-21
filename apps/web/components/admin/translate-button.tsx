import { translateEntityAction } from "@/app/admin/(shell)/translate/actions";
import type { TranslatableKind } from "@/lib/admin/translations";

/**
 * The Translate control a list row carries.
 *
 * A form and a button with no client component above them, like the Publish and
 * Unpublish buttons beside it: a row is markup and a Server Action, so
 * translating a product works before React has loaded.
 *
 * The label carries the row's name for the reason the status buttons' do —
 * "Translate" repeated down a column tells a screen reader nothing about which
 * row it is in.
 */
export function TranslateButton({
  kind,
  id,
  name,
}: {
  kind: TranslatableKind;
  id: string;
  /** The row's name in English, for the accessible label. */
  name: string;
}) {
  return (
    <form action={translateEntityAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Translate ${name}`}
        title="Translate into German, French, Portuguese and Spanish"
        className="h-7 rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist"
      >
        Translate
      </button>
    </form>
  );
}
