/**
 * Shared by every admin media picker — the product form's colours, and the
 * blog's and the About page's image lists — so a video looks the same wherever
 * it is arranged.
 */

/**
 * A video's thumbnail: its first frame, and a play mark so it does not pass for
 * a photograph.
 *
 * `#t=0.1` asks for a frame a moment in — Safari draws nothing for a muted
 * video at 0 until it plays — and `preload="metadata"` fetches only enough of
 * the file to draw it.
 */
export function VideoThumbnail({ src }: { src: string }) {
  return (
    <div className="relative h-[72px] w-[104px] overflow-hidden rounded-control border border-line bg-ink">
      <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      <span
        aria-hidden
        className="absolute inset-0 m-auto flex h-6 w-6 items-center justify-center rounded-full bg-paper/85 text-[10px] text-ink"
      >
        ▶
      </span>
      <span className="sr-only">Video</span>
    </div>
  );
}
