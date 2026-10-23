import type { StoreContact } from "@my-ecommerce/shared";
import { SocialLinks } from "@/components/social-links";
import type { Messages } from "@/lib/i18n/messages";
import { socialLinks, telHref, whatsappHref } from "@/lib/store-contact";

/**
 * The Contact page's "Get in Touch" column (Figma 178:7751): a 35/52.5
 * heading, the ways of reaching the shop 24px apart (the first 20.5px under the
 * heading), and the social links in a 30px band below.
 *
 * Every value comes from the admin's Contact → Info screen, and a line the
 * shop has left empty is left out rather than drawn as a bare label.
 *
 * The design marks the email and WhatsApp lines with ✉️ in a #F2F5F7 chip —
 * the same envelope on both, which reads as a slip on the WhatsApp line, so
 * that one carries 💬 in the same chip. The phone, email and WhatsApp values
 * are links; the design underlines only the first two, and the third is
 * underlined to match, since it is as much a link as they are.
 */
export function ContactDetails({
  contact,
  messages,
}: {
  contact: StoreContact;
  messages: Messages["contactPage"];
}) {
  const lines = [
    contact.phone && (
      <>
        <Glyph>📞</Glyph> {messages.tel}{" "}
        <a href={telHref(contact.phone)} className={LINK}>
          {contact.phone}
        </a>
      </>
    ),
    contact.email && (
      <>
        <Chip>✉️</Chip> {messages.emailLabel}{" "}
        <a href={`mailto:${contact.email}`} className={LINK}>
          {contact.email}
        </a>
      </>
    ),
    contact.whatsapp && (
      <>
        <Chip>💬</Chip> {messages.whatsapp}{" "}
        <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className={LINK}>
          {contact.whatsapp}
        </a>
      </>
    ),
    contact.address && (
      <>
        <Glyph>📍</Glyph> {messages.address} {contact.address}
      </>
    ),
  ].filter(Boolean);

  return (
    <div>
      <h2 className="text-[35px] leading-[52.5px] font-bold tracking-[0.380px] text-ink">
        {messages.getInTouch}
      </h2>

      {lines.length > 0 && (
        <ul className={`pt-[20.5px] ${LINE}`}>
          {lines.map((line, index) => (
            <li key={index} className="not-first:pt-[24px]">
              {line}
            </li>
          ))}
        </ul>
      )}

      <SocialLinks links={socialLinks(contact)} label={messages.social} className="py-[30px]" />
    </div>
  );
}

/** What the column shows while the details are read — the heading alone. */
export function ContactDetailsFallback({ messages }: { messages: Messages["contactPage"] }) {
  return (
    <div>
      <h2 className="text-[35px] leading-[52.5px] font-bold tracking-[0.380px] text-ink">
        {messages.getInTouch}
      </h2>
    </div>
  );
}

const LINE = "text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink";
const LINK = "underline underline-offset-2 hover:opacity-70";

function Glyph({ children }: { children: string }) {
  return <span aria-hidden>{children}</span>;
}

/** The design's 27.9 × 24.6 chip, 4px in from the line's start. */
function Chip({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="ml-[4px] inline-flex h-[24.6px] w-[27.9px] shrink-0 items-center justify-center rounded-[3px] bg-mist align-middle text-[14px]"
    >
      {children}
    </span>
  );
}
