import { z } from "zod";

/**
 * The admin's feature-toggle payload — the write side of the home page's
 * featured set.
 *
 * The same shape as `AdminProductPublishSchema`, and for the same reason: an id
 * and the resulting *state* as a word. The hidden field carries the state
 * (`featured` / `unfeatured`) while the button that sent it carries the action
 * ("Feature" / "Unfeature"), so what a payload records is what the row is after
 * the click rather than which button was pressed — and a reply to the same
 * payload lands on the same state instead of toggling it back.
 *
 * Two words and no boolean: a checkbox would send `"on"` or nothing at all, and
 * "the field was absent" is a third case every reader would then have to handle
 * for no gain. There is nothing in between featured and not.
 */

export const AdminFeaturedProductSchema = z.object({
  id: z.string().min(1).max(64),
  featured: z.enum(["featured", "unfeatured"]),
});

export type AdminFeaturedProduct = z.infer<typeof AdminFeaturedProductSchema>;
