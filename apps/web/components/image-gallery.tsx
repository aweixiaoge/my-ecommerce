"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";

/**
 * A page's pictures — a journal post's, the About page's: one large, the rest
 * as thumbnails under it.
 *
 * The product page's gallery is the precedent — square main frame, 12px
 * corners on the thumbs, an ink border on the one showing — widened to the
 * article's full measure. Every picture is mounted in the frame at once and the
 * chosen one faded in, so switching is a crossfade rather than a blank frame
 * while the next file loads. Arrows on the frame and ←/→ on the keyboard step
 * through them; both wrap, since a gallery of three has no natural last page.
 */
export function ImageGallery({
  images,
  title,
  messages,
}: {
  images: { id: string; url: string }[];
  /** What the pictures are of — the admin collects no alt text for them. */
  title: string;
  messages: Messages["gallery"];
}) {
  const [current, setCurrent] = useState(0);
  const count = images.length;

  if (count === 0) return null;

  const step = (by: number) => setCurrent((index) => (index + by + count) % count);

  const onKeyDown = (event: KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="flex flex-col gap-[16px]" onKeyDown={onKeyDown}>
      <div className="group relative aspect-[4/3] w-full overflow-hidden bg-mist bar:aspect-[1290/640]">
        {images.map((image, index) => (
          <Image
            key={image.id}
            src={image.url}
            alt={index === current ? title : ""}
            aria-hidden={index !== current}
            fill
            sizes="(min-width: 1338px) 1290px, 100vw"
            className={`object-cover transition-opacity duration-500 ease-out ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
            // The first picture is the largest thing above the fold.
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}

        {count > 1 && (
          <>
            <FrameButton side="left" label={messages.previous} onClick={() => step(-1)} />
            <FrameButton side="right" label={messages.next} onClick={() => step(1)} />

            <p
              aria-live="polite"
              className="absolute right-[16px] bottom-[16px] rounded-full bg-ink/60 px-[12px] py-[4px] text-[12px] leading-[18px] font-semibold tracking-[0.5px] text-paper tabular-nums backdrop-blur-sm"
            >
              {current + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-[12px] overflow-x-auto pb-[4px]">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setCurrent(index)}
                aria-pressed={index === current}
                aria-label={fill(messages.show, { n: index + 1, total: count })}
                className={`relative block aspect-[4/3] w-[96px] overflow-hidden rounded-card border-2 transition bar:w-[140px] ${
                  index === current
                    ? "border-ink opacity-100"
                    : "border-transparent opacity-55 hover:opacity-90"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="140px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FrameButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 ${side === "left" ? "left-[16px]" : "right-[16px]"} flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-[18px] text-ink shadow-sm backdrop-blur-sm transition hover:bg-paper focus-visible:opacity-100 bar:opacity-0 bar:group-hover:opacity-100`}
    >
      <span aria-hidden>{side === "left" ? "←" : "→"}</span>
    </button>
  );
}
