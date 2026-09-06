import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  loadIdentity: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorize }));
vi.mock("@/lib/customer-account", () => ({ loadCustomerIdentity: mocks.loadIdentity }));
vi.mock("@/lib/db", () => ({ db: { wholesaleQuote: { findMany: mocks.findMany } } }));

import { GET } from "./route";

const quote = {
  id: "quote-1",
  reference: "JMA-GROS-260906-ABC123",
  status: "reviewing",
  locale: "fr",
  company: "Maison Awa",
  contactName: "Awa Traore",
  email: "awa@example.fr",
  phone: "+33612345678",
  country: "France",
  postalCode: "75011",
  deliveryRequirements: "Livraison réfrigérée le mardi matin.",
  additionalNeeds: null,
  estimatedSubtotal: 180,
  totalPacks: 6,
  currency: "EUR",
  adminNote: "Marge à confirmer en interne.",
  assignedTo: "direction@example.com",
  createdAt: new Date("2026-09-06T08:00:00.000Z"),
  updatedAt: new Date("2026-09-06T09:00:00.000Z"),
  items: [{ id: "item-1", productId: "product-1", productNameFr: "Attiéké pro", productNameEn: "Pro attieke", sku: "JMA-ATT", imageUrl: "/products/attieke.webp", packLabel: "Carton de 6", packs: 6, unitsPerPack: 6, unitPrice: 30, lineTotal: 180, thermalClass: "REFRIGERATED" }],
};

describe("GET /api/customer/wholesale-quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ id: "supabase-user", email: "awa@example.fr", role: "customer" });
    mocks.loadIdentity.mockResolvedValue({ userId: "user-1", customerId: "customer-1" });
    mocks.findMany.mockResolvedValue([quote]);
  });

  it("returns only quotes owned by the authenticated customer without internal fields", async () => {
    const response = await GET(new NextRequest("http://localhost/api/customer/wholesale-quotes"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: "customer-1" } }));
    expect(payload.quotes[0]).toMatchObject({ reference: quote.reference, estimatedSubtotal: 180, items: [expect.objectContaining({ productNameFr: "Attiéké pro", lineTotal: 180 })] });
    expect(payload.quotes[0]).not.toHaveProperty("adminNote");
    expect(payload.quotes[0]).not.toHaveProperty("assignedTo");
  });

  it("rejects anonymous access before querying the database", async () => {
    mocks.authorize.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/customer/wholesale-quotes"));

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
