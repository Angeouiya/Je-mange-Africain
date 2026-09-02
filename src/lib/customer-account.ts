import { db } from "@/lib/db";
import { normalizePhone, type CustomerSession } from "@/lib/customer-auth";
import { z } from "zod";

export const customerAddressInput = z.object({
  label: z.string().trim().min(2).max(40),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  street: z.string().trim().min(3).max(180),
  postalCode: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(80),
  phone: z.string().trim().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),
  isDefault: z.boolean().default(false),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export async function loadCustomerAccount(session: CustomerSession, createMissing = false) {
  const email = session.email.trim().toLowerCase();
  let directory = await findDirectory(email);

  if (!directory && createMissing) {
    await db.user.create({
      data: {
        email,
        phone: session.phone || null,
        firstName: session.firstName,
        lastName: session.lastName,
        role: "customer",
        isActive: true,
        customer: { create: { preferredLang: "fr" } },
      },
    });
    directory = await findDirectory(email);
  }

  if (directory && !directory.customer && createMissing) {
    await db.customer.create({ data: { userId: directory.id, preferredLang: "fr" } });
    directory = await findDirectory(email);
  }

  if (!directory || directory.role !== "customer" || !directory.isActive || !directory.customer) return null;

  return {
    userId: directory.id,
    customerId: directory.customer.id,
    customer: {
      ...session,
      email: directory.email,
      phone: directory.phone || session.phone,
      firstName: directory.firstName || session.firstName,
      lastName: directory.lastName || session.lastName,
      loyaltyPoints: directory.customer.loyaltyPoints,
      walletCredit: Number(directory.customer.walletCredit),
      preferredLang: directory.customer.preferredLang === "en" ? "en" as const : "fr" as const,
    },
    addresses: directory.customer.addresses.map((address) => ({
      id: address.id,
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country,
      phone: address.phone || "",
      isDefault: address.isDefault,
    })),
    favoriteProductIds: directory.customer.favorites.map((favorite) => favorite.productId),
    savedRecipeIds: directory.customer.savedRecipes.map((savedRecipe) => savedRecipe.recipeId),
  };
}

async function findDirectory(email: string) {
  return db.user.findUnique({
    where: { email },
    include: {
      customer: {
        include: {
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
          favorites: { where: { product: { status: "published" } }, orderBy: { createdAt: "desc" }, select: { productId: true } },
          savedRecipes: { where: { recipe: { status: "published" } }, orderBy: { createdAt: "desc" }, select: { recipeId: true } },
        },
      },
    },
  });
}
