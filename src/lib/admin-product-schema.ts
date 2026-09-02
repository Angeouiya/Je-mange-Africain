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
});

export type ProductAdminInput = z.infer<typeof productAdminInput>;

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
