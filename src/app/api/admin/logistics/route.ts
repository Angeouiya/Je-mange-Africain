import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { deliveryServiceForDelay } from "@/lib/admin-logistics";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "read" });
  if (!authorization.ok) return authorization.response;

  const [carriers, zones] = await Promise.all([
    db.carrier.findMany({
      include: { _count: { select: { shipments: true, zones: true } } },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
    }),
    db.deliveryZone.findMany({ include: { carrier: true }, orderBy: [{ country: "asc" }, { minDelayHours: "asc" }] }),
  ]);
  const serializedZones = zones.map((zone) => ({
    id: zone.id,
    carrierId: zone.carrierId,
    carrier: zone.carrier?.name || null,
    country: zone.country,
    postalPattern: zone.postalPattern,
    service: deliveryServiceForDelay(zone.minDelayHours),
    baseFee: Number(zone.baseFee),
    perKgFee: Number(zone.perKgFee),
    frozenSurcharge: Number(zone.frozenSurcharge),
    minDelayHours: zone.minDelayHours,
  }));
  const countries = [...new Set(serializedZones.map((zone) => zone.country))];
  const serviceCounts = serializedZones.reduce<Record<string, number>>((counts, zone) => {
    counts[zone.service] = (counts[zone.service] || 0) + 1;
    return counts;
  }, { standard: 0, express: 0, relay: 0 });

  return NextResponse.json({
    carriers: carriers.map((carrier) => ({
      id: carrier.id,
      name: carrier.name,
      logo: carrier.logo,
      trackingUrl: carrier.trackingUrl,
      rating: carrier.rating,
      shipmentCount: carrier._count.shipments,
      zoneCount: carrier._count.zones,
    })),
    zones: serializedZones,
    summary: {
      carriers: carriers.length,
      routes: serializedZones.length,
      countries: countries.length,
      coldChainRoutes: serializedZones.filter((zone) => zone.service !== "relay").length,
      serviceCounts,
    },
  });
}
