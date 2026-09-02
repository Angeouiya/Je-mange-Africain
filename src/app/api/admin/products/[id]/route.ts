import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { productAdminInput, roundMoney, wholesaleProductData, type ProductAdminInput } from "@/lib/admin-product-schema";

export const dynamic = "force-dynamic";

const ProductEditorialInput = z.object({
  imageUrl: z.string().url().max(1000),
  galleryUrls: z.array(z.string().url().max(1000)).max(8).default([]),
  status: z.enum(["draft", "published", "archived"]),
  isNew: z.boolean(),
  isRecommended: z.boolean(),
  isBestseller: z.boolean(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "update" });
  if (!authorization.ok) return authorization.response;
  const body = await request.json().catch(() => null);
  const { id } = await params;
  const fullProduct = productAdminInput.safeParse(body);
  if (fullProduct.success) return updateFullProduct(id, fullProduct.data, authorization.user.email);

  const parsed = ProductEditorialInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Les paramètres éditoriaux du produit sont invalides." }, { status: 400 });
  const before = await db.product.findUnique({ where: { id }, select: { imageUrl: true, galleryUrls: true, status: true, isNew: true, isRecommended: true, isBestseller: true } });
  if (!before) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  const product = await db.product.update({
    where: { id },
    data: { ...parsed.data, galleryUrls: JSON.stringify(parsed.data.galleryUrls) },
    select: { id: true, imageUrl: true, status: true, isNew: true, isRecommended: true, isBestseller: true },
  });
  await db.auditLog.create({ data: { action: "product_editorial_update", entityType: "Product", entityId: id, before: JSON.stringify(before), after: JSON.stringify(parsed.data), reason: `Mise à jour par ${authorization.user.email}` } });
  return NextResponse.json({ product });
}

async function updateFullProduct(id: string, input: ProductAdminInput, adminEmail: string) {
  const [before, category, duplicate] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { translations: true, aliases: true } }),
    db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    db.product.findFirst({ where: { sku: input.sku.toUpperCase(), id: { not: id } }, select: { id: true } }),
  ]);
  if (!before) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  if (!category) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 400 });
  if (duplicate) return NextResponse.json({ error: "Ce SKU existe déjà." }, { status: 409 });

  const price = roundMoney(input.costPrice + input.profitMargin);
  if (price <= 0 || price > 10000) return NextResponse.json({ error: "Le prix de vente calculé doit être compris entre 0,01 € et 10 000 €." }, { status: 400 });
  if (typeof input.promoPrice === "number" && input.promoPrice >= price) return NextResponse.json({ error: "Le prix promotionnel doit être inférieur au prix normal." }, { status: 400 });
  const aliases = Array.from(new Set(input.aliases.map((alias) => alias.trim()).filter(Boolean)));

  const product = await db.$transaction(async (transaction) => {
    const updated = await transaction.product.update({
      where: { id },
      data: {
        sku: input.sku.toUpperCase(),
        traditionalName: input.traditionalName,
        categoryId: input.categoryId,
        country: input.country,
        packaging: input.packaging,
        costPrice: input.costPrice,
        profitMargin: input.profitMargin,
        price,
        promoPrice: typeof input.promoPrice === "number" ? input.promoPrice : null,
        ...wholesaleProductData(input),
        pricePerKg: input.netWeightGrams > 0 ? price / (input.netWeightGrams / 1000) : null,
        stockQty: input.stockQty,
        netWeightGrams: input.netWeightGrams,
        thermalClass: input.thermalClass,
        storageType: input.storageType,
        imageUrl: input.imageUrl,
        status: input.status,
        isNew: input.isNew,
        isRecommended: input.isRecommended,
        isBestseller: input.isBestseller,
        isOnSale: typeof input.promoPrice === "number",
      },
      select: { id: true, sku: true, price: true, status: true },
    });
    await transaction.productTranslation.upsert({
      where: { productId_locale: { productId: id, locale: "fr" } },
      create: { productId: id, locale: "fr", name: input.nameFr, description: input.descriptionFr, validated: true },
      update: { name: input.nameFr, description: input.descriptionFr, validated: true },
    });
    await transaction.productTranslation.upsert({
      where: { productId_locale: { productId: id, locale: "en" } },
      create: { productId: id, locale: "en", name: input.nameEn, description: input.descriptionEn, validated: true },
      update: { name: input.nameEn, description: input.descriptionEn, validated: true },
    });
    await transaction.productAlias.deleteMany({ where: { productId: id } });
    if (aliases.length) await transaction.productAlias.createMany({ data: aliases.map((alias) => ({ productId: id, alias, locale: "fr" })) });
    await transaction.auditLog.create({
      data: {
        action: "product_update",
        entityType: "Product",
        entityId: id,
        before: JSON.stringify({ sku: before.sku, price: Number(before.price), stockQty: before.stockQty, status: before.status, translations: before.translations, aliases: before.aliases }),
        after: JSON.stringify({ sku: updated.sku, nameFr: input.nameFr, nameEn: input.nameEn, costPrice: input.costPrice, profitMargin: input.profitMargin, price, stockQty: input.stockQty, status: input.status, aliases, wholesale: wholesaleProductData(input) }),
        reason: `Modification complète par ${adminEmail}`,
      },
    });
    return updated;
  });

  return NextResponse.json({ product });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { sku: true, traditionalName: true } });
  if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  try {
    await db.$transaction(async (transaction) => {
      await transaction.product.delete({ where: { id } });
      await transaction.auditLog.create({ data: { action: "product_delete", entityType: "Product", entityId: id, before: JSON.stringify(product), reason: `Suppression définitive par ${authorization.user.email}` } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ce produit est déjà lié à des recettes, des lots ou des commandes. Désactivez-le pour conserver la traçabilité." }, { status: 409 });
  }
}
