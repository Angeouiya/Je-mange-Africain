import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { productImageReference } from "@/lib/admin-product-schema";

export const dynamic = "force-dynamic";

const CategoryImageInput = z.object({
  imageUrl: z.union([productImageReference, z.literal(""), z.null()]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = CategoryImageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le visuel du rayon est invalide." }, { status: 400 });

  const { id } = await params;
  const before = await db.category.findUnique({
    where: { id },
    select: { id: true, slug: true, nameFr: true, nameEn: true, imageUrl: true },
  });
  if (!before) return NextResponse.json({ error: "Rayon introuvable." }, { status: 404 });

  const imageUrl = parsed.data.imageUrl || null;
  const category = await db.$transaction(async (transaction) => {
    const updated = await transaction.category.update({
      where: { id },
      data: { imageUrl },
      select: { id: true, slug: true, nameFr: true, nameEn: true, imageUrl: true, color: true, sortOrder: true },
    });
    await transaction.auditLog.create({
      data: {
        action: "category_image_update",
        entityType: "Category",
        entityId: id,
        before: JSON.stringify({ imageUrl: before.imageUrl }),
        after: JSON.stringify({ imageUrl }),
        reason: `Visuel de rayon modifié par ${authorization.user.email}`,
      },
    });
    return updated;
  });

  return NextResponse.json({ category });
}
