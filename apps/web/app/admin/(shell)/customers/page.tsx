import type { Metadata } from "next";
import { connection } from "next/server";
import { listCustomers } from "@/lib/admin/customers-repo";
import { formatDate } from "@/lib/format";

/**
 * The customer list.
 *
 * Every account opened through the storefront's register form, newest first.
 * Read-only for now: a customer's details are theirs to edit from My account,
 * and the screens that act on an account arrive when there is something for
 * the shop to do to one.
 *
 * It reads the database at request time, like the other admin lists: a list
 * showing who signed up a moment ago is the point of it.
 */
export const metadata: Metadata = {
  title: "Customer",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminCustomersPage() {
  await connection();

  const customers = await listCustomers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Customer
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {customers.length === 1 ? "1 customer." : `${customers.length} customers.`}
        </p>
      </div>

      {customers.length === 0 ? (
        <p className="text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Nobody has registered yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Every customer registered on the storefront, newest first.
          </caption>

          <thead>
            <tr className="border-b border-line">
              <Th>Email</Th>
              <Th>Language</Th>
              <Th>Orders</Th>
              <Th>Registered</Th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                  {customer.email}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 uppercase">
                  {customer.locale}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {customer.orderCount}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                  {formatDate(customer.createdAt)}
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
