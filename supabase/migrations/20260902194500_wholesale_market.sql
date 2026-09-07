ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "profitMargin" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "isWholesale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wholesalePackLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "wholesaleUnitsPerPack" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "wholesaleMinPacks" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "wholesaleTier2MinPacks" INTEGER,
  ADD COLUMN IF NOT EXISTS "wholesaleTier2Price" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "wholesaleTier3MinPacks" INTEGER,
  ADD COLUMN IF NOT EXISTS "wholesaleTier3Price" DECIMAL(65,30);

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "salesChannel" TEXT NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "Product_status_isWholesale_idx" ON "Product"("status", "isWholesale");

UPDATE "Product"
SET
  "isWholesale" = true,
  "wholesalePackLabel" = 'Carton de 6 unités',
  "wholesaleUnitsPerPack" = 6,
  "wholesaleMinPacks" = 1,
  "wholesalePrice" = ROUND(GREATEST(COALESCE("costPrice", "price" * 0.65) * 6 * 1.05, "price" * 6 * 0.92), 2),
  "wholesaleTier2MinPacks" = 5,
  "wholesaleTier2Price" = ROUND(GREATEST(COALESCE("costPrice", "price" * 0.65) * 6 * 1.03, GREATEST(COALESCE("costPrice", "price" * 0.65) * 6 * 1.05, "price" * 6 * 0.92) * 0.97), 2),
  "wholesaleTier3MinPacks" = 10,
  "wholesaleTier3Price" = ROUND(GREATEST(COALESCE("costPrice", "price" * 0.65) * 6 * 1.01, GREATEST(COALESCE("costPrice", "price" * 0.65) * 6 * 1.05, "price" * 6 * 0.92) * 0.94), 2)
WHERE "status" = 'published' AND ("isBestseller" = true OR "isRecommended" = true);
