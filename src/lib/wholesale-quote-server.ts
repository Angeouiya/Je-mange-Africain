export function projectWholesaleQuote(quote: {
  id: string;
  reference: string;
  status: string;
  locale: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  postalCode: string;
  deliveryRequirements: string;
  additionalNeeds: string | null;
  estimatedSubtotal: unknown;
  totalPacks: number;
  currency: string;
  adminNote: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    productNameFr: string;
    productNameEn: string;
    sku: string;
    imageUrl: string | null;
    packLabel: string;
    packs: number;
    unitsPerPack: number;
    unitPrice: unknown;
    lineTotal: unknown;
    thermalClass: string;
  }>;
}) {
  return {
    ...quote,
    estimatedSubtotal: Number(quote.estimatedSubtotal),
    items: quote.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })),
  };
}

export function projectCustomerWholesaleQuote(quote: Parameters<typeof projectWholesaleQuote>[0]) {
  return {
    id: quote.id,
    reference: quote.reference,
    status: quote.status,
    locale: quote.locale,
    company: quote.company,
    contactName: quote.contactName,
    email: quote.email,
    phone: quote.phone,
    country: quote.country,
    postalCode: quote.postalCode,
    deliveryRequirements: quote.deliveryRequirements,
    additionalNeeds: quote.additionalNeeds,
    estimatedSubtotal: Number(quote.estimatedSubtotal),
    totalPacks: quote.totalPacks,
    currency: quote.currency,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    items: quote.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameFr: item.productNameFr,
      productNameEn: item.productNameEn,
      sku: item.sku,
      imageUrl: item.imageUrl,
      packLabel: item.packLabel,
      packs: item.packs,
      unitsPerPack: item.unitsPerPack,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      thermalClass: item.thermalClass,
    })),
  };
}
