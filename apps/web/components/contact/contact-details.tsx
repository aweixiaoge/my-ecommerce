import type { ReactNode } from "react";
import type { StoreContact } from "@my-ecommerce/shared";
import { LineIcon } from "@/components/line-icon";
import { SocialLinks } from "@/components/social-links";
import type { Messages } from "@/lib/i18n/messages";
import { socialLinks, telHref, whatsappHref } from "@/lib/store-contact";

/**
 * The Contact page's "Get in Touch" column (Figma 178:7751): a serif heading
 * over the short gold rule, the ways of reaching the shop ruled off from one
 * another, and the social links below.
 *
 * Every value comes from the admin's Contact → Info screen, and a line the
 * shop has left empty is left out rather than drawn as a bare label.
 *
 * The design marks each line with an emoji (📞, ✉️ in a chip, 📍). Those are
 * drawn here as thin gold line icons instead — an emoji renders in the
 * platform's own colour and style, which no amount of type around it can make
 * sit quietly. Each label is set as small tracked capitals above its value.
 *
 * No panel of its own: the form beside it sits on the page, so this column
 * does too, divided from it by a hairline once the two are side by side.
 */
export function ContactDetails({
  contact,
  messages,
}: {
  contact: StoreContact;
  messages: Messages["contactPage"];
}) {
  const lines: { key: string; icon: ReactNode; label: string; value: ReactNode }[] = [];

  if (contact.phone) {
    lines.push({
      key: "tel",
      icon: <PhoneIcon />,
      label: messages.tel,
      value: (
        <a href={telHref(contact.phone)} className={LINK}>
          {contact.phone}
        </a>
      ),
    });
  }
  if (contact.email) {
    lines.push({
      key: "email",
      icon: <MailIcon />,
      label: messages.emailLabel,
      value: (
        <a href={`mailto:${contact.email}`} className={LINK}>
          {contact.email}
        </a>
      ),
    });
  }
  if (contact.whatsapp) {
    lines.push({
      key: "whatsapp",
      icon: <ChatIcon />,
      label: messages.whatsapp,
      value: (
        <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className={LINK}>
          {contact.whatsapp}
        </a>
      ),
    });
  }
  if (contact.address) {
    lines.push({ key: "address", icon: <PinIcon />, label: messages.address, value: contact.address });
  }

  return (
    <div className={COLUMN}>
      <Heading>{messages.getInTouch}</Heading>

      {lines.length > 0 && (
        <ul className="pt-[28px]">
          {lines.map((line) => (
            <li
              key={line.key}
              className="grid grid-cols-[36px_1fr] items-center gap-x-5 py-[20px] not-first:border-t not-first:border-line first:pt-0"
            >
              <span aria-hidden className="text-gold">
                {line.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">
                  {bareLabel(line.label)}
                </p>
                <p className="pt-1 text-[15px] leading-[26px] [overflow-wrap:anywhere] text-ink">{line.value}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Twice the footer's icons, in the gold of the lines above. */}
      <SocialLinks
        links={socialLinks(contact)}
        label={messages.social}
        size={30}
        className="gap-[24px] pt-[28px] [&_a]:text-gold [&_a]:transition-colors [&_a]:duration-300 [&_a:hover]:text-ink"
      />
    </div>
  );
}

/** What the column shows while the details are read — the heading alone. */
export function ContactDetailsFallback({ messages }: { messages: Messages["contactPage"] }) {
  return (
    <div className={COLUMN}>
      <Heading>{messages.getInTouch}</Heading>
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <>
      <h2 className="font-display text-[30px] leading-[38px] font-normal text-ink">{children}</h2>
      <div aria-hidden className="mt-4 h-px w-8 bg-gold/50" />
    </>
  );
}

/**
 * The catalog writes each label as it once ran inline before its value —
 * "tel:", "email:" — so the trailing colon goes now that the label sits on a
 * line of its own. Full-width colons too, for the languages that use them.
 */
function bareLabel(label: string) {
  return label.replace(/\s*[:：]\s*$/, "");
}

const COLUMN = "h-full bar:border-l bar:border-line bar:pl-[56px]";
const LINK = "underline decoration-gold underline-offset-4 transition-colors hover:decoration-ink";

/** The contact lines' icons, drawn at 36px — see `LineIcon`. */
function Icon({ children }: { children: ReactNode }) {
  return <LineIcon size={36}>{children}</LineIcon>;
}

function PhoneIcon() {
  return (
    <Icon>
      <path d="M4.5 2.5h3l1.5 4-2 1.25a9 9 0 0 0 5.25 5.25L13.5 11l4 1.5v3a1.5 1.5 0 0 1-1.5 1.5A13.5 13.5 0 0 1 3 4a1.5 1.5 0 0 1 1.5-1.5Z" />
    </Icon>
  );
}

function MailIcon() {
  return (
    <Icon>
      <rect x="2.5" y="4.5" width="15" height="11" rx="0.5" />
      <path d="m3 5 7 6 7-6" />
    </Icon>
  );
}

function ChatIcon() {
  return (
    <Icon>
      <path d="M17.5 9.5a7 6.5 0 0 1-10.4 5.7L3 16.5l1.3-3.5A6.3 6.3 0 0 1 3.5 9.5a7 6.5 0 0 1 14 0Z" />
    </Icon>
  );
}

function PinIcon() {
  return (
    <Icon>
      <path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
      <circle cx="10" cy="8" r="2" />
    </Icon>
  );
}
