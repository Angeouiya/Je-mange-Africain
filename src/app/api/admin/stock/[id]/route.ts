import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  inventoryBatchMutationInput,
  isStockDateExpired,
  signedStockAdjustment,
  statusAvailabilityDelta,
  type InventoryBatchStatus,
} from "@/lib/admin-stock-schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "stock", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = inventoryBatchMutationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La décision de stock est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await params;
  const input = parsed.data;
  const batch = await db.inventoryBatch.findUnique({
    where: { id },
    include: { product: { select: { stockQty: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });

  if (input.action === "adjust") {
    if (["recalled", "expired"].includes(batch.status)) {
      return NextResponse.json({ error: "Un lot rappelé ou expiré est verrouillé pour conserver la traçabilité." }, { status: 409 });
    }
    const delta = signedStockAdjustment(input);
    const nextQuantity = batch.quantity + delta;
    if (nextQuantity < batch.reserved) {
      return NextResponse.json({ error: "La quantité physique ne peut pas devenir inférieure au stock déjà réservé." }, { status: 409 });
    }
    const productStock = batch.status === "active" ? Math.max(0, batch.product.stockQty + delta) : batch.product.stockQty;
    await db.$transaction(async (transaction) => {
      await transaction.inventoryBatch.update({ where: { id }, data: { quantity: nextQuantity } });
      if (batch.status === "active") await transaction.product.update({ where: { id: batch.productId }, data: { stockQty: productStock } });
      await transaction.stockMovement.create({
        data: {
          batchId: id,
          productId: batch.productId,
          warehouseId: batch.warehouseId,
          type: "adjustment",
          quantity: delta,
          reason: input.reason,
          userId: authorization.user.id,
          beforeQty: batch.quantity,
          afterQty: nextQuantity,
        },
      });
      await transaction.auditLog.create({
        data: {
          action: "stock_adjustment",
          entityType: "InventoryBatch",
          entityId: id,
          before: JSON.stringify({ quantity: batch.quantity, productStock: batch.product.stockQty }),
          after: JSON.stringify({ quantity: nextQuantity, productStock, delta }),
          reason: `${input.reason} · ${authorization.user.email}`,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        },
      });
    });
    return NextResponse.json({ batch: { id, quantity: nextQuantity, status: batch.status }, movement: { quantity: delta } });
  }

  const currentStatus = batch.status as InventoryBatchStatus;
  if (currentStatus === input.status) return NextResponse.json({ error: "Le lot possède déjà ce statut." }, { status: 409 });
  if (["recalled", "expired"].includes(currentStatus)) {
    return NextResponse.json({ error: "Le rappel et l'expiration sont définitifs pour conserver l'historique sanitaire." }, { status: 409 });
  }
  if (input.status === "active" && batch.expiryDate && isStockDateExpired(batch.expiryDate)) {
    return NextResponse.json({ error: "Un lot expiré ne peut pas être remis en vente." }, { status: 409 });
  }

  const availabilityDelta = statusAvailabilityDelta(currentStatus, input.status, batch.quantity);
  const productStock = Math.max(0, batch.product.stockQty + availabilityDelta);
  await db.$transaction(async (transaction) => {
    await transaction.inventoryBatch.update({ where: { id }, data: { status: input.status } });
    if (availabilityDelta !== 0) await transaction.product.update({ where: { id: batch.productId }, data: { stockQty: productStock } });
    await transaction.stockMovement.create({
      data: {
        batchId: id,
        productId: batch.productId,
        warehouseId: batch.warehouseId,
        type: input.status === "recalled" ? "recall" : input.status === "active" ? "release" : input.status === "expired" ? "loss" : "adjustment",
        quantity: availabilityDelta,
        reason: input.reason,
        userId: authorization.user.id,
        beforeQty: batch.quantity,
        afterQty: batch.quantity,
      },
    });
    await transaction.auditLog.create({
      data: {
        action: "batch_status_change",
        entityType: "InventoryBatch",
        entityId: id,
        before: JSON.stringify({ status: currentStatus, productStock: batch.product.stockQty }),
        after: JSON.stringify({ status: input.status, productStock, availabilityDelta }),
        reason: `${input.reason} · ${authorization.user.email}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      },
    });
  });

  return NextResponse.json({ batch: { id, quantity: batch.quantity, status: input.status }, movement: { quantity: availabilityDelta } });
}
