CREATE TABLE "WholesaleQuote" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "company" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "deliveryRequirements" TEXT NOT NULL,
  "additionalNeeds" TEXT,
  "estimatedSubtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalPacks" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "adminNote" TEXT,
  "assignedTo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WholesaleQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WholesaleQuoteItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productNameFr" TEXT NOT NULL,
  "productNameEn" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "imageUrl" TEXT,
  "packLabel" TEXT NOT NULL,
  "packs" INTEGER NOT NULL,
  "unitsPerPack" INTEGER NOT NULL,
  "unitPrice" DECIMAL(65,30) NOT NULL,
  "lineTotal" DECIMAL(65,30) NOT NULL,
  "thermalClass" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WholesaleQuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WholesaleQuote_reference_key" ON "WholesaleQuote"("reference");
CREATE INDEX "WholesaleQuote_status_createdAt_idx" ON "WholesaleQuote"("status", "createdAt");
CREATE INDEX "WholesaleQuote_email_createdAt_idx" ON "WholesaleQuote"("email", "createdAt");
CREATE INDEX "WholesaleQuoteItem_quoteId_idx" ON "WholesaleQuoteItem"("quoteId");
CREATE INDEX "WholesaleQuoteItem_productId_idx" ON "WholesaleQuoteItem"("productId");

ALTER TABLE "WholesaleQuoteItem"
  ADD CONSTRAINT "WholesaleQuoteItem_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "WholesaleQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
