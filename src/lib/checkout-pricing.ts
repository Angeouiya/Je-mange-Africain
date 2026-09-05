import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { calculateShippingQuote, type DeliveryService } from "@/lib/shipping";
import { wholesaleAvailablePacks, wholesalePriceForQuantity, wholesaleTiers } from "@/lib/wholesale";
import { resolveProductPricing } from "@/lib/product-pricing";
import { evaluatePromotion } from "@/lib/promotion-policy";

export interface CheckoutPricingItem {
  productId: string;
  variantId?: string;
  qty: number;
  recipeId?: string;
  recipeNameFr?: string;
  recipeNameEn?: string;
  salesChannel?: "retail" | "wholesale";
}

export interface PricedCheckoutItem {
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
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
  salesChannel: "retail" | "wholesale";
  unitsPerPack: number;
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

  for (const item of input.items) {
    if (!item.productId || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      throw new CheckoutPricingError(isFr ? "Une quantité du panier est invalide." : "A basket quantity is invalid.");
    }
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, status: "published" },
    include: { translations: true, variants: true },
  });
  if (products.length !== productIds.length) throw new CheckoutPricingError(isFr ? "Un produit du panier n'est plus disponible." : "A product in the basket is no longer available.", 409);

  const productsById = new Map(products.map((product) => [product.id, product]));
  const stockUnitsByProduct = new Map<string, number>();
  for (const item of input.items) {
    const product = productsById.get(item.productId)!;
    const salesChannel = item.salesChannel === "wholesale" ? "wholesale" : "retail";
    const unitsPerPack = salesChannel === "wholesale" ? Math.max(1, product.wholesaleUnitsPerPack) : 1;
    const stockUnits = item.qty * unitsPerPack;
    stockUnitsByProduct.set(product.id, (stockUnitsByProduct.get(product.id) || 0) + stockUnits);
    if (salesChannel === "wholesale") {
      const tiers = wholesaleTiers({
        wholesaleMinPacks: product.wholesaleMinPacks,
        wholesalePrice: product.wholesalePrice === null ? null : Number(product.wholesalePrice),
        wholesaleTier2MinPacks: product.wholesaleTier2MinPacks,
        wholesaleTier2Price: product.wholesaleTier2Price === null ? null : Number(product.wholesaleTier2Price),
        wholesaleTier3MinPacks: product.wholesaleTier3MinPacks,
        wholesaleTier3Price: product.wholesaleTier3Price === null ? null : Number(product.wholesaleTier3Price),
      });
      if (!product.isWholesale || !tiers.length || item.qty < product.wholesaleMinPacks) {
        throw new CheckoutPricingError(isFr ? `L'offre de gros pour ${product.traditionalName} n'est plus disponible.` : `The wholesale offer for ${product.traditionalName} is no longer available.`, 409);
      }
      if (wholesaleAvailablePacks(product.stockQty, product.reservedQty, unitsPerPack) < item.qty) {
        throw new CheckoutPricingError(isFr ? `Stock de gros insuffisant pour ${product.traditionalName}.` : `Insufficient wholesale stock for ${product.traditionalName}.`, 409);
      }
    }
  }
  for (const product of products) {
    const available = Math.max(0, product.stockQty - product.reservedQty);
    if (available < (stockUnitsByProduct.get(product.id) || 0)) {
      throw new CheckoutPricingError(isFr ? `Stock insuffisant pour ${product.traditionalName}.` : `Insufficient stock for ${product.traditionalName}.`, 409);
    }
  }

  const thermalSet = new Set<string>();
  const validatedItems: PricedCheckoutItem[] = [];
  let subtotal = 0;
  let weightGrams = 0;

  for (const requested of input.items) {
    const product = productsById.get(requested.productId)!;
    const qty = requested.qty;
    const salesChannel = requested.salesChannel === "wholesale" ? "wholesale" : "retail";
    const variant = salesChannel === "retail" && requested.variantId
      ? product.variants.find((item) => item.id === requested.variantId)
      : null;
    if (salesChannel === "retail" && requested.variantId && !variant) {
      throw new CheckoutPricingError(isFr ? `Le format choisi pour ${product.traditionalName} n'est plus disponible.` : `The selected format for ${product.traditionalName} is no longer available.`, 409);
    }
    const unitsPerPack = salesChannel === "wholesale" ? Math.max(1, product.wholesaleUnitsPerPack) : 1;
    const tiers = salesChannel === "wholesale" ? wholesaleTiers({
      wholesaleMinPacks: product.wholesaleMinPacks,
      wholesalePrice: product.wholesalePrice === null ? null : Number(product.wholesalePrice),
      wholesaleTier2MinPacks: product.wholesaleTier2MinPacks,
      wholesaleTier2Price: product.wholesaleTier2Price === null ? null : Number(product.wholesaleTier2Price),
      wholesaleTier3MinPacks: product.wholesaleTier3MinPacks,
      wholesaleTier3Price: product.wholesaleTier3Price === null ? null : Number(product.wholesaleTier3Price),
    }) : [];
    const price = salesChannel === "wholesale"
      ? wholesalePriceForQuantity(tiers, qty)
      : resolveProductPricing({ price: Number(product.price), promoPrice: product.promoPrice === null ? null : Number(product.promoPrice) }, variant ? Number(variant.price) : undefined).price;
    const lineTotal = roundMoney(price * qty);
    const nameFr = product.translations.find((translation) => translation.locale === "fr")?.name || product.traditionalName;
    const nameEn = product.translations.find((translation) => translation.locale === "en")?.name || nameFr;
    const retailWeightGrams = variant && variant.weightGrams > 0 ? variant.weightGrams : product.netWeightGrams;
    const packWeightGrams = Math.max(0, retailWeightGrams * unitsPerPack);

    subtotal += lineTotal;
    weightGrams += packWeightGrams * qty;
    thermalSet.add(product.thermalClass);
    validatedItems.push({
      productId: product.id,
      variantId: variant?.id || null,
      variantLabel: salesChannel === "wholesale" ? product.wholesalePackLabel || null : variant?.label || product.packaging || null,
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
      salesChannel,
      unitsPerPack,
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
    const promotion = await db.promotion.findUnique({ where: { code: input.coupon.trim().toUpperCase() } });
    const evaluation = promotion ? evaluatePromotion(promotion, {
      subtotal,
      country: input.country,
      locale: input.locale,
      lines: validatedItems.map((item) => ({
        productId: item.productId,
        categoryId: productsById.get(item.productId)?.categoryId || null,
        lineTotal: item.lineTotal,
      })),
    }) : null;
    if (promotion && evaluation?.valid) {
      promotionId = promotion.id;
      promoDiscount = evaluation.discount;
      if (evaluation.freeShipping) shipping = 0;
    }
  }

  promoDiscount = roundMoney(promoDiscount);
  shipping = roundMoney(shipping);
  const taxable = Math.max(0, subtotal - promoDiscount);
  const vat = roundMoney((taxable / 1.2) * 0.2);
  const total = roundMoney(taxable + shipping);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ items: validatedItems.map(({ productId, variantId, qty, unitPrice, salesChannel, unitsPerPack }) => ({ productId, variantId, qty, unitPrice, salesChannel, unitsPerPack })), deliveryService: shippingQuote.service, carrier: shippingQuote.carrier, promoDiscount, shipping, total }))
    .digest("hex");

  return { validatedItems, subtotal, promoDiscount, shipping, vat, total, weightGrams, thermalClasses, shippingQuote, fingerprint, promotionId };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
