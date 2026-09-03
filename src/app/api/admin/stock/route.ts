import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { inventoryBatchCreateInput, isStockDateExpired, stockDateAsUtc } from "@/lib/admin-stock-schema";
import { getProductPhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

function warehouseSupports(warehouse: { ambientZones: number; refrigeratedZones: number; frozenZones: number }, thermalClass: string) {
  if (thermalClass === "REFRIGERATED") return warehouse.refrigeratedZones > 0;
  if (thermalClass === "FROZEN") return warehouse.frozenZones > 0;
  return warehouse.ambientZones > 0;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "stock", action: "read" });
  if (!authorization.ok) return authorization.response;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";

  const [batches, products, warehouses, movements] = await Promise.all([
    db.inventoryBatch.findMany({
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
      include: { product: { include: { translations: true, category: true } }, warehouse: true },
    }),
    db.product.findMany({
      where: { status: { not: "archived" } },
      orderBy: { traditionalName: "asc" },
      include: { translations: true, category: true },
    }),
    db.warehouse.findMany({ orderBy: { name: "asc" } }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { batch: true } }),
  ]);

  const productNames = new Map(products.map((product) => [
    product.id,
    product.translations.find((translation) => translation.locale === locale)?.name || product.traditionalName,
  ]));
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));

  return NextResponse.json({
    batches: batches.map((batch) => ({
      id: batch.id,
      lotNumber: batch.lotNumber,
      productId: batch.productId,
      productName: batch.product.translations.find((translation) => translation.locale === locale)?.name || batch.product.traditionalName,
      productSku: batch.product.sku,
      productImageUrl: getProductPhoto({
        traditionalName: batch.product.traditionalName,
        name: batch.product.translations.find((translation) => translation.locale === locale)?.name,
        imageUrl: batch.product.imageUrl,
        imageEmoji: batch.product.imageEmoji,
        category: { slug: batch.product.category.slug, name: batch.product.category.nameFr },
      }),
      productImageColor: batch.product.imageColor,
      thermalClass: batch.product.thermalClass,
      quantity: batch.quantity,
      reserved: batch.reserved,
      expiryDate: batch.expiryDate,
      receiptDate: batch.receiptDate,
      costPrice: Number(batch.costPrice),
      status: batch.status,
      warehouseId: batch.warehouseId,
      warehouse: batch.warehouse.name,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: productNames.get(product.id) || product.traditionalName,
      sku: product.sku,
      imageUrl: getProductPhoto({
        traditionalName: product.traditionalName,
        name: productNames.get(product.id),
        imageUrl: product.imageUrl,
        imageEmoji: product.imageEmoji,
        category: { slug: product.category.slug, name: product.category.nameFr },
      }),
      imageColor: product.imageColor,
      thermalClass: product.thermalClass,
      stockQty: product.stockQty,
    })),
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      city: warehouse.city,
      supports: [
        ...(warehouse.ambientZones > 0 ? ["AMBIANT" as const] : []),
        ...(warehouse.refrigeratedZones > 0 ? ["REFRIGERATED" as const] : []),
        ...(warehouse.frozenZones > 0 ? ["FROZEN" as const] : []),
      ],
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      batchId: movement.batchId,
      lotNumber: movement.batch?.lotNumber || null,
      productName: productNames.get(movement.productId) || movement.productId,
      warehouse: warehouseNames.get(movement.warehouseId) || movement.warehouseId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "stock", action: "create" });
  if (!authorization.ok) return authorization.response;

  const parsed = inventoryBatchCreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La réception est incomplète ou contient des valeurs invalides.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const [product, warehouse, duplicate] = await Promise.all([
    db.product.findUnique({ where: { id: input.productId }, select: { id: true, thermalClass: true, stockQty: true } }),
    db.warehouse.findUnique({ where: { id: input.warehouseId } }),
    db.inventoryBatch.findFirst({ where: { productId: input.productId, lotNumber: input.lotNumber }, select: { id: true } }),
  ]);
  if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  if (!warehouse) return NextResponse.json({ error: "Entrepôt introuvable." }, { status: 404 });
  if (duplicate) return NextResponse.json({ error: "Ce numéro de lot existe déjà pour ce produit." }, { status: 409 });
  if (!warehouseSupports(warehouse, product.thermalClass)) {
    return NextResponse.json({ error: "Cet entrepôt ne possède pas la zone thermique requise pour ce produit." }, { status: 409 });
  }

  const receiptDate = stockDateAsUtc(input.receiptDate);
  const expiryDate = input.expiryDate ? stockDateAsUtc(input.expiryDate) : null;
  if (input.status === "active" && expiryDate && isStockDateExpired(expiryDate)) {
    return NextResponse.json({ error: "Un lot déjà expiré doit être réceptionné en quarantaine." }, { status: 409 });
  }
  const batch = await db.$transaction(async (transaction) => {
    const created = await transaction.inventoryBatch.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        lotNumber: input.lotNumber,
        quantity: input.quantity,
        costPrice: input.costPrice,
        receiptDate,
        expiryDate,
        status: input.status,
      },
    });
    await transaction.stockMovement.create({
      data: {
        batchId: created.id,
        productId: input.productId,
        warehouseId: input.warehouseId,
        type: "receipt",
        quantity: input.quantity,
        reason: input.reason,
        userId: authorization.user.id,
        beforeQty: 0,
        afterQty: input.quantity,
      },
    });
    if (input.status === "active") {
      await transaction.product.update({ where: { id: input.productId }, data: { stockQty: { increment: input.quantity } } });
    }
    await transaction.auditLog.create({
      data: {
        action: "batch_create",
        entityType: "InventoryBatch",
        entityId: created.id,
        after: JSON.stringify(input),
        reason: `${input.reason} · ${authorization.user.email}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      },
    });
    return created;
  });

  return NextResponse.json({ batch: { id: batch.id, lotNumber: batch.lotNumber } }, { status: 201 });
}
