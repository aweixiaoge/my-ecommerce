import type { Metadata } from "next";
import { connection } from "next/server";
import { listContactMessages } from "@/lib/admin/contact-messages-repo";
import { formatDate } from "@/lib/format";

/**
 * Contact → Message: everything sent through the storefront's Contact form,
 * newest first.
 *
 * Read-only. The sender's address is a `mailto:` link, so a reply is one click
 * — and the language column says which language to write it in.
 *
 * It reads the database at request time, like the other admin lists: a message
 * sent a moment ago has to be on the screen when it is opened.
 */
export const metadata: Metadata = {
  title: "Message",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminContactMessagesPage() {
  await connection();

  const messages = await listContactMessages();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Message
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {messages.length === 1 ? "1 message." : `${messages.length} messages.`}
        </p>
      </div>

      {messages.length === 0 ? (
        <p className="text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Nobody has written in yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Every message sent through the storefront&apos;s Contact form, newest first.
          </caption>

          <thead>
            <tr className="border-b border-line">
              <Th>From</Th>
              <Th>Subject</Th>
              <Th>Message</Th>
              <Th>Language</Th>
              <Th>Received</Th>
            </tr>
          </thead>

          <tbody>
            {messages.map((message) => (
              <tr key={message.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 text-[13px] leading-[21.45px]">
                  <span className="block font-medium text-ink">{message.name}</span>
                  <a
                    href={`mailto:${message.email}`}
                    className="text-ink-62 underline underline-offset-2 hover:text-ink"
                  >
                    {message.email}
                  </a>
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink">
                  {message.subject ?? <span className="text-ink-55">—</span>}
                </td>
                <td className="max-w-[480px] py-3 pr-4 text-[13px] leading-[21.45px] break-words whitespace-pre-wrap text-ink-62">
                  {message.message}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 uppercase">
                  {message.locale}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] whitespace-nowrap text-ink-62">
                  {formatDate(message.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
