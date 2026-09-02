import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { loadCustomerAccount } from "@/lib/customer-account";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

const MAX_SAVED_ITEMS = 200;
const SavedCollection = z.object({
  productIds: z.array(z.string().trim().min(1).max(120)).max(MAX_SAVED_ITEMS),
  recipeIds: z.array(z.string().trim().min(1).max(120)).max(MAX_SAVED_ITEMS),
}).strict();
const SavedChange = z.object({
  kind: z.enum(["product", "recipe"]),
  id: z.string().trim().min(1).max(120),
  saved: z.boolean(),
}).strict();

export async function GET(request: NextRequest) {
  const account = await authorizeSavedAccount(request);
  if (!account.ok) return account.response;
  return savedResponse(account.customerId);
}

export async function PUT(request: NextRequest) {
  const account = await authorizeSavedAccount(request);
  if (!account.ok) return account.response;
  const limited = await enforceRateLimit(request, "saved-library", account.customerId);
  if (limited) return limited;

  const parsed = SavedCollection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sélection enregistrée invalide." }, { status: 400 });

  const requestedProductIds = Array.from(new Set(parsed.data.productIds));
  const requestedRecipeIds = Array.from(new Set(parsed.data.recipeIds));
  const [products, recipes] = await Promise.all([
    db.product.findMany({ where: { id: { in: requestedProductIds }, status: "published" }, select: { id: true } }),
    db.recipe.findMany({ where: { id: { in: requestedRecipeIds }, status: "published" }, select: { id: true } }),
  ]);
  const productIds = products.map((product) => product.id);
  const recipeIds = recipes.map((recipe) => recipe.id);
  const operations = [
    db.favorite.deleteMany({ where: { customerId: account.customerId, ...(productIds.length ? { productId: { notIn: productIds } } : {}) } }),
    db.savedRecipe.deleteMany({ where: { customerId: account.customerId, ...(recipeIds.length ? { recipeId: { notIn: recipeIds } } : {}) } }),
    ...productIds.map((productId) => db.favorite.upsert({
      where: { customerId_productId: { customerId: account.customerId, productId } },
      update: {},
      create: { customerId: account.customerId, productId },
    })),
    ...recipeIds.map((recipeId) => db.savedRecipe.upsert({
      where: { customerId_recipeId: { customerId: account.customerId, recipeId } },
      update: {},
      create: { customerId: account.customerId, recipeId },
    })),
  ];
  await db.$transaction(operations);

  return NextResponse.json({ productIds, recipeIds }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const account = await authorizeSavedAccount(request);
  if (!account.ok) return account.response;
  const limited = await enforceRateLimit(request, "saved-library", account.customerId);
  if (limited) return limited;

  const parsed = SavedChange.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Modification invalide." }, { status: 400 });

  if (parsed.data.kind === "product") {
    const exists = await db.product.count({ where: { id: parsed.data.id, status: "published" } });
    if (!exists) return NextResponse.json({ error: "Produit indisponible." }, { status: 404 });
    if (parsed.data.saved) {
      await db.favorite.upsert({
        where: { customerId_productId: { customerId: account.customerId, productId: parsed.data.id } },
        update: {},
        create: { customerId: account.customerId, productId: parsed.data.id },
      });
    } else {
      await db.favorite.deleteMany({ where: { customerId: account.customerId, productId: parsed.data.id } });
    }
  } else {
    const exists = await db.recipe.count({ where: { id: parsed.data.id, status: "published" } });
    if (!exists) return NextResponse.json({ error: "Recette indisponible." }, { status: 404 });
    if (parsed.data.saved) {
      await db.savedRecipe.upsert({
        where: { customerId_recipeId: { customerId: account.customerId, recipeId: parsed.data.id } },
        update: {},
        create: { customerId: account.customerId, recipeId: parsed.data.id },
      });
    } else {
      await db.savedRecipe.deleteMany({ where: { customerId: account.customerId, recipeId: parsed.data.id } });
    }
  }

  return savedResponse(account.customerId);
}

async function authorizeSavedAccount(request: NextRequest) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return { ok: false as const, response: NextResponse.json({ error: "Authentification client requise." }, { status: 401 }) };
  const account = await loadCustomerAccount(session, true).catch(() => null);
  if (!account) return { ok: false as const, response: NextResponse.json({ error: "Compte client introuvable." }, { status: 404 }) };
  return { ok: true as const, customerId: account.customerId };
}

async function savedResponse(customerId: string) {
  const [favorites, savedRecipes] = await Promise.all([
    db.favorite.findMany({ where: { customerId, product: { status: "published" } }, orderBy: { createdAt: "desc" }, select: { productId: true } }),
    db.savedRecipe.findMany({ where: { customerId, recipe: { status: "published" } }, orderBy: { createdAt: "desc" }, select: { recipeId: true } }),
  ]);
  return NextResponse.json({
    productIds: favorites.map((favorite) => favorite.productId),
    recipeIds: savedRecipes.map((savedRecipe) => savedRecipe.recipeId),
  }, { headers: { "Cache-Control": "no-store" } });
}
