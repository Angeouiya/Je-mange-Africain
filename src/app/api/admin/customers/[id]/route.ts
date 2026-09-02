import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { customerSegment, NON_COMMERCIAL_ORDER_STATUSES } from "@/lib/customer-analytics";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CustomerNoteInput = z.object({ notes: z.string().max(2000) }).strict();

function localizedValue<T extends { locale: string }>(translations: T[], locale: "fr" | "en") {
  return translations.find((translation) => translation.locale === locale)
    || translations.find((translation) => translation.locale === "fr")
    || translations[0];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "customers", action: "read" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";

  const [customer, orderAggregate, statusGroups, topProductGroups] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        loyaltyPoints: true,
        walletCredit: true,
        preferredLang: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        orders: {
          where: { status: { not: "cart" } },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            createdAt: true,
            paymentMethod: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { method: true, status: true },
            },
            items: {
              select: { id: true, nameFr: true, nameEn: true, qty: true, imageUrl: true },
            },
          },
        },
        tickets: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, number: true, subject: true, priority: true, status: true, assignee: true, updatedAt: true },
        },
        favorites: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            productId: true,
            product: {
              select: {
                traditionalName: true,
                imageUrl: true,
                translations: { select: { locale: true, name: true } },
              },
            },
          },
        },
        savedRecipes: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            recipeId: true,
            recipe: {
              select: {
                country: true,
                imageUrl: true,
                translations: { select: { locale: true, title: true } },
              },
            },
          },
        },
        _count: {
          select: {
            addresses: true,
            favorites: true,
            savedRecipes: true,
            tickets: { where: { status: { in: ["open", "pending"] } } },
          },
        },
      },
    }),
    db.order.aggregate({
      where: { customerId: id, status: { notIn: [...NON_COMMERCIAL_ORDER_STATUSES] } },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true },
      _max: { createdAt: true },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { customerId: id },
      _count: { _all: true },
    }),
    db.orderItem.groupBy({
      by: ["productId", "nameFr", "nameEn", "imageUrl"],
      where: { order: { customerId: id, status: { notIn: [...NON_COMMERCIAL_ORDER_STATUSES] } } },
      _sum: { qty: true, lineTotal: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);

  if (!customer) {
    return NextResponse.json({ error: locale === "fr" ? "Client introuvable." : "Customer not found." }, { status: 404 });
  }

  const statusCount = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const orders = orderAggregate._count._all;
  const lifetimeValue = Number(orderAggregate._sum.total || 0);
  const averageBasket = Number(orderAggregate._avg.total || 0);
  const lastOrderAt = orderAggregate._max.createdAt?.toISOString() || null;
  const primaryAddress = customer.addresses[0];
  const name = `${customer.user.firstName || ""} ${customer.user.lastName || ""}`.trim() || customer.user.email;
  const activeOrders = statusGroups.reduce((total, group) => (
    ["cart", "cancelled", "delivered", "refunded", "failed"].includes(group.status) ? total : total + group._count._all
  ), 0);

  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.user.email,
      name,
      phone: customer.user.phone || primaryAddress?.phone || null,
      city: primaryAddress?.city || "—",
      country: primaryAddress?.country || "—",
      orders,
      loyalty: customer.loyaltyPoints,
      walletCredit: Number(customer.walletCredit),
      preferredLang: customer.preferredLang,
      lifetimeValue,
      averageBasket,
      lastOrderAt,
      joinedAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      addresses: customer._count.addresses,
      favorites: customer._count.favorites,
      savedRecipes: customer._count.savedRecipes,
      openTickets: customer._count.tickets,
      segment: customerSegment({ orders, lifetimeValue, loyalty: customer.loyaltyPoints, lastOrderAt }),
      notes: customer.notes || "",
    },
    metrics: {
      completedOrders: statusCount.get("delivered") || 0,
      activeOrders,
      cancelledOrders: statusCount.get("cancelled") || 0,
    },
    addresses: customer.addresses.map((address) => ({
      id: address.id,
      label: address.label,
      recipient: `${address.firstName} ${address.lastName}`.trim(),
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
    })),
    recentOrders: customer.orders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((total, item) => total + item.qty, 0),
      paymentMethod: order.payments[0]?.method || order.paymentMethod,
      paymentStatus: order.payments[0]?.status || null,
      items: order.items.slice(0, 4).map((item) => ({
        id: item.id,
        name: locale === "fr" ? item.nameFr : item.nameEn,
        qty: item.qty,
        imageUrl: item.imageUrl,
      })),
    })),
    topProducts: topProductGroups.map((product) => ({
      productId: product.productId,
      name: locale === "fr" ? product.nameFr : product.nameEn,
      imageUrl: product.imageUrl,
      quantity: product._sum.qty || 0,
      revenue: Number(product._sum.lineTotal || 0),
    })),
    favorites: customer.favorites.map((favorite) => ({
      id: favorite.id,
      productId: favorite.productId,
      name: localizedValue(favorite.product.translations, locale)?.name || favorite.product.traditionalName,
      imageUrl: favorite.product.imageUrl,
    })),
    savedRecipes: customer.savedRecipes.map((savedRecipe) => ({
      id: savedRecipe.id,
      recipeId: savedRecipe.recipeId,
      title: localizedValue(savedRecipe.recipe.translations, locale)?.title || savedRecipe.recipeId,
      country: savedRecipe.recipe.country,
      imageUrl: savedRecipe.recipe.imageUrl,
    })),
    tickets: customer.tickets.map((ticket) => ({ ...ticket, updatedAt: ticket.updatedAt.toISOString() })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "customers", action: "update" });
  if (!authorization.ok) return authorization.response;
  const parsed = CustomerNoteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La note interne ne peut pas dépasser 2 000 caractères." }, { status: 400 });
  const { id } = await params;
  const before = await db.customer.findUnique({ where: { id }, select: { notes: true } });
  if (!before) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const notes = parsed.data.notes.trim() || null;

  const customer = await db.$transaction(async (transaction) => {
    const updated = await transaction.customer.update({ where: { id }, data: { notes }, select: { notes: true, updatedAt: true } });
    await transaction.auditLog.create({
      data: {
        action: "customer_note_update",
        entityType: "Customer",
        entityId: id,
        before: JSON.stringify(before),
        after: JSON.stringify({ notes }),
        reason: `Mise à jour par ${authorization.user.email}`,
      },
    });
    return updated;
  });

  return NextResponse.json({ notes: customer.notes || "", updatedAt: customer.updatedAt.toISOString() });
}
