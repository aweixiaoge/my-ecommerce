"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { CartAddSchema, CartLineUpdateSchema } from "@my-ecommerce/shared";
import { addToCart, updateCartLine } from "@/lib/cart/cart-repo";
import { CART_COOKIE, CART_COOKIE_OPTIONS } from "@/lib/cart/cart-token";

/**
 * What the "Add to cart" buttons and the cart page's controls do.
 *
 * Thin on purpose, like the storefront's other actions: the rules are the
 * shared schema's, the writes are the repository's, and all this adds is the
 * request — reading the form and the cookie, and setting the cookie back.
 *
 * Both end in `refresh()`. Setting a cookie already makes Next re-render the
 * page, but an add to an existing cart can leave the cookie byte-for-byte the
 * same, and the header's badge has to move either way.
 */

/**
 * What an add said, for the button that asked.
 *
 * A status code rather than a sentence: the button holds its own catalog and
 * says it in the reader's language — the review form's actions do the same.
 * `quantity` is the line's total after the add, which is what "only N in
 * stock" needs.
 */
export interface AddToCartState {
  status: "added" | "limited" | "outOfStock" | "unavailable" | "failed";
  quantity?: number;
}

export async function addToCartAction(
  _prevState: AddToCartState | undefined,
  formData: FormData,
): Promise<AddToCartState> {
  const parsed = CartAddSchema.safeParse({
    variantId: field(formData, "variantId"),
    productId: field(formData, "productId"),
    optionValueId: field(formData, "optionValueId"),
    quantity: field(formData, "quantity"),
  });
  // Only a hand-written POST gets here: the buttons always send one id.
  if (!parsed.success) return { status: "unavailable" };

  const jar = await cookies();

  let result;
  try {
    result = await addToCart(jar.get(CART_COOKIE)?.value, parsed.data);
  } catch (error) {
    console.error("Adding to the cart failed:", error);
    return { status: "failed" };
  }

  if (result.status === "added" || result.status === "limited") {
    jar.set(CART_COOKIE, result.token, CART_COOKIE_OPTIONS);
    refresh();
    return { status: result.status, quantity: result.quantity };
  }

  return { status: result.status };
}

/**
 * The cart page's "−", "+" and "Remove": each a submit button carrying the
 * quantity it means, so they work before any JavaScript has loaded.
 *
 * Nothing to report back. The page re-renders with the line as it now is, and
 * a line held back by stock says so itself (`unavailableReason`).
 */
export async function updateCartLineAction(formData: FormData): Promise<void> {
  const parsed = CartLineUpdateSchema.safeParse({
    itemId: field(formData, "itemId"),
    quantity: field(formData, "quantity"),
  });
  if (!parsed.success) return;

  try {
    await updateCartLine((await cookies()).get(CART_COOKIE)?.value, parsed.data);
  } catch (error) {
    // The page re-renders as it was, which is the truth: nothing changed.
    console.error("Changing a cart line failed:", error);
  }

  refresh();
}

/**
 * A form field, as the schemas want it: a missing field is `undefined`, not
 * the `null` that `FormData.get` returns, so `.optional()` and `.default()`
 * mean what they say.
 */
function field(formData: FormData, name: string): FormDataEntryValue | undefined {
  return formData.get(name) ?? undefined;
}
