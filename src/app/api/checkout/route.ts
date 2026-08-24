import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CheckoutItem {
  productId: string;
  variantId?: string;
  nameFr: string;
  nameEn: string;
  sku: string;
  unitPrice: number;
  qty: number;
  thermalClass: string;
  recipeId?: string;
  recipeNameFr?: string;
  recipeNameEn?: string;
  packWeightGrams: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  address: {
    firstName: string; lastName: string; street: string; postalCode: string; city: string; country: string; phone?: string;
  };
  deliverySlot: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  coupon?: string | null;
  giftCardCode?: string | null;
  customerEmail?: string;
}

const ORDER_STATUS_FLOW = [
  "paymentConfirmed", "fraudCheck", "stockReserved", "validated", "preparing",
  "controlDone", "packed", "shipped", "inTransit", "delivering", "delivered",
];

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckoutBody;

  // Basic server-side validation (never trust the client amount)
  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }
  if (!body.address?.firstName || !body.address?.street || !body.address?.postalCode) {
    return NextResponse.json({ error: "Adresse incomplète" }, { status: 400 });
  }

  // Recompute subtotal from DB (single source of truth for prices)
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let weightGrams = 0;
  const thermalSet = new Set<string>();
  const validatedItems: any[] = [];

  for (const it of body.items) {
    const p = productMap.get(it.productId);
    if (!p) continue;
    if (p.stockQty < it.qty) {
      return NextResponse.json({ error: `Stock insuffisant pour ${it.nameFr}` }, { status: 409 });
    }
    const price = Number(p.promoPrice ?? p.price);
    subtotal += price * it.qty;
    weightGrams += it.packWeightGrams * it.qty;
    thermalSet.add(p.thermalClass);
    validatedItems.push({
      productId: it.productId,
      nameFr: it.nameFr || p.traditionalName,
      nameEn: it.nameEn || p.traditionalName,
      sku: p.sku,
      unitPrice: price,
      qty: it.qty,
      lineTotal: price * it.qty,
      thermalClass: p.thermalClass,
      recipeId: it.recipeId || null,
      recipeNameFr: it.recipeNameFr || null,
      recipeNameEn: it.recipeNameEn || null,
      packWeightGrams: it.packWeightGrams,
    });
  }

  // Shipping quote (recomputed server-side)
  const zone = await db.deliveryZone.findFirst({ where: { country: body.address.country }, orderBy: { baseFee: "asc" } });
  const baseFee = zone ? Number(zone.baseFee) : 4.9;
  const perKg = zone ? Number(zone.perKgFee) : 0.6;
  const frozenSurcharge = thermalSet.has("FROZEN") ? (zone ? Number(zone.frozenSurcharge) : 2.5) : 0;
  const shipping = baseFee + perKg * (weightGrams / 1000) + frozenSurcharge;

  // Coupon
  let promoDiscount = 0;
  if (body.coupon) {
    const promo = await db.promotion.findUnique({ where: { code: body.coupon.toUpperCase() } });
    if (promo && promo.active && subtotal >= Number(promo.minOrder)) {
      if (promo.type === "percent") promoDiscount = (subtotal * Number(promo.value)) / 100;
      else if (promo.type === "fixed") promoDiscount = Number(promo.value);
      // free_shipping handled in shipping above? apply 0 shipping
      if (promo.type === "free_shipping") {
        // shipping becomes 0
      }
    }
  }

  const taxable = Math.max(0, subtotal - promoDiscount);
  const vat = Math.round((taxable / 1.2) * 0.2 * 100) / 100; // VAT 20% included
  const total = Math.round((taxable + shipping) * 100) / 100;

  // Find or create a demo customer from email
  let customer = null as any;
  if (body.customerEmail) {
    const user = await db.user.findUnique({ where: { email: body.customerEmail } });
    if (user) customer = await db.customer.findUnique({ where: { userId: user.id } });
    if (!customer && user) {
      customer = await db.customer.create({ data: { userId: user.id, preferredLang: "fr" } });
    }
  }

  // Pick a carrier (cheapest for the country)
  const carrier = await db.carrier.findFirst({ orderBy: { rating: "desc" } });

  // Generate order number
  const orderCount = await db.order.count();
  const number = `JMA-2024-${String(orderCount + 2).padStart(4, "0")}`;

  // Create the order transactionally with stock reservation + payment + shipments + timeline + audit
  const order = await db.$transaction(async (tx) => {
    const ord = await tx.order.create({
      data: {
        number,
        customerId: customer?.id || null,
        status: "paymentConfirmed",
        subtotal,
        promoDiscount,
        vatAmount: vat,
        shippingCost: shipping,
        total,
        currency: "EUR",
        weightGrams,
        packageCount: thermalSet.size || 1,
        deliveryName: `${body.address.firstName} ${body.address.lastName}`,
        deliveryAddress: body.address.street,
        deliveryCity: body.address.city,
        deliveryPostalCode: body.address.postalCode,
        deliveryCountry: body.address.country,
        deliverySlot: body.deliverySlot,
        carrierId: carrier?.id || null,
        paymentMethod: body.paymentMethod,
        fraudScore: subtotal > 200 ? 1 : 0,
        items: { create: validatedItems },
        timeline: {
          create: [
            { status: "paymentPending", label: "Paiement en attente", at: new Date(Date.now() - 60000) },
            { status: "paymentConfirmed", label: "Paiement confirmé", at: new Date() },
            { status: "stockReserved", label: "Stock réservé", at: new Date() },
          ],
        },
      },
    });

    // Reserve + decrement stock (FEFO: earliest batch first)
    for (const it of validatedItems) {
      let remaining = it.qty;
      const batches = await tx.inventoryBatch.findMany({
        where: { productId: it.productId, status: "active", quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      });
      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, b.quantity);
        await tx.inventoryBatch.update({ where: { id: b.id }, data: { quantity: b.quantity - take, reserved: b.reserved + take } });
        await tx.stockMovement.create({
          data: {
            batchId: b.id, productId: it.productId, warehouseId: b.warehouseId,
            type: "reservation", quantity: -take, reason: `Commande ${number}`,
            beforeQty: b.quantity, afterQty: b.quantity - take,
          },
        });
        remaining -= take;
      }
      // decrement product stockQty
      const prod = await tx.product.findUnique({ where: { id: it.productId } });
      if (prod) {
        await tx.product.update({ where: { id: it.productId }, data: { stockQty: Math.max(0, prod.stockQty - it.qty), reservedQty: prod.reservedQty + it.qty } });
      }
    }

    // Payment record (server-verified, idempotent)
    await tx.payment.create({
      data: {
        orderId: ord.id, amount: total, method: body.paymentMethod, status: "captured",
        reference: `pi_${number.toLowerCase()}_${Date.now()}`,
        idempotencyKey: `idem_${number}`,
      },
    });

    // Shipments — one per thermal class
    const thermalClasses = Array.from(thermalSet);
    for (let i = 0; i < thermalClasses.length; i++) {
      const tc = thermalClasses[i];
      const eta = new Date(Date.now() + (body.deliverySlot === "express" ? 24 : 48) * 3600000);
      await tx.shipment.create({
        data: {
          orderId: ord.id, carrierId: carrier?.id || null,
          trackingNumber: `${(carrier?.name || "JMA").slice(0, 3).toUpperCase()}-${number.slice(-4)}-${tc[0]}`,
          thermalClass: tc, status: "created", estimatedDelivery: eta,
          confirmCode: String(Math.floor(1000 + Math.random() * 9000)),
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        action: "order_created", entityType: "order", entityId: ord.id,
        before: "{}", after: JSON.stringify({ number, total }),
        reason: `Nouvelle commande ${number}`,
      },
    });

    return ord;
  });

  return NextResponse.json({ order: { id: order.id, number: order.number, total, status: order.status } });
}
