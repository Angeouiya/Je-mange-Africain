import { z } from "zod";

export const productAdminInput = z.object({
  nameFr: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  traditionalName: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  categoryId: z.string().trim().min(1),
  country: z.string().trim().min(2).max(80),
  packaging: z.string().trim().min(2).max(80),
  descriptionFr: z.string().trim().min(10).max(1200),
  descriptionEn: z.string().trim().min(10).max(1200),
  costPrice: z.coerce.number().positive().max(10000),
  profitMargin: z.coerce.number().min(0).max(10000),
  promoPrice: z.union([z.coerce.number().positive().max(10000), z.literal(""), z.null()]).optional(),
  isWholesale: z.boolean().default(false),
  wholesalePackLabel: z.string().trim().max(80).default(""),
  wholesaleUnitsPerPack: z.coerce.number().int().min(1).max(10000).default(1),
  wholesaleMinPacks: z.coerce.number().int().min(1).max(99).default(1),
  wholesalePrice: z.union([z.coerce.number().positive().max(100000), z.literal(""), z.null()]).optional(),
  wholesaleTier2MinPacks: z.union([z.coerce.number().int().min(2).max(99), z.literal(""), z.null()]).optional(),
  wholesaleTier2Price: z.union([z.coerce.number().positive().max(100000), z.literal(""), z.null()]).optional(),
  wholesaleTier3MinPacks: z.union([z.coerce.number().int().min(3).max(99), z.literal(""), z.null()]).optional(),
  wholesaleTier3Price: z.union([z.coerce.number().positive().max(100000), z.literal(""), z.null()]).optional(),
  stockQty: z.coerce.number().int().min(0).max(100000),
  netWeightGrams: z.coerce.number().int().min(0).max(100000),
  thermalClass: z.enum(["AMBIANT", "REFRIGERATED", "FROZEN"]),
  storageType: z.enum(["SEC", "FRAIS", "REFRIGERE", "SURGELE", "FUME", "SECHE", "CONSERVE"]),
  aliases: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
  imageUrl: z.string().url().max(1000),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  isNew: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
}).superRefine((input, context) => {
  if (!input.isWholesale) return;
  if (input.wholesalePackLabel.length < 2) context.addIssue({ code: "custom", path: ["wholesalePackLabel"], message: "Le conditionnement de gros est requis." });
  if (typeof input.wholesalePrice !== "number") context.addIssue({ code: "custom", path: ["wholesalePrice"], message: "Le prix de gros est requis." });
  const packCost = input.costPrice * input.wholesaleUnitsPerPack;
  const retailPackPrice = (input.costPrice + input.profitMargin) * input.wholesaleUnitsPerPack;
  if (typeof input.wholesalePrice === "number" && (input.wholesalePrice < packCost || input.wholesalePrice >= retailPackPrice)) {
    context.addIssue({ code: "custom", path: ["wholesalePrice"], message: "Le prix de gros doit couvrir le coût du colis et rester inférieur au prix de détail équivalent." });
  }

  const tiers = [
    { quantity: input.wholesaleTier2MinPacks, price: input.wholesaleTier2Price, path: "wholesaleTier2MinPacks" },
    { quantity: input.wholesaleTier3MinPacks, price: input.wholesaleTier3Price, path: "wholesaleTier3MinPacks" },
  ];
  let previousQuantity = input.wholesaleMinPacks;
  let previousPrice = typeof input.wholesalePrice === "number" ? input.wholesalePrice : Number.POSITIVE_INFINITY;
  for (const tier of tiers) {
    const hasQuantity = typeof tier.quantity === "number";
    const hasPrice = typeof tier.price === "number";
    if (hasQuantity !== hasPrice) {
      context.addIssue({ code: "custom", path: [tier.path], message: "La quantité et le prix du palier doivent être renseignés ensemble." });
      continue;
    }
    if (!hasQuantity || !hasPrice) continue;
    const tierQuantity = Number(tier.quantity);
    const tierPrice = Number(tier.price);
    if (tierQuantity <= previousQuantity) context.addIssue({ code: "custom", path: [tier.path], message: "Chaque palier doit avoir une quantité supérieure au précédent." });
    if (tierPrice >= previousPrice) context.addIssue({ code: "custom", path: [tier.path.replace("MinPacks", "Price")], message: "Chaque palier doit réduire le prix par colis." });
    if (tierPrice < packCost) context.addIssue({ code: "custom", path: [tier.path.replace("MinPacks", "Price")], message: "Le prix du palier ne peut pas être inférieur au coût brut du colis." });
    previousQuantity = tierQuantity;
    previousPrice = tierPrice;
  }
});

export type ProductAdminInput = z.infer<typeof productAdminInput>;

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function wholesaleProductData(input: ProductAdminInput) {
  return {
    isWholesale: input.isWholesale,
    wholesalePackLabel: input.isWholesale ? input.wholesalePackLabel : null,
    wholesaleUnitsPerPack: input.isWholesale ? input.wholesaleUnitsPerPack : 1,
    wholesaleMinPacks: input.isWholesale ? input.wholesaleMinPacks : 1,
    wholesalePrice: input.isWholesale && typeof input.wholesalePrice === "number" ? input.wholesalePrice : null,
    wholesaleTier2MinPacks: input.isWholesale && typeof input.wholesaleTier2MinPacks === "number" ? input.wholesaleTier2MinPacks : null,
    wholesaleTier2Price: input.isWholesale && typeof input.wholesaleTier2Price === "number" ? input.wholesaleTier2Price : null,
    wholesaleTier3MinPacks: input.isWholesale && typeof input.wholesaleTier3MinPacks === "number" ? input.wholesaleTier3MinPacks : null,
    wholesaleTier3Price: input.isWholesale && typeof input.wholesaleTier3Price === "number" ? input.wholesaleTier3Price : null,
  };
}
