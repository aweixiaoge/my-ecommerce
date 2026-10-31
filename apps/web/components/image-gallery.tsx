"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";

/**
 * A page's pictures and videos — a journal post's, the About page's: one
 * large, the rest as thumbnails under it.
 *
 * The product page's gallery is the precedent — square corners throughout, an
 * ivory ground, and the thumb showing framed by a hairline ring while the rest
 * sit faded — widened to the article's full measure. Every picture is mounted in the frame at once and the
 * chosen one faded in, so switching is a crossfade rather than a blank frame
 * while the next file loads. The thumbnails pick one, and ←/→ on the keyboard
 * step through them, wrapping, since a gallery of three has no natural last
 * page. The frame carries no arrows of its own; the thumbnails sit right under
 * it and do that job.
 *
 * A video plays as the product page's does: in the frame, muted and looping
 * with controls, mounted only while it is the one chosen — a hidden player is
 * still a download and still a sound — and as its first frame with a play mark
 * among the thumbnails.
 */
export function ImageGallery({
  images,
  title,
  messages,
}: {
  images: { id: string; url: string; kind?: "image" | "video" }[];
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
    // A focused player's own arrow keys seek it; they are not the gallery's.
    if (event.target instanceof HTMLVideoElement) return;
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="flex flex-col gap-[16px]" onKeyDown={onKeyDown}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ivory bar:aspect-[1290/640]">
        {images.map((image, index) =>
          image.kind === "video" ? (
            index === current && (
              <video
                key={image.id}
                src={image.url}
                aria-label={title}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
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
          ),
        )}

        {count > 1 && (
          <p
            aria-live="polite"
            className="absolute right-[16px] bottom-[16px] bg-paper/90 px-[12px] py-[5px] text-[11px] leading-[16px] font-medium tracking-[0.18em] text-ink tabular-nums backdrop-blur-sm"
          >
            {current + 1} / {count}
          </p>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-[14px] overflow-x-auto p-[3px]">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setCurrent(index)}
                aria-pressed={index === current}
                aria-label={fill(messages.show, { n: index + 1, total: count })}
                className={`relative block aspect-[4/3] w-[96px] overflow-hidden bg-ivory transition-opacity duration-300 bar:w-[140px] ${
                  index === current
                    ? "opacity-100 ring-1 ring-gold ring-offset-2"
                    : "opacity-55 hover:opacity-100"
                }`}
              >
                {image.kind === "video" ? (
                  <>
                    <video
                      src={`${image.url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full bg-paper/85 text-[11px] text-ink"
                    >
                      ▶
                    </span>
                  </>
                ) : (
                  <Image src={image.url} alt="" fill sizes="140px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
