import { z } from "zod";
import { europeanCountryCode } from "@/lib/european-countries";

export const PROMOTION_TYPES = ["percent", "fixed", "free_shipping"] as const;
export const PROMOTION_TARGETS = ["all", "country", "category", "product"] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];
export type PromotionTarget = (typeof PROMOTION_TARGETS)[number];
export type PromotionLifecycle = "active" | "scheduled" | "paused" | "expired" | "exhausted";

const optionalDate = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.union([z.string().datetime({ offset: true }), z.null()]),
);
const optionalUsageLimit = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.union([z.coerce.number().int().positive().max(1_000_000), z.null()]),
);
const optionalTarget = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.union([z.string().trim().min(1).max(120), z.null()]),
);

export const PromotionAdminInput = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  type: z.enum(PROMOTION_TYPES),
  value: z.coerce.number().finite().min(0).max(10_000),
  minOrder: z.coerce.number().finite().min(0).max(1_000_000),
  appliesTo: z.enum(PROMOTION_TARGETS),
  targetId: optionalTarget,
  startsAt: optionalDate,
  endsAt: optionalDate,
  usageLimit: optionalUsageLimit,
  active: z.boolean(),
}).superRefine((input, context) => {
  if (input.type === "percent" && (input.value <= 0 || input.value > 80)) {
    context.addIssue({ code: "custom", path: ["value"], message: "Le pourcentage doit être compris entre 1 et 80." });
  }
  if (input.type === "fixed" && input.value <= 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "La remise fixe doit être positive." });
  }
  if (input.type === "free_shipping" && input.value !== 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "La livraison offerte ne porte pas de valeur monétaire." });
  }
  if (input.appliesTo !== "all" && !input.targetId) {
    context.addIssue({ code: "custom", path: ["targetId"], message: "La cible est obligatoire." });
  }
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "La fin doit être postérieure au début." });
  }
});

export type PromotionAdminValues = z.infer<typeof PromotionAdminInput>;

export const promotionData = (input: PromotionAdminValues) => ({
  code: input.code,
  type: input.type,
  value: input.value,
  minOrder: input.minOrder,
  appliesTo: input.appliesTo,
  targetId: input.appliesTo === "all" ? null : input.targetId,
  startsAt: input.startsAt ? new Date(input.startsAt) : null,
  endsAt: input.endsAt ? new Date(input.endsAt) : null,
  usageLimit: input.usageLimit,
  active: input.active,
});

export type PromotionRecord = {
  type: string;
  value: number | string | { toString(): string };
  minOrder: number | string | { toString(): string };
  appliesTo: string;
  targetId?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
};

export type PromotionLine = {
  productId: string;
  categoryId?: string | null;
  lineTotal: number;
};

export function promotionLifecycle(promotion: PromotionRecord, now: string | Date = new Date()): PromotionLifecycle {
  if (!promotion.active) return "paused";
  const current = validTime(now) ?? Date.now();
  const start = validTime(promotion.startsAt);
  const end = validTime(promotion.endsAt);
  if (promotion.usageLimit !== null && promotion.usageLimit !== undefined && promotion.usedCount >= promotion.usageLimit) return "exhausted";
  if (end !== null && end <= current) return "expired";
  if (start !== null && start > current) return "scheduled";
  return "active";
}

export function evaluatePromotion(
  promotion: PromotionRecord,
  input: { subtotal: number; country?: string | null; lines?: PromotionLine[]; locale?: "fr" | "en"; now?: string | Date },
) {
  const isFr = input.locale !== "en";
  const lifecycle = promotionLifecycle(promotion, input.now);
  if (lifecycle !== "active") return invalidPromotion(lifecycleError(lifecycle, isFr), lifecycle);

  const subtotal = positiveMoney(input.subtotal);
  if (subtotal < Number(promotion.minOrder)) {
    const minimum = Number(promotion.minOrder).toLocaleString(isFr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" });
    return invalidPromotion(isFr ? `Panier minimum de ${minimum}.` : `Minimum basket of ${minimum}.`, lifecycle);
  }

  const eligibleSubtotal = promotionEligibleSubtotal(promotion, subtotal, input.country, input.lines || []);
  if (eligibleSubtotal <= 0) {
    return invalidPromotion(isFr ? "Ce code ne s'applique pas à cette sélection." : "This code does not apply to this selection.", lifecycle);
  }

  const value = positiveMoney(Number(promotion.value));
  const discount = promotion.type === "percent"
    ? roundMoney(Math.min(eligibleSubtotal, eligibleSubtotal * value / 100))
    : promotion.type === "fixed"
      ? roundMoney(Math.min(eligibleSubtotal, value))
      : 0;
  const freeShipping = promotion.type === "free_shipping";
  if (!freeShipping && discount <= 0) return invalidPromotion(isFr ? "Cette promotion n'accorde aucune remise." : "This promotion does not provide a discount.", lifecycle);

  return { valid: true as const, error: null, lifecycle, discount, freeShipping, eligibleSubtotal: roundMoney(eligibleSubtotal) };
}

function promotionEligibleSubtotal(promotion: PromotionRecord, subtotal: number, country: string | null | undefined, lines: PromotionLine[]) {
  if (promotion.appliesTo === "all") return subtotal;
  if (promotion.appliesTo === "country") {
    return europeanCountryCode(country) && europeanCountryCode(country) === europeanCountryCode(promotion.targetId) ? subtotal : 0;
  }
  if (promotion.appliesTo === "product") {
    return lines.filter((line) => line.productId === promotion.targetId).reduce((sum, line) => sum + positiveMoney(line.lineTotal), 0);
  }
  if (promotion.appliesTo === "category") {
    return lines.filter((line) => line.categoryId === promotion.targetId).reduce((sum, line) => sum + positiveMoney(line.lineTotal), 0);
  }
  return 0;
}

function lifecycleError(lifecycle: Exclude<PromotionLifecycle, "active">, isFr: boolean) {
  const messages = {
    paused: ["Ce code est actuellement suspendu.", "This code is currently paused."],
    scheduled: ["Cette promotion n'a pas encore commencé.", "This promotion has not started yet."],
    expired: ["Cette promotion est terminée.", "This promotion has ended."],
    exhausted: ["Le quota de cette promotion est atteint.", "This promotion has reached its usage limit."],
  } as const;
  return messages[lifecycle][isFr ? 0 : 1];
}

function invalidPromotion(error: string, lifecycle: PromotionLifecycle) {
  return { valid: false as const, error, lifecycle, discount: 0, freeShipping: false, eligibleSubtotal: 0 };
}

function validTime(value?: string | Date | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function positiveMoney(value: number) {
  return Math.max(0, Number(value) || 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
