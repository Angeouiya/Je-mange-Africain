import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({ db: { wholesaleQuote: { findMany: mocks.findMany } } }));

import { GET } from "./route";

describe("GET /api/admin/wholesale-quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "direction@example.fr", role: "super_admin" } });
    mocks.findMany.mockResolvedValue([{ id: "quote-1", reference: "JMA-GROS-260905-A1B2C3", status: "new", locale: "fr", company: "Maison Awa", contactName: "Awa Traore", email: "awa@example.fr", phone: "+33612345678", country: "France", postalCode: "75011", deliveryRequirements: "Livraison réfrigérée.", additionalNeeds: null, estimatedSubtotal: "150.00", totalPacks: 5, currency: "EUR", adminNote: null, assignedTo: null, createdAt: new Date("2026-09-05T12:00:00.000Z"), updatedAt: new Date("2026-09-05T12:00:00.000Z"), items: [{ id: "line-1", productId: "product-1", productNameFr: "Attiéké professionnel", productNameEn: "Professional attieke", sku: "JMA-WHO-ATT", imageUrl: "/products/attieke.webp", packLabel: "Carton de 6 sachets", packs: 5, unitsPerPack: 6, unitPrice: "30.00", lineTotal: "150.00", thermalClass: "REFRIGERATED" }] }]);
  });

  it("uses order read permission and returns numeric commercial values", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/wholesale-quotes"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "orders", action: "read" });
    expect(payload.quotes[0]).toMatchObject({ estimatedSubtotal: 150, items: [{ unitPrice: 30, lineTotal: 150 }] });
  });
});
