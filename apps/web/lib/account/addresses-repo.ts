import { prisma } from "@my-ecommerce/db";
import type { Address } from "@my-ecommerce/shared";

/**
 * A customer's address book: one billing address and one shipping address,
 * each of which may be missing.
 *
 * The shape is the checkout's `Address` — the same schema validates both
 * forms — so a saved address drops straight into the checkout's boxes.
 */

export type AddressKind = "billing" | "shipping";

export const ADDRESS_KINDS: readonly AddressKind[] = ["billing", "shipping"];

export function isAddressKind(value: string): value is AddressKind {
  return (ADDRESS_KINDS as readonly string[]).includes(value);
}

export type AddressBook = Record<AddressKind, Address | null>;

const ADDRESS_SELECT = {
  kind: true,
  firstName: true,
  lastName: true,
  line1: true,
  line2: true,
  city: true,
  region: true,
  postalCode: true,
  countryCode: true,
  phone: true,
} as const;

export async function customerAddresses(customerId: string): Promise<AddressBook> {
  const rows = await prisma.customerAddress.findMany({
    where: { customerId },
    select: ADDRESS_SELECT,
  });

  const book: AddressBook = { billing: null, shipping: null };
  for (const { kind, line2, region, phone, ...rest } of rows) {
    // Nulls become `undefined`, as the schema's optional boxes parse them.
    book[kind] = { ...rest, line2: line2 ?? undefined, region: region ?? undefined, phone: phone ?? undefined };
  }
  return book;
}

/**
 * Writes one kind, replacing what was there. An upsert on the
 * `(customer_id, kind)` key, so two saves racing cannot leave two billing
 * addresses behind.
 */
export async function saveAddress(customerId: string, kind: AddressKind, address: Address): Promise<void> {
  const data = {
    firstName: address.firstName,
    lastName: address.lastName,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region ?? null,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    phone: address.phone ?? null,
  };

  await prisma.customerAddress.upsert({
    where: { customerId_kind: { customerId, kind } },
    create: { customerId, kind, ...data },
    update: data,
  });
}

/**
 * A saved address as the address block's boxes hold it — every field a
 * string, an absent one empty. Here rather than beside the block because the
 * block is a client module, and the pages that call this are not.
 */
export function addressFormValues(address: Address): Record<keyof Address, string> {
  return {
    countryCode: address.countryCode,
    firstName: address.firstName,
    lastName: address.lastName,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    region: address.region ?? "",
    postalCode: address.postalCode,
    phone: address.phone ?? "",
  };
}
