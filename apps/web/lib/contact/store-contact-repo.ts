import { prisma } from "@my-ecommerce/db";
import type { StoreContact } from "@my-ecommerce/shared";

/**
 * The shop's contact details: one row, written by the admin's Contact → Info
 * screen and read by the storefront's "Get in Touch" column and footer.
 *
 * Shared by both sides rather than kept under `lib/admin/`, because the
 * storefront reads it on every Contact page and every footer.
 */

const STORE_CONTACT_ID = 1;

const SELECT = {
  phone: true,
  email: true,
  whatsapp: true,
  address: true,
  facebookUrl: true,
  instagramUrl: true,
  youtubeUrl: true,
} as const;

/** Nothing known — what a database without the seeded row reads as. */
export const EMPTY_STORE_CONTACT: StoreContact = {
  phone: null,
  email: null,
  whatsapp: null,
  address: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
};

/**
 * The details, or every field empty if the row is missing — the migration
 * writes it, but a page that 500s because someone deleted a settings row would
 * be the wrong failure.
 */
export async function getStoreContact(): Promise<StoreContact> {
  const row = await prisma.storeContact.findUnique({
    where: { id: STORE_CONTACT_ID },
    select: SELECT,
  });

  return row ?? EMPTY_STORE_CONTACT;
}

/** Replaces every field at once — the Info screen always sends the whole form. */
export async function saveStoreContact(contact: StoreContact): Promise<void> {
  await prisma.storeContact.upsert({
    where: { id: STORE_CONTACT_ID },
    create: { id: STORE_CONTACT_ID, ...contact },
    update: contact,
  });
}
