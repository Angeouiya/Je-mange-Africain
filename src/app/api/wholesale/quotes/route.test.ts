import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  productFindMany: vi.fn(),
  quoteCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.rateLimit }));
vi.mock("@/lib/db", () => ({ db: { product: { findMany: mocks.productFindMany }, $transaction: mocks.transaction } }));

import { POST } from "./route";

const product = {
  id: "product-attieke",
  traditionalName: "Attiéké",
  sku: "JMA-WHO-ATT",
  price: 6,
  wholesalePackLabel: "Carton de 6 sachets",
  wholesaleUnitsPerPack: 6,
  wholesaleMinPacks: 1,
  wholesalePrice: 32,
  wholesaleTier2MinPacks: 5,
  wholesaleTier2Price: 30,
  wholesaleTier3MinPacks: 10,
  wholesaleTier3Price: 28,
  stockQty: 80,
  reservedQty: 8,
  thermalClass: "REFRIGERATED",
  imageUrl: "/products/attieke.webp",
  imageEmoji: "",
  category: { slug: "feculents", nameFr: "Féculents" },
  translations: [{ locale: "fr", name: "Attiéké professionnel", description: "Semoule de manioc fraîche." }, { locale: "en", name: "Professional attieke", description: "Fresh cassava couscous." }],
};

const validBody = {
  locale: "fr",
  company: "Maison Awa",
  contactName: "Awa Traore",
  email: "AWA@MAISON.EXAMPLE",
  phone: "+33612345678",
  country: "FR",
  postalCode: "75011",
  deliveryRequirements: "Livraison réfrigérée le mardi matin.",
  additionalNeeds: "",
  items: [{ productId: product.id, packs: 5 }],
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/wholesale/quotes", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.42" }, body: JSON.stringify(body) });
}

describe("POST /api/wholesale/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue(null);
    mocks.productFindMany.mockResolvedValue([product]);
    mocks.quoteCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: "quote-1", ...data, currency: "EUR", createdAt: new Date("2026-09-05T12:00:00.000Z") }));
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({ wholesaleQuote: { create: mocks.quoteCreate }, auditLog: { create: mocks.auditCreate } }));
  });

  it("recalculates the active tier and records immutable product snapshots", async () => {
    const response = await POST(request(validBody));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.quote).toMatchObject({ id: "quote-1", status: "new", estimatedSubtotal: 150, totalPacks: 5, currency: "EUR" });
    expect(payload.quote.reference).toMatch(/^JMA-GROS-\d{6}-[A-F0-9]{6}$/);
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "published", isWholesale: true }) }));
    expect(mocks.quoteCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ email: "awa@maison.example", country: "France", estimatedSubtotal: 150, totalPacks: 5, items: { create: [expect.objectContaining({ productId: product.id, productNameFr: "Attiéké professionnel", productNameEn: "Professional attieke", packs: 5, unitPrice: 30, lineTotal: 150 })] } }), include: { items: true } });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "wholesale_quote_create", entityType: "WholesaleQuote", ip: "203.0.113.42" }) });
  });

  it("rejects quantities that no longer fit live available stock", async () => {
    const response = await POST(request({ ...validBody, items: [{ productId: product.id, packs: 13 }] }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("12 colis disponible");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
