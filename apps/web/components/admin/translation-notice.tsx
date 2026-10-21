import {
  isTranslationNotice,
  translationNoticeText,
} from "@/lib/admin/translation-notice";

/**
 * What the last save said about its translations.
 *
 * The value is the `?translated=` parameter a create redirects with. Anything
 * else — no parameter at all, which is every ordinary visit, or one somebody
 * typed — draws nothing rather than an invented outcome.
 *
 * `role="status"` rather than `alert`: it is the answer to something the person
 * did a moment ago on another screen, not an interruption.
 */
export function TranslationNotice({
  value,
}: {
  value: string | string[] | undefined;
}) {
  if (!isTranslationNotice(value)) return null;

  return (
    <p
      role="status"
      className="rounded-control border border-line bg-mist px-3 py-2.5 text-[13px] leading-[21.45px] text-ink"
    >
      {translationNoticeText(value)}
    </p>
  );
}
