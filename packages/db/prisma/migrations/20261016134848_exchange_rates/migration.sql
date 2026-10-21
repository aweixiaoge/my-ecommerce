-- CreateTable
CREATE TABLE "exchange_rates" (
    "base_currency" CHAR(3) NOT NULL,
    "quote_currency" CHAR(3) NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "source" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("base_currency","quote_currency")
);

-- The rates the storefront launches with.
--
-- Written by hand into the migration rather than left to a seed script, because
-- the feature that reads them ships with them: a checkout that has run its
-- migrations has a currency switcher that offers EUR and GBP, and one that has
-- not has no rows and so offers nothing. `source` says where the numbers came
-- from — `seed` is not a provider — and `fetched_at` is the day they were
-- pinned. Phase 9 replaces them from a provider on a schedule (plan.md).
--
-- 1 USD buys 0.92 EUR and 0.79 GBP.
INSERT INTO "exchange_rates" ("base_currency", "quote_currency", "rate", "source", "fetched_at")
VALUES
    ('USD', 'EUR', 0.92, 'seed', '2026-10-16 00:00:00'),
    ('USD', 'GBP', 0.79, 'seed', '2026-10-16 00:00:00');
