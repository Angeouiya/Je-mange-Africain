import { z } from "zod";

export const inventoryBatchStatus = z.enum(["active", "blocked", "recalled", "expired"]);

const stockDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Date invalide.");

export const inventoryBatchCreateInput = z.object({
  productId: z.string().trim().min(1),
  warehouseId: z.string().trim().min(1),
  lotNumber: z.string().trim().min(3).max(64).transform((value) => value.toUpperCase()),
  quantity: z.coerce.number().int().min(1).max(100_000),
  costPrice: z.coerce.number().min(0).max(100_000),
  receiptDate: stockDate,
  expiryDate: z.union([stockDate, z.literal(""), z.null()]).optional(),
  status: z.enum(["active", "blocked"]).default("active"),
  reason: z.string().trim().min(5).max(300),
}).superRefine((input, context) => {
  if (input.expiryDate && input.expiryDate <= input.receiptDate) {
    context.addIssue({ code: "custom", path: ["expiryDate"], message: "La date de péremption doit suivre la date de réception." });
  }
});

export const inventoryBatchMutationInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("adjust"),
    direction: z.enum(["increase", "decrease"]),
    quantity: z.coerce.number().int().min(1).max(100_000),
    reason: z.string().trim().min(5).max(300),
  }),
  z.object({
    action: z.literal("status"),
    status: inventoryBatchStatus,
    reason: z.string().trim().min(5).max(300),
  }),
]);

export type InventoryBatchStatus = z.infer<typeof inventoryBatchStatus>;
export type InventoryBatchCreateInput = z.infer<typeof inventoryBatchCreateInput>;
export type InventoryBatchMutationInput = z.infer<typeof inventoryBatchMutationInput>;

export function stockDateAsUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isStockDateExpired(value: Date, now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return value.getTime() < todayUtc;
}

export function signedStockAdjustment(input: Extract<InventoryBatchMutationInput, { action: "adjust" }>) {
  return input.direction === "increase" ? input.quantity : -input.quantity;
}

export function statusAvailabilityDelta(current: InventoryBatchStatus, next: InventoryBatchStatus, quantity: number) {
  if (current === "active" && next !== "active") return -quantity;
  if (current !== "active" && next === "active") return quantity;
  return 0;
}
