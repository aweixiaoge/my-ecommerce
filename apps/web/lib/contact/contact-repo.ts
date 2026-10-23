import { prisma } from "@my-ecommerce/db";
import type { ContactMessage } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";

/**
 * Messages from the Contact page, kept as rows — there is no mail to send them
 * with yet, and an admin inbox can read a table.
 */
export async function saveContactMessage(message: ContactMessage, locale: Locale): Promise<string> {
  const row = await prisma.contactMessage.create({
    data: {
      name: message.name,
      email: message.email,
      subject: message.subject ?? null,
      message: message.message,
      locale,
    },
    select: { id: true },
  });

  return row.id;
}
