"use server";

import { redirect } from "next/navigation";
import { AdminProductCreateSchema } from "@my-ecommerce/shared";
import { createProduct } from "@/lib/mock/admin-products";

/**
 * Creating a product.
 *
 * Thin on purpose, like the sign-in action: the rules are the shared schema's,
 * and the store is the mock's. All this adds is the two things that need a
 * request — reading the form, and the redirect on success.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so everything is re-derived from `formData` and validated
 * before a single field reaches the store.
 */

export interface ProductFormState {
  errors?: {
    name?: string[];
    shortDescription?: string[];
    description?: string[];
    attributes?: string[];
  };
  message?: string;
}

export async function createProductAction(
  _prevState: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState | undefined> {
  const parsed = AdminProductCreateSchema.safeParse({
    // `?? ""` for the fields a draft may leave blank: a form that submitted
    // without them is not an error, it is an empty description.
    name: formData.get("name") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    attributes: readAttributes(formData.get("attributes")),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  await createProduct(parsed.data);

  // Outside any try/catch — `redirect` signals by throwing.
  redirect("/admin/products");
}

/**
 * The attributes arrive as one JSON field because they are structured, and a
 * form can only send strings. Anything unreadable becomes `null`, which the
 * schema refuses — the alternative, throwing here, would turn a tampered field
 * into a 500 instead of a message.
 */
function readAttributes(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw === "") return [];

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Validation issues as messages a person can act on.
 *
 * The copy lives here rather than in the shared schema for the reason given in
 * `lib/admin/authenticate.ts`: the schema is the contract both apps validate
 * against, and UI strings are not its business — least of all when the
 * storefront is heading for multi-language (plan.md, decision 1).
 */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[]; message?: string }[],
): ProductFormState["errors"] {
  const errors: NonNullable<ProductFormState["errors"]> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (
      field !== "name" &&
      field !== "shortDescription" &&
      field !== "description" &&
      field !== "attributes"
    ) {
      continue;
    }

    (errors[field] ??= []).push(messageFor(field, issue));
  }

  return errors;
}

function messageFor(
  field: "name" | "shortDescription" | "description" | "attributes",
  issue: { code: string; message?: string },
): string {
  switch (field) {
    case "name":
      return issue.code === "too_big" ? "Name is too long." : "Enter a name.";
    case "shortDescription":
      return "Short description is too long.";
    case "description":
      return "Description is too long.";
    case "attributes":
      // `custom` is a refinement we wrote, and its message is already written
      // for a person — "Values must be unique." Zod's own codes are not, so
      // they get one message that says what to check.
      return issue.code === "custom" && issue.message
        ? issue.message
        : "The attributes are not valid. Check the values and try again.";
  }
}
