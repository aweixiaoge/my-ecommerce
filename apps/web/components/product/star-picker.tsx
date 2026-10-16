"use client";

import Image from "next/image";
import { useId, useState } from "react";

/** The scale, in the order the stars are drawn. */
const STARS = [1, 2, 3, 4, 5];

/**
 * The design's "Your rating" row (node 178:3139): the label, then five 24×23
 * stars on the same 6px gap the display-only `StarRating` uses.
 *
 * Radios rather than five buttons with `aria-pressed`, which is what the
 * product page's option pills use. The pills are independent choices shown side
 * by side; a rating is one choice out of five, which is what a radio group *is*
 * — and a native radio brings arrow-key navigation, a single tab stop, the
 * browser's own `required` check and a value in the `FormData`, none of which a
 * row of buttons gets for free. The inputs are the interaction layer's hidden
 * half; everything about how this looks is a star.
 *
 * A `div` with `role="radiogroup"` rather than a `fieldset`: a `legend` is
 * laid out by the browser rather than by this component, which is the one thing
 * that would not survive the label sitting *beside* the stars as the design
 * draws it. `useId` names the group so two pickers on one page stay distinct.
 *
 * Hovering previews what a click would choose, because a rating widget with no
 * feedback under the cursor reads as broken. The preview is display state only
 * — `value` is the contract's, and this component never changes it without a
 * click or a keypress.
 */
export function StarPicker({
  value,
  onChange,
  describedBy,
}: {
  /** The chosen rating, or 0 when nothing has been chosen yet. */
  value: number;
  onChange: (rating: number) => void;
  /** The id of the element explaining why a rating is needed, when one is. */
  describedBy?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const labelId = useId();
  const painted = hovered || value;

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex min-w-0 items-center"
      onMouseLeave={() => setHovered(0)}
    >
      <span
        id={labelId}
        className="text-[13px] leading-[21.45px] font-medium tracking-[-0.076px] text-ink uppercase"
      >
        Your rating{" "}
        <span aria-hidden className="text-[#cc0000]">
          *
        </span>
      </span>

      <div className="flex items-center gap-1.5 pl-[6px]">
        {STARS.map((star) => (
          <label
            key={star}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(star)}
          >
            <input
              type="radio"
              name="rating"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              aria-describedby={describedBy}
              className="peer sr-only"
              required
            />
            {/* The ring has to sit on the star: the input it belongs to is
                `sr-only`, and an outline on nothing is an outline nobody sees. */}
            <span className="block rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-ink/15 peer-focus-visible:outline-none">
              <Image
                src={
                  star <= painted
                    ? "/icons/star-filled.svg"
                    : "/icons/star-empty.svg"
                }
                alt=""
                width={24}
                height={23}
              />
            </span>
            <span className="sr-only">
              {star} star{star === 1 ? "" : "s"}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
