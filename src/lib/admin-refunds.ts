import { z } from "zod";

export const REFUND_REASONS = [
  "customer_request",
  "missing_item",
  "damaged_item",
  "quality_issue",
  "delivery_incident",
  "other",
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];
export type RefundStatus = "pending" | "completed" | "rejected";

export const AdminRefundInput = z.object({
  amount: z.coerce.number().finite().positive().max(1_000_000),
  reason: z.enum(REFUND_REASONS),
  note: z.string().trim().min(8).max(500),
  requestId: z.string().uuid(),
  locale: z.enum(["fr", "en"]).default("fr"),
}).superRefine((value, context) => {
  if (Math.abs(Math.round(value.amount * 100) - value.amount * 100) > 1e-8) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Le montant est limité à deux décimales." });
  }
});

export type AdminRefundValues = z.infer<typeof AdminRefundInput>;

export function refundReasonLabel(reason: RefundReason, locale: "fr" | "en") {
  const labels: Record<RefundReason, [string, string]> = {
    customer_request: ["Demande du client", "Customer request"],
    missing_item: ["Article manquant", "Missing item"],
    damaged_item: ["Article endommagé", "Damaged item"],
    quality_issue: ["Qualité non conforme", "Quality issue"],
    delivery_incident: ["Incident de livraison", "Delivery incident"],
    other: ["Autre décision documentée", "Other documented decision"],
  };
  return labels[reason][locale === "fr" ? 0 : 1];
}

export function providerRefundStatus(status: string | null | undefined): RefundStatus {
  if (status === "succeeded") return "completed";
  if (status === "failed" || status === "canceled") return "rejected";
  return "pending";
}

export function refundAmounts(paymentAmount: number, refunds: ReadonlyArray<{ amount: number; status: string }>) {
  const completed = roundMoney(refunds
    .filter((refund) => refund.status === "completed")
    .reduce((sum, refund) => sum + positiveMoney(refund.amount), 0));
  const pending = roundMoney(refunds
    .filter((refund) => refund.status === "pending")
    .reduce((sum, refund) => sum + positiveMoney(refund.amount), 0));
  const refundable = roundMoney(Math.max(0, positiveMoney(paymentAmount) - completed - pending));
  return { completed, pending, committed: roundMoney(completed + pending), refundable };
}

export function isFullRefund(paymentAmount: number, completedRefundAmount: number) {
  return Math.round(positiveMoney(completedRefundAmount) * 100) >= Math.round(positiveMoney(paymentAmount) * 100);
}

function positiveMoney(value: number) {
  return Math.max(0, Number(value) || 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
