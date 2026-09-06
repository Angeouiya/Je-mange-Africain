import { randomUUID } from "node:crypto";
import { europeanCountryValue, europeanPostalCodeMessage, validateEuropeanPostalCode } from "@/lib/european-countries";
import { z } from "zod";

export const WHOLESALE_QUOTE_STATUSES = ["new", "reviewing", "quoted", "accepted", "declined", "expired"] as const;
export type WholesaleQuoteStatus = (typeof WHOLESALE_QUOTE_STATUSES)[number];

export const WholesaleQuoteRequestInput = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  company: z.string().trim().min(2).max(140),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32),
  country: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(2).max(20),
  deliveryRequirements: z.string().trim().min(10).max(2_000),
  additionalNeeds: z.string().trim().max(2_000).optional().default(""),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(80),
    packs: z.number().int().min(1).max(99),
  })).max(24).default([]),
}).superRefine((value, context) => {
  const postalValidation = validateEuropeanPostalCode(value.country, value.postalCode);
  if (!postalValidation.valid) {
    context.addIssue({ code: "custom", path: ["postalCode"], message: europeanPostalCodeMessage(value.country, value.postalCode, value.locale) });
  }
  if (!value.items.length && value.additionalNeeds.length < 3) {
    context.addIssue({ code: "custom", path: ["additionalNeeds"], message: "Describe the requested products or select at least one product." });
  }
  if (new Set(value.items.map((item) => item.productId)).size !== value.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "A product can only appear once." });
  }
}).transform((value) => ({
  ...value,
  country: europeanCountryValue(value.country) || value.country,
  postalCode: validateEuropeanPostalCode(value.country, value.postalCode).normalized,
}));

export const WholesaleQuoteAdminInput = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  status: z.enum(WHOLESALE_QUOTE_STATUSES),
  adminNote: z.string().trim().max(4_000).optional().default(""),
  assignedTo: z.string().trim().max(160).optional().default(""),
});

const TRANSITIONS: Record<WholesaleQuoteStatus, readonly WholesaleQuoteStatus[]> = {
  new: ["new", "reviewing", "declined"],
  reviewing: ["reviewing", "quoted", "declined"],
  quoted: ["quoted", "accepted", "declined", "expired"],
  accepted: ["accepted"],
  declined: ["declined", "reviewing"],
  expired: ["expired", "reviewing"],
};

export function canTransitionWholesaleQuote(from: string, to: WholesaleQuoteStatus) {
  return WHOLESALE_QUOTE_STATUSES.includes(from as WholesaleQuoteStatus)
    && TRANSITIONS[from as WholesaleQuoteStatus].includes(to);
}

export function createWholesaleQuoteReference(now = new Date(), nonce = randomUUID()) {
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = nonce.replaceAll("-", "").slice(0, 6).toUpperCase();
  return `JMA-GROS-${date}-${suffix}`;
}
