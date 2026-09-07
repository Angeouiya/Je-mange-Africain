CREATE TABLE IF NOT EXISTS "OrderBatchAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderBatchAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderBatchAllocation_orderId_productId_idx"
    ON "OrderBatchAllocation"("orderId", "productId");

CREATE INDEX IF NOT EXISTS "OrderBatchAllocation_batchId_idx"
    ON "OrderBatchAllocation"("batchId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'OrderBatchAllocation_orderId_fkey'
    ) THEN
        ALTER TABLE "OrderBatchAllocation"
            ADD CONSTRAINT "OrderBatchAllocation_orderId_fkey"
            FOREIGN KEY ("orderId") REFERENCES "Order"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'OrderBatchAllocation_productId_fkey'
    ) THEN
        ALTER TABLE "OrderBatchAllocation"
            ADD CONSTRAINT "OrderBatchAllocation_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'OrderBatchAllocation_batchId_fkey'
    ) THEN
        ALTER TABLE "OrderBatchAllocation"
            ADD CONSTRAINT "OrderBatchAllocation_batchId_fkey"
            FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DROP INDEX IF EXISTS "User_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
