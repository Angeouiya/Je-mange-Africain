import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { calculateShippingQuote, type DeliveryService } from "@/lib/shipping";

export interface CheckoutPricingItem {
  productId: string;
  qty: number;
  recipeId?: string;
  recipeNameFr?: string;
  recipeNameEn?: string;
}

export interface PricedCheckoutItem {
  productId: string;
  nameFr: string;
  nameEn: string;
  sku: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  thermalClass: string;
  imageUrl: string | null;
  recipeId: string | null;
  recipeNameFr: string | null;
  recipeNameEn: string | null;
  packWeightGrams: number;
}

export class CheckoutPricingError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function priceCheckout(input: {
  items: CheckoutPricingItem[];
  country: string;
  postalCode?: string;
  deliveryService?: DeliveryService;
  coupon?: string | null;
  locale?: "fr" | "en";
}) {
  const isFr = input.locale !== "en";
  if (!Array.isArray(input.items) || input.items.length === 0) throw new CheckoutPricingError(isFr ? "Panier vide." : "The basket is empty.");
  if (input.items.length > 80) throw new CheckoutPricingError(isFr ? "Le panier contient trop de lignes." : "The basket contains too many lines.");

  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!item.productId || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      throw new CheckoutPricingError(isFr ? "Une quantité du panier est invalide." : "A basket quantity is invalid.");
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.qty);
  }

  const productIds = [...quantities.keys()];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, status: "published" },
    include: { translations: true },
  });
  if (products.length !== productIds.length) throw new CheckoutPricingError(isFr ? "Un produit du panier n'est plus disponible." : "A product in the basket is no longer available.", 409);

  const requestedByProduct = new Map(input.items.map((item) => [item.productId, item]));
  const thermalSet = new Set<string>();
  const validatedItems: PricedCheckoutItem[] = [];
  let subtotal = 0;
  let weightGrams = 0;

  for (const product of products) {
    const qty = quantities.get(product.id) || 0;
    const available = Math.max(0, product.stockQty - product.reservedQty);
    if (available < qty) throw new CheckoutPricingError(isFr ? `Stock insuffisant pour ${product.traditionalName}.` : `Insufficient stock for ${product.traditionalName}.`, 409);

    const requested = requestedByProduct.get(product.id);
    const price = Number(product.promoPrice ?? product.price);
    const lineTotal = roundMoney(price * qty);
    const nameFr = product.translations.find((translation) => translation.locale === "fr")?.name || product.traditionalName;
    const nameEn = product.translations.find((translation) => translation.locale === "en")?.name || nameFr;
    const packWeightGrams = Math.max(0, product.netWeightGrams);

    subtotal += lineTotal;
    weightGrams += packWeightGrams * qty;
    thermalSet.add(product.thermalClass);
    validatedItems.push({
      productId: product.id,
      nameFr,
      nameEn,
      sku: product.sku,
      unitPrice: price,
      qty,
      lineTotal,
      thermalClass: product.thermalClass,
      imageUrl: product.imageUrl,
      recipeId: requested?.recipeId || null,
      recipeNameFr: requested?.recipeNameFr || null,
      recipeNameEn: requested?.recipeNameEn || null,
      packWeightGrams,
    });
  }

  subtotal = roundMoney(subtotal);
  const thermalClasses = [...thermalSet].sort();
  const shippingQuote = await calculateShippingQuote({ country: input.country, postalCode: input.postalCode, weightGrams, thermalClasses, service: input.deliveryService });
  if (!shippingQuote.available) throw new CheckoutPricingError(isFr ? "Ce service de livraison n'est pas compatible avec la chaîne du froid." : "This delivery service is not compatible with the cold chain.", 409);
  let shipping = shippingQuote.fee;
  let promoDiscount = 0;
  let promotionId: string | null = null;

  if (input.coupon) {
    const now = new Date();
    const promotion = await db.promotion.findUnique({ where: { code: input.coupon.trim().toUpperCase() } });
    const validWindow = promotion
      && (!promotion.startsAt || promotion.startsAt <= now)
      && (!promotion.endsAt || promotion.endsAt >= now)
      && (!promotion.usageLimit || promotion.usedCount < promotion.usageLimit);
    if (promotion?.active && validWindow && subtotal >= Number(promotion.minOrder)) {
      promotionId = promotion.id;
      if (promotion.type === "percent") promoDiscount = Math.min(subtotal, subtotal * Number(promotion.value) / 100);
      if (promotion.type === "fixed") promoDiscount = Math.min(subtotal, Number(promotion.value));
      if (promotion.type === "free_shipping") shipping = 0;
    }
  }

  promoDiscount = roundMoney(promoDiscount);
  shipping = roundMoney(shipping);
  const taxable = Math.max(0, subtotal - promoDiscount);
  const vat = roundMoney((taxable / 1.2) * 0.2);
  const total = roundMoney(taxable + shipping);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ items: validatedItems.map(({ productId, qty, unitPrice }) => ({ productId, qty, unitPrice })), deliveryService: shippingQuote.service, carrier: shippingQuote.carrier, promoDiscount, shipping, total }))
    .digest("hex");

  return { validatedItems, subtotal, promoDiscount, shipping, vat, total, weightGrams, thermalClasses, shippingQuote, fingerprint, promotionId };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
