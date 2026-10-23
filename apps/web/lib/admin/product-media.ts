import {
  ACCEPTED_IMAGE_TYPES,
  IMAGES_PER_VARIANT_MAX,
  isVideoType,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@my-ecommerce/shared";

/**
 * The upload rules, as sentences.
 *
 * The browser has to check a file before it spends a request on it, and the
 * person has to be told why the file they chose was refused. Both of those are
 * decisions, so they live here where vitest can reach them rather than inside
 * an event handler in the component.
 *
 * The same bounds are checked again on the server, by the upload action — a
 * Server Action is reachable by direct POST, so what happens here is feedback,
 * not enforcement. Both read the numbers from the shared schema, so the
 * feedback and the enforcement cannot drift.
 */

/**
 * What the route handler serves an image at.
 *
 * One definition, because two places need to agree: the upload action hands
 * this URL back, and the form renders its thumbnails by turning the ids it
 * holds into URLs again — which is the path a reload takes, and the reason a
 * thumbnail that works right after uploading but not after a refresh is a bug
 * this shape cannot have.
 */
export function mediaUrl(id: string): string {
  return `/admin/media/${id}`;
}

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);
const MAX_VIDEO_MB = MAX_VIDEO_BYTES / (1024 * 1024);

/**
 * What is wrong with this file, or null when nothing is.
 *
 * `video` is whether the picker takes videos as well — the product form's does,
 * the blog's and the About page's do not — and a video is held to its own,
 * larger cap.
 */
export function fileProblem(file: File, { video = false } = {}): string | null {
  if (video && isVideoType(file.type)) {
    return file.size > MAX_VIDEO_BYTES ? `${file.name} is over the ${MAX_VIDEO_MB} MB video limit.` : null;
  }

  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return video
      ? `${file.name} is not a file we can store — PNG, JPEG, WebP, GIF, AVIF, MP4 or WebM.`
      : `${file.name} is not an image we can store — PNG, JPEG, WebP, GIF or AVIF.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is over the ${MAX_IMAGE_MB} MB limit.`;
  }

  return null;
}

/**
 * The files worth uploading, and what to say about the rest.
 *
 * `room` is how many more images the holder can take. A file that is the wrong
 * type or too large is a problem with that file; a file that does not fit is a
 * problem with the list, and saying so once is clearer than naming each of the
 * files that would not have fitted anyway.
 *
 * `holder` and `limit` name the thing that is full, because the two forms that
 * upload images fill different things: the product form fills a colour, the blog
 * form fills a post, and the sentence has to quote the one that applies. They
 * are arguments rather than constants read here because the numbers agree today
 * by coincidence — a colour and a post hold six apiece — and a message that
 * quoted the wrong one would be confidently wrong.
 */
export function planUploads(
  files: readonly File[],
  room: number,
  { holder = "a colour", limit = IMAGES_PER_VARIANT_MAX, video = false } = {},
): { accepted: File[]; problems: string[] } {
  const accepted: File[] = [];
  const problems: string[] = [];
  let overflowed = 0;

  for (const file of files) {
    const problem = fileProblem(file, { video });
    if (problem) {
      problems.push(problem);
      continue;
    }

    if (accepted.length >= room) {
      overflowed += 1;
      continue;
    }

    accepted.push(file);
  }

  if (overflowed > 0) {
    problems.push(
      overflowed === 1
        ? `1 image was not uploaded — ${holder} holds at most ${limit}.`
        : `${overflowed} images were not uploaded — ${holder} holds at most ${limit}.`,
    );
  }

  return { accepted, problems };
}
