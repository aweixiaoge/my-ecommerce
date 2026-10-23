import { prisma } from "@my-ecommerce/db";

/**
 * Messages from the storefront's Contact form, as the admin's Contact →
 * Message screen reads them.
 */

/** One message, as the list draws it. */
export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  /** The language the sender wrote from — the one to reply in. */
  locale: string;
  /** ISO 8601, formatted at the edge like every other date in the contract. */
  createdAt: string;
}

/**
 * Every message, newest first.
 *
 * No `take`, like the customer list: the shop is small, and paging is a change
 * of its own the day it is needed.
 */
export async function listContactMessages(): Promise<AdminContactMessage[]> {
  const rows = await prisma.contactMessage.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      locale: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
