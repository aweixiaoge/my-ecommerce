import { z } from "zod";

/**
 * Money crosses the wire as a decimal STRING, never a JSON number.
 *
 * JSON has no decimal type. `19.99` sent as a number becomes a binary float on
 * arrival, which is exactly the precision loss the database's `numeric` column
 * exists to prevent. The string is the contract; parse it into Decimal on the
 * server and format it for display in the UI — never do arithmetic on it in
 * JavaScript.
 */
export const MoneySchema = z.object({
  amount: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, "amount must be a decimal string, e.g. \"19.99\""),
  currency: z.string().length(3),
});

export type Money = z.infer<typeof MoneySchema>;
