import { z } from "zod";

/**
 * What the Contact page's form sends (Figma 178:7686): a name, an email, an
 * optional subject and a message.
 *
 * Whitespace is trimmed before the floors are checked, so a box of spaces is
 * an empty box. The email is folded as the account's is — a reply goes to the
 * address, and two spellings of one address are one sender.
 */

export const CONTACT_NAME_MAX = 200;
export const CONTACT_EMAIL_MAX = 200;
export const CONTACT_SUBJECT_MAX = 200;

/**
 * The longest message. Generous for a question, and a bound on what one post
 * can make the database hold.
 */
export const CONTACT_MESSAGE_MAX = 5000;

export const ContactMessageSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_NAME_MAX),
  email: z.string().trim().toLowerCase().max(CONTACT_EMAIL_MAX).pipe(z.email()),
  /** The one optional box: an empty one is stored as no subject, not as "". */
  subject: z
    .string()
    .trim()
    .max(CONTACT_SUBJECT_MAX)
    .transform((value) => value || undefined)
    .optional(),
  message: z.string().trim().min(1).max(CONTACT_MESSAGE_MAX),
});

export type ContactMessage = z.infer<typeof ContactMessageSchema>;

/**
 * How the shop can be reached, as the admin's Contact → Info screen saves it
 * and the storefront's "Get in Touch" column and footer draw it.
 *
 * Every field may be left empty, and an empty field is `null`: the storefront
 * leaves out a line or an icon it has nothing for, rather than drawing a label
 * with nothing after it or a link to nowhere.
 */

export const STORE_CONTACT_TEXT_MAX = 200;
export const STORE_CONTACT_URL_MAX = 500;

const optionalText = z
  .string()
  .trim()
  .max(STORE_CONTACT_TEXT_MAX)
  .transform((value) => value || null);

/** A link the storefront will put in an `href`, so only http(s) gets through. */
const optionalUrl = z
  .string()
  .trim()
  .max(STORE_CONTACT_URL_MAX)
  .refine((value) => value === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(value), "url")
  .transform((value) => value || null);

export const StoreContactSchema = z.object({
  phone: optionalText,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(STORE_CONTACT_TEXT_MAX)
    .refine((value) => value === "" || z.email().safeParse(value).success, "email")
    .transform((value) => value || null),
  whatsapp: optionalText,
  address: optionalText,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export type StoreContact = z.infer<typeof StoreContactSchema>;

/**
 * The FAQ page's copy, as the admin's Contact → FAQ screen saves it: one
 * markdown description, the same editor and ceiling as a blog post's.
 *
 * Empty is allowed — it is how the page is emptied — and the storefront then
 * says there is nothing yet rather than drawing a blank page.
 */
export const FAQ_DESCRIPTION_MAX = 20_000;

export const FaqSchema = z.object({
  description: z.string().max(FAQ_DESCRIPTION_MAX),
});

export type Faq = z.infer<typeof FaqSchema>;

/**
 * The About page, as the admin's Contact → About screen saves it: one markdown
 * description — the FAQ's editor and ceiling — and the page's images, by the
 * ids of uploads already made, in the order shown. Position zero is the main
 * image.
 *
 * Both may be empty: that is how the page is emptied, and the storefront then
 * says there is nothing yet.
 */
export const ABOUT_DESCRIPTION_MAX = 20_000;

/**
 * How many images the page holds — its own name, for the reason
 * `IMAGES_PER_BLOG_MAX` gives, and six for the same reason: a gallery, in a
 * form that stays one screen.
 */
export const IMAGES_PER_ABOUT_MAX = 6;

export const AboutSchema = z.object({
  description: z.string().max(ABOUT_DESCRIPTION_MAX),
  mediaIds: z
    .array(z.string().min(1).max(64))
    .max(IMAGES_PER_ABOUT_MAX)
    // One image once: a repeated id would claim one row at two positions.
    .refine((ids) => new Set(ids).size === ids.length, { message: "duplicate" }),
});

export type About = z.infer<typeof AboutSchema>;
