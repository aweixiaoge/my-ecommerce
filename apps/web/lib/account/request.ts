import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sessionCustomer, type AccountCustomer } from "./account-repo";
import { ACCOUNT_COOKIE } from "./session-token";

/**
 * Who one request is signed in as, or null.
 *
 * The cart's `requestCart`, for a session: `React.cache` so one request asks
 * once, and `connection()` before the clock is read, because whether a
 * session has expired is a question about now.
 */
export const requestCustomer = cache(async (): Promise<AccountCustomer | null> => {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;

  await connection();

  return sessionCustomer(token);
});
