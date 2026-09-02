import { z } from "zod";

export const FULFILLMENT_TARGETS = [
  "preparing",
  "packed",
  "controlDone",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_TARGETS)[number];

const NEXT_STATUS: Record<string, FulfillmentStatus | undefined> = {
  paymentConfirmed: "preparing",
  stockReserved: "preparing",
  fraudCheck: "preparing",
  preparing: "packed",
  packed: "controlDone",
  controlDone: "shipped",
  shipped: "in_transit",
  in_transit: "out_for_delivery",
  out_for_delivery: "delivered",
  delivering: "delivered",
};

const STATUS_LABELS: Record<FulfillmentStatus, { fr: string; en: string }> = {
  preparing: { fr: "Préparation lancée", en: "Preparation started" },
  packed: { fr: "Colis prêt", en: "Parcel packed" },
  controlDone: { fr: "Contrôle qualité terminé", en: "Quality check completed" },
  shipped: { fr: "Remis au transporteur", en: "Handed to carrier" },
  in_transit: { fr: "En transit", en: "In transit" },
  out_for_delivery: { fr: "En cours de livraison", en: "Out for delivery" },
  delivered: { fr: "Livraison confirmée", en: "Delivery confirmed" },
};

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();
const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional();
const optionalProof = z.union([z.string().trim().url().max(1000), z.literal(""), z.null()]).optional();

export const orderFulfillmentInput = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  status: z.enum(FULFILLMENT_TARGETS).optional(),
  notes: optionalText(1500),
  shipment: z.object({
    id: z.string().trim().min(1).max(100).optional(),
    thermalClass: z.enum(["AMBIANT", "REFRIGERATED", "FROZEN"]).optional(),
    carrier: optionalText(100),
    trackingNumber: optionalText(120),
    estimatedDelivery: optionalDate,
    confirmCode: z.union([
      z.string().trim().min(4).max(16).regex(/^[A-Za-z0-9-]+$/),
      z.literal(""),
      z.null(),
    ]).optional(),
    proofPhoto: optionalProof,
    signature: optionalText(120),
  }).optional(),
}).refine(
  (value) => Boolean(value.status || value.shipment || typeof value.notes === "string" || value.notes === null),
  { message: "Aucune modification à enregistrer." },
);

export type OrderFulfillmentInput = z.infer<typeof orderFulfillmentInput>;

export type FulfillmentShipmentSnapshot = {
  carrier: string | null;
  trackingNumber: string | null;
  confirmCode: string | null;
  proofPhoto: string | null;
  signature: string | null;
};

export type FulfillmentReadinessIssue = "parcel_required" | "carrier_required" | "tracking_required" | "code_required" | "proof_required";

export function nextFulfillmentStatus(currentStatus: string) {
  return NEXT_STATUS[currentStatus] || null;
}

export function canTransitionOrder(currentStatus: string, targetStatus: string) {
  return nextFulfillmentStatus(currentStatus) === targetStatus;
}

export function fulfillmentStatusLabel(status: FulfillmentStatus, locale: "fr" | "en") {
  return STATUS_LABELS[status][locale];
}

export function shipmentStatusForOrder(status: FulfillmentStatus) {
  if (status === "shipped") return "picked_up";
  if (status === "in_transit") return "in_transit";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  return "created";
}

export function fulfillmentReadinessIssue(
  targetStatus: FulfillmentStatus,
  shipments: FulfillmentShipmentSnapshot[],
): FulfillmentReadinessIssue | null {
  const needsTransport = ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(targetStatus);
  if (!needsTransport) return null;
  if (!shipments.length) return "parcel_required";
  if (shipments.some((shipment) => !shipment.carrier?.trim())) return "carrier_required";
  if (shipments.some((shipment) => !shipment.trackingNumber?.trim())) return "tracking_required";
  if (["out_for_delivery", "delivered"].includes(targetStatus) && shipments.some((shipment) => !shipment.confirmCode?.trim())) return "code_required";
  if (targetStatus === "delivered" && shipments.some((shipment) => !shipment.proofPhoto?.trim() && !shipment.signature?.trim())) return "proof_required";
  return null;
}
