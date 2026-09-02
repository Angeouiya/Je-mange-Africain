import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { sendPushToUser } from "@/lib/push-server";
import {
  canTransitionOrder,
  fulfillmentReadinessIssue,
  fulfillmentStatusLabel,
  orderFulfillmentInput,
  shipmentStatusForOrder,
  type FulfillmentReadinessIssue,
  type FulfillmentShipmentSnapshot,
} from "@/lib/admin-order-fulfillment";

export const dynamic = "force-dynamic";

const readinessMessages: Record<FulfillmentReadinessIssue, { fr: string; en: string }> = {
  parcel_required: { fr: "Créez au moins un colis avant l'expédition.", en: "Create at least one parcel before shipping." },
  carrier_required: { fr: "Attribuez un transporteur à chaque colis avant l'expédition.", en: "Assign a carrier to every parcel before shipping." },
  tracking_required: { fr: "Attribuez un numéro de suivi à chaque colis avant l'expédition.", en: "Assign a tracking number to every parcel before shipping." },
  code_required: { fr: "Attribuez un code de remise à chaque colis avant la tournée.", en: "Assign a handover code to every parcel before delivery." },
  proof_required: { fr: "Ajoutez une photo de remise ou une signature pour chaque colis livré.", en: "Add a delivery photo or signature for every delivered parcel." },
};

function nullable(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "orders", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = orderFulfillmentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Les informations logistiques sont incomplètes ou invalides.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const input = parsed.data;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { select: { thermalClass: true } },
      shipments: { include: { carrier: true } },
      customer: { select: { userId: true } },
    },
  });
  if (!order) return NextResponse.json({ error: input.locale === "fr" ? "Commande introuvable." : "Order not found." }, { status: 404 });

  if (input.status && !canTransitionOrder(order.status, input.status)) {
    const expected = order.status === input.status ? null : input.status;
    return NextResponse.json({
      error: input.locale === "fr"
        ? `La commande ne peut pas passer directement de « ${order.status} » à « ${expected || input.status} ».`
        : `The order cannot move directly from “${order.status}” to “${expected || input.status}”.`,
    }, { status: 409 });
  }

  const selectedShipment = input.shipment?.id
    ? order.shipments.find((shipment) => shipment.id === input.shipment?.id)
    : order.shipments[0];
  if (input.shipment?.id && !selectedShipment) {
    return NextResponse.json({ error: input.locale === "fr" ? "Ce colis n'appartient pas à la commande." : "This parcel does not belong to the order." }, { status: 404 });
  }

  const snapshots: FulfillmentShipmentSnapshot[] = order.shipments.map((shipment) => ({
    carrier: shipment.carrier?.name || null,
    trackingNumber: shipment.trackingNumber,
    confirmCode: shipment.confirmCode,
    proofPhoto: shipment.proofPhoto,
    signature: shipment.signature,
  }));
  if (input.shipment) {
    const override: FulfillmentShipmentSnapshot = {
      carrier: input.shipment.carrier !== undefined ? nullable(input.shipment.carrier) || null : selectedShipment?.carrier?.name || null,
      trackingNumber: input.shipment.trackingNumber !== undefined ? nullable(input.shipment.trackingNumber) || null : selectedShipment?.trackingNumber || null,
      confirmCode: input.shipment.confirmCode !== undefined ? nullable(input.shipment.confirmCode) || null : selectedShipment?.confirmCode || null,
      proofPhoto: input.shipment.proofPhoto !== undefined ? nullable(input.shipment.proofPhoto) || null : selectedShipment?.proofPhoto || null,
      signature: input.shipment.signature !== undefined ? nullable(input.shipment.signature) || null : selectedShipment?.signature || null,
    };
    if (selectedShipment) snapshots[order.shipments.indexOf(selectedShipment)] = override;
    else snapshots.push(override);
  }

  if (input.status) {
    const issue = fulfillmentReadinessIssue(input.status, snapshots);
    if (issue) return NextResponse.json({ error: readinessMessages[issue][input.locale] }, { status: 409 });
  }

  let updatedShipmentId = selectedShipment?.id || null;
  await db.$transaction(async (transaction) => {
    let carrierId = selectedShipment?.carrierId || null;
    if (input.shipment?.carrier !== undefined) {
      const carrierName = nullable(input.shipment.carrier);
      if (carrierName) {
        const carrier = await transaction.carrier.findFirst({ where: { name: carrierName } })
          || await transaction.carrier.create({ data: { name: carrierName } });
        carrierId = carrier.id;
      } else {
        carrierId = null;
      }
    }

    if (input.shipment) {
      const shipmentData = {
        ...(input.shipment.carrier !== undefined ? { carrierId } : {}),
        ...(input.shipment.thermalClass !== undefined ? { thermalClass: input.shipment.thermalClass } : {}),
        ...(input.shipment.trackingNumber !== undefined ? { trackingNumber: nullable(input.shipment.trackingNumber) } : {}),
        ...(input.shipment.estimatedDelivery !== undefined ? { estimatedDelivery: input.shipment.estimatedDelivery ? new Date(input.shipment.estimatedDelivery) : null } : {}),
        ...(input.shipment.confirmCode !== undefined ? { confirmCode: nullable(input.shipment.confirmCode) } : {}),
        ...(input.shipment.proofPhoto !== undefined ? { proofPhoto: nullable(input.shipment.proofPhoto) } : {}),
        ...(input.shipment.signature !== undefined ? { signature: nullable(input.shipment.signature) } : {}),
      };
      if (selectedShipment) {
        await transaction.shipment.update({ where: { id: selectedShipment.id }, data: shipmentData });
      } else {
        const created = await transaction.shipment.create({
          data: {
            orderId: id,
            thermalClass: input.shipment.thermalClass || order.items[0]?.thermalClass || "AMBIANT",
            carrierId,
            trackingNumber: nullable(input.shipment.trackingNumber),
            estimatedDelivery: input.shipment.estimatedDelivery ? new Date(input.shipment.estimatedDelivery) : null,
            confirmCode: nullable(input.shipment.confirmCode),
            proofPhoto: nullable(input.shipment.proofPhoto),
            signature: nullable(input.shipment.signature),
          },
        });
        updatedShipmentId = created.id;
      }
    }

    if (input.status) {
      await transaction.shipment.updateMany({
        where: { orderId: id },
        data: {
          status: shipmentStatusForOrder(input.status),
          ...(input.status === "delivered" ? { actualDelivery: new Date() } : {}),
        },
      });
      await transaction.orderEvent.create({
        data: {
          orderId: id,
          status: input.status,
          label: fulfillmentStatusLabel(input.status, input.locale),
          actor: authorization.user.email,
        },
      });
    }

    await transaction.order.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: nullable(input.notes) } : {}),
        ...(input.shipment?.carrier !== undefined ? { carrierId } : {}),
      },
    });
    await transaction.auditLog.create({
      data: {
        action: input.status ? "order_fulfillment_advance" : "order_logistics_update",
        entityType: "Order",
        entityId: id,
        before: JSON.stringify({ status: order.status, notes: order.notes, shipmentId: selectedShipment?.id || null }),
        after: JSON.stringify(input),
        reason: `Mise à jour logistique par ${authorization.user.email}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      },
    });
  });

  if (input.status && order.customer?.userId) {
    const titleFr = "Votre commande avance";
    const titleEn = "Your order is moving";
    const bodyFr = `${order.number} : ${fulfillmentStatusLabel(input.status, "fr").toLowerCase()}.`;
    const bodyEn = `${order.number}: ${fulfillmentStatusLabel(input.status, "en").toLowerCase()}.`;
    const notification = await db.notification.create({
      data: {
        userId: order.customer.userId,
        channel: "push",
        type: "order",
        titleFr,
        titleEn,
        bodyFr,
        bodyEn,
        url: `/?view=order-tracking&orderId=${id}`,
      },
    }).catch(() => null);
    const delivery = await sendPushToUser(order.customer.userId, {
      fr: { title: titleFr, body: bodyFr, url: `/?view=order-tracking&orderId=${id}`, type: "order", tag: `order-${id}` },
      en: { title: titleEn, body: bodyEn, url: `/?view=order-tracking&orderId=${id}`, type: "order", tag: `order-${id}` },
    }).catch(() => ({ total: 0, sent: 0, failed: 0, configured: false }));
    if (notification && delivery.sent > 0) {
      await db.notification.update({ where: { id: notification.id }, data: { sent: true } }).catch(() => undefined);
    }
  }

  const updated = await db.order.findUniqueOrThrow({
    where: { id },
    include: {
      shipments: { include: { carrier: true } },
      timeline: { orderBy: { at: "asc" } },
    },
  });

  return NextResponse.json({
    updatedShipmentId,
    order: {
      status: updated.status,
      notes: updated.notes,
      shipments: updated.shipments.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        thermalClass: shipment.thermalClass,
        status: shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
        confirmCode: shipment.confirmCode,
        proofPhoto: shipment.proofPhoto,
        signature: shipment.signature,
        carrier: shipment.carrier?.name || null,
        trackingUrl: shipment.carrier?.trackingUrl || null,
      })),
      timeline: updated.timeline.map((event) => ({ status: event.status, label: event.label, at: event.at, actor: event.actor })),
    },
  });
}
