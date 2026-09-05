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
