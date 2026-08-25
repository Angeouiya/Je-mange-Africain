import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";

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
  const parsed = ProductEditorialInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Les paramètres éditoriaux du produit sont invalides." }, { status: 400 });
  const { id } = await params;
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
