import type { StoreContact } from "@my-ecommerce/shared";

/**
 * Turning the shop's contact details (`lib/contact/store-contact-repo.ts`,
 * edited in the admin's Contact → Info) into links and icons.
 *
 * The details are facts about the business, not copy: a phone number and an
 * address are the same in every language, so they are stored once, and only the
 * labels in front of them ("tel:", "Adresse:") are translated.
 */

/** A `tel:` link: the digits and a leading `+`, nothing else. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * A wa.me link. wa.me takes the number in international form with no `+` or
 * `00` prefix, so `0086-188…` and `+86 188…` both become `86188…`.
 */
export function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "").replace(/^00/, "")}`;
}

/*
 * Social network names, which are the same in every language — a proper noun
 * that happened to be coined in English. They are labels, not copy, so they do
 * not belong in a catalog.
 */
const SOCIALS = [
  { label: "Facebook", src: "/icons/social-facebook.svg", field: "facebookUrl" },
  { label: "Instagram", src: "/icons/social-instagram.svg", field: "instagramUrl" },
  { label: "YouTube", src: "/icons/social-youtube.svg", field: "youtubeUrl" },
] as const;

export interface SocialLink {
  label: string;
  src: string;
  href: string;
}

/** The networks the shop has a profile on, in the design's order. */
export function socialLinks(contact: StoreContact): SocialLink[] {
  return SOCIALS.flatMap(({ field, ...social }) => {
    const href = contact[field];
    return href ? [{ ...social, href }] : [];
  });
}
