ALTER TABLE "WholesaleQuote" ADD COLUMN "customerId" TEXT;

UPDATE "WholesaleQuote" AS quote
SET "customerId" = customer."id"
FROM "Customer" AS customer
INNER JOIN "User" AS account ON account."id" = customer."userId"
WHERE quote."customerId" IS NULL
  AND LOWER(quote."email") = LOWER(account."email")
  AND account."role" = 'customer';

CREATE INDEX "WholesaleQuote_customerId_createdAt_idx" ON "WholesaleQuote"("customerId", "createdAt");

ALTER TABLE "WholesaleQuote"
  ADD CONSTRAINT "WholesaleQuote_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
