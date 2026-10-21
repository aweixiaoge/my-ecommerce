import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { hasLocale, type Locale } from "@/lib/languages";

/**
 * The language the request is being answered in.
 *
 * The one place the URL's first segment is read, so a page asks for it the same
 * way every time — and the one place a segment that is not a language is
 * turned away. It 404s rather than falling back to the default: the proxy has
 * already redirected anything without a locale, so a segment that reaches here
 * and is not one means the URL is wrong, and a wrong URL should not render a
 * page in a language nobody asked for.
 *
 * `lang()` is `string | undefined` rather than `string` because the admin's
 * root layout has no such segment — hence the guard rather than a cast. It is
 * also why this is a Server Component utility and not a prop: reading root
 * params is only possible on the server, and only below the layout that
 * declares the segment.
 */
export async function requestLocale(): Promise<Locale> {
  const value = await lang();

  if (typeof value !== "string" || !hasLocale(value)) notFound();

  return value;
}
