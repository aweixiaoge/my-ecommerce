-- CreateTable
CREATE TABLE "store_contact" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_contact_pkey" PRIMARY KEY ("id")
);

-- The shop's one row, with the values the Contact page was first drawn with.
-- The social links start empty: until they are set in the admin, the
-- storefront shows no icon rather than one that leads nowhere.
INSERT INTO "store_contact" ("id", "phone", "email", "whatsapp", "address", "updated_at")
VALUES (1, '+1 234 567 890', 'info@meridian.com', '0086-18823456748', '123 Main St, Shenzhen City, China', CURRENT_TIMESTAMP);
