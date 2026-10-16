# Ecommerce Platform — Plan

Self-built B2C store. No commerce platform, no managed backend. Frontend and
backend are separate deployments.

## Stack

| Layer | Choice |
| :--- | :--- |
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind |
| UI kit | shadcn/ui (admin-heavy) |
| Backend | Node.js + TypeScript + Fastify |
| Database | PostgreSQL |
| Data access | Prisma |
| Validation | Zod, schemas shared between both apps |
| Auth | Server-side sessions, httpOnly cookies, bcrypt |
| Payments | Stripe |
| Hosting | Single VPS, Docker Compose |

Monorepo layout:

```
apps/web      Next.js storefront + admin
apps/api      Fastify API
packages/shared   Zod schemas, types, money helpers
migrations/   Prisma migrations
```

## Requirements

Storefront: login/register · products · cart · checkout · blog · contact ·
smart customer service · admin · responsive (desktop web / mobile web / tablet) ·
SEO · multi-language · currency switcher · reviews · coupons · orders

---

## Decisions that are expensive to reverse

These are the ones to get right now. Everything else can move.

**1. Multi-language is a schema decision, not a feature.** Every user-facing
text field gets a translation side table. Use `(entity_id, locale)` tables, not
JSONB columns — you need per-locale indexes for search and the ability to add a
locale without touching existing rows.

**2. Slugs live in the translation table.** German pages get German URLs.
`/de/damen-schuhe` outranks `/de/products/womens-shoes` for German queries.
One slug per locale, unique within a locale.

**3. Money is `Decimal` + an explicit currency code.** Never `Float`. Prisma
returns `Decimal` objects (decimal.js) — do arithmetic in `Decimal` and never
call `.toNumber()` on a monetary value. Store the currency alongside every
amount so the row is self-describing.

**4. Orders snapshot everything.** Product name, SKU, options, price, and both
addresses are copied onto the order at purchase time. Orders must render
correctly ten years after a product is renamed or deleted. Never join an order
to a live product to display it.

**5. Record the exchange rate on the order.** Display currency, charged
currency, and the rate used. Without the rate you cannot reconcile the order
later.

**6. Admin identity is separate from customer identity.** A different table, a
different session, a different login route. A customer must never be one flag
away from admin access.

**7. Nothing referenced by an order is ever hard-deleted.** Products and
variants get a status. Deletion is archival.

**8. Inventory decrements are atomic.** A conditional update, never
read-then-write. See below.

**9. Order numbers are separate from primary keys.** Human-facing
`ORD-2026-0001`, never an exposed sequential ID.

---

## Data model

### Catalog

| Table | Key columns |
| :--- | :--- |
| `products` | id, status (draft/active/archived), created_at, updated_at |
| `product_translations` | product_id, locale, name, slug, description, meta_title, meta_description |
| `product_variants` | id, product_id, sku (unique), price_amount, price_currency, stock, weight, status |
| `product_options` | id, product_id, position — "Size", "Colour" |
| `product_option_translations` | option_id, locale, name |
| `product_option_values` | id, option_id, position |
| `product_option_value_translations` | value_id, locale, name |
| `variant_option_values` | variant_id, option_value_id |
| `categories` | id, parent_id, position |
| `category_translations` | category_id, locale, name, slug, description, meta_* |
| `product_categories` | product_id, category_id |
| `featured_products` | product_id — the home page's featured set |
| `media` | id, product_id, variant_id, blog_id, url, position |
| `media_translations` | media_id, locale, alt — alt text is an SEO field, translate it |

Unique constraints: `(entity_id, locale)` on every translation table, and
`(locale, slug)` on each of them too — a slug is unique within a locale, per
entity.

`stock` lives on the variant. If you later need per-warehouse inventory, a
separate `inventory` table appears and `stock` becomes a derived total.

### Customers and auth

| Table | Key columns |
| :--- | :--- |
| `customers` | id, email (citext, unique), password_hash, first_name, last_name, locale, preferred_currency, email_verified_at |
| `sessions` | id, customer_id, token_hash, expires_at, ip, user_agent |
| `addresses` | id, customer_id, kind (shipping/billing), name, line1, line2, city, region, postal_code, country_code, phone |
| `admin_users` | id, email, password_hash, role — **separate table** |

### Cart

| Table | Key columns |
| :--- | :--- |
| `carts` | id, customer_id (nullable), token (guest), currency, locale, expires_at |
| `cart_items` | cart_id, variant_id, quantity |

Cart prices are **recomputed from the variant on every read**. The cart is a
list of intent, not a list of prices. Guest carts merge into the customer's
cart on login.

### Orders

| Table | Key columns |
| :--- | :--- |
| `orders` | id, order_number, customer_id, email, status, currency, display_currency, exchange_rate, subtotal, discount_total, shipping_total, tax_total, grand_total, idempotency_key, paid_at, created_at |
| `order_items` | order_id, variant_id, product_snapshot (jsonb), quantity, unit_price, line_total, tax_amount, discount_amount |
| `order_addresses` | order_id, kind, name, line1, line2, city, region, postal_code, country_code, phone — denormalised copy |
| `order_status_history` | order_id, from_status, to_status, changed_at, actor, note |
| `shipments` | order_id, carrier, tracking_number, shipped_at, delivered_at |
| `payments` | order_id, provider, provider_ref, amount, currency, status |
| `refunds` | order_id, payment_id, amount, reason, created_at |

`product_snapshot` holds name, SKU, and option values as they were at purchase.

### Order state machine

```
pending ──► paid ──► processing ──► shipped ──► delivered
   │          │            │
   └──► failed└──► cancelled└──► refunded (partial or full)
```

- `pending → paid` — **only** from a Stripe webhook. Never from a browser redirect.
- Webhook handlers are idempotent; Stripe retries and fires duplicates.
- `cancelled` before `paid` releases inventory. After `paid` it requires a refund.
- Every transition writes to `order_status_history`.

### Discounts (coupons)

| Table | Key columns |
| :--- | :--- |
| `discounts` | id, code (citext, unique), kind (percentage/fixed/free_shipping), value, currency, min_subtotal, starts_at, ends_at, usage_limit, usage_limit_per_customer, scope, status |
| `discount_products` / `discount_categories` | scoping joins |
| `discount_redemptions` | discount_id, order_id, customer_id, redeemed_at |

Redemptions are recorded at order creation, not at cart-apply time, so an
abandoned cart cannot burn a limited coupon.

### Reviews

| Table | Key columns |
| :--- | :--- |
| `reviews` | id, product_id, customer_id, order_item_id, rating, title, body, locale, status (pending/approved/rejected), created_at |
| `review_media` | review_id, url |
| `product_review_stats` | product_id, average_rating, review_count — denormalised for listing pages |

`order_item_id` is how a review becomes a verified purchase. Reviews carry a
`locale` — they are user content and are not translated.

### Content

| Table | Key columns |
| :--- | :--- |
| `blogs` | id, category_id — the plan's `status`, `author_id` and `published_at` arrive with the screens that write them; the cover is the first of the post's images rather than a column |
| `blog_translations` | blog_id, locale, title, slug, short_description, description, meta_* |
| `blog_categories` | id, created_at, updated_at |
| `blog_category_translations` | category_id, locale, name, slug, description, meta_* |
| `contact_messages` | id, name, email, subject, message, locale, status |

The blog tables are what the admin writes today, and what the storefront's
journal reads through `apps/web/lib/blog/blog-repo.ts`. That module's
`BlogPostSummary` is still local to it; moving the type into the shared contract
is Phase 7's job.

### i18n and currency infrastructure

| Table | Key columns |
| :--- | :--- |
| `locales` | code, name, is_default, is_active |
| `currencies` | code, symbol, decimal_places, rounding_mode |
| `exchange_rates` | base_currency, quote_currency, rate, source, fetched_at |

### Support and audit

| Table | Key columns |
| :--- | :--- |
| `chat_conversations` | id, customer_id (nullable), session_token, locale |
| `chat_messages` | conversation_id, role, content, created_at |
| `audit_log` | actor_id, actor_type, action, entity, entity_id, diff, at |

---

## Correctness rules

Non-negotiable, and each one is a bug that ships in real stores.

**Atomic inventory decrement.** Prisma can do this correctly; the naive version
oversells.

```ts
// CORRECT — the check and the write are one statement
const result = await prisma.productVariant.updateMany({
  where: { id: variantId, stock: { gte: quantity } },
  data:  { stock: { decrement: quantity } },
});
if (result.count === 0) throw new OutOfStockError();

// WRONG — read, check, write. Oversells under concurrency.
```

**Server computes every price.** The client sends variant ids and quantities.
It never sends prices, discounts, or totals.

**The webhook is the payment truth.** Confirmation comes from Stripe's webhook,
verified by signature, handled idempotently. The browser redirect is cosmetic.

**Checkout is idempotent.** The order is keyed by an `idempotency_key` so a
double-submitted checkout creates one order, not two.

**Inventory is reserved, not decremented at browse time.** Decide the policy:
decrement at order creation, or hold a reservation with an expiry. Pick one and
write it down.

**Tax is not the display currency's problem.** Tax follows the buyer's location
and your registrations, never the currency dropdown.

---

## Phases

Each phase ends with something deployable.

**Phase 0 — Foundation.** Monorepo, pnpm workspaces, Next.js app, Fastify API,
Postgres via Docker Compose, Prisma initialised, health endpoint, shared Zod
package. *Done when:* `docker compose up` gives a working API and a storefront
that talks to it.

**Phase 1 — Catalog.** Products, variants, options, categories, media, all
translation tables. Admin CRUD for each. *Done when:* you can add a real product
with variants and images through the admin and see it on the storefront.

**Phase 2 — Cart and checkout.** Session carts, cart merge on login, Stripe
Payment Intents, webhook, order creation with idempotency, the state machine up
to `paid`. *Done when:* a test-mode purchase creates exactly one correct order.

**Phase 3 — Accounts.** Register/login/logout, sessions, order history, saved
addresses. *Done when:* a customer can buy, then log in and see it.

**Phase 4 — Order management.** Admin order list and detail, status transitions,
shipments and tracking, refunds. *Done when:* you can fulfil an order end to end
from the admin.

**Phase 5 — Reviews and coupons.** Reviews with verified-purchase detection and
moderation; discount engine with limits and scoping. *Done when:* a coupon
applies at checkout and a review appears on the product page.

**Phase 6 — SEO.** Structured data (Product, Offer, BreadcrumbList), sitemap,
robots, canonicals, Open Graph, image optimisation, Core Web Vitals on mobile.

**Phase 7 — Content.** Blog and contact form.

**Phase 8 — Second language live.** Roll out the locale end to end, including
`hreflang` on every page. The schema was ready in Phase 1; this is content,
routing, and `next-intl`.

**Phase 9 — Currency switcher.** Rate provider, scheduled updates, per-currency
rounding, rate fixed at checkout, rate recorded on the order.

**Phase 10 — Smart customer service.** Retrieval over product and policy
content. Build with real content present, which is why it is last.

**Phase 11 — Hardening.** Rate limiting, backups and a tested restore, error
monitoring, security pass, load check on category pages.

---

## Known scope

Roughly four to six months of solo work to Phase 6, which is the first phase
that resembles a launchable store. Phases 7–11 add several more.

The schema is translation- and currency-ready from Phase 1, but the *features*
are deliberately late. Launch with one language and one currency, both
plumbing-ready, rather than three languages live and no store.
