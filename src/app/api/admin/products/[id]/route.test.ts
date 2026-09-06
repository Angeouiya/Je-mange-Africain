import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => {
  const transactionClient = {
    product: { update: mocks.productUpdate },
    auditLog: { create: mocks.auditCreate },
  };
  return {
    db: {
      product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate, findFirst: vi.fn() },
      category: { findUnique: vi.fn() },
      productTranslation: { upsert: vi.fn() },
      productAlias: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: mocks.auditCreate },
      $transaction: mocks.transaction.mockImplementation((operation: (client: typeof transactionClient) => unknown) => operation(transactionClient)),
    },
  };
});

import { PATCH } from "@/app/api/admin/products/[id]/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/products/product-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.12" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/products/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.transaction.mockImplementation((operation) => operation({
      product: { update: mocks.productUpdate },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("marks a product as out of stock while preserving reserved units", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "product-1",
      sku: "JMA-ATT-001",
      traditionalName: "Attiéké",
      stockQty: 12,
      reservedQty: 4,
      status: "published",
    });
    mocks.productUpdate.mockResolvedValue({ id: "product-1", sku: "JMA-ATT-001", stockQty: 4, reservedQty: 4, status: "published" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });

    const response = await PATCH(request({ action: "mark_out_of_stock" }), { params: Promise.resolve({ id: "product-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "catalog", action: "update" });
    expect(mocks.productUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "product-1" },
      data: { stockQty: 4 },
    }));
    expect(payload.product).toMatchObject({ id: "product-1", stockQty: 4, reservedQty: 4, availableQty: 0 });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "product_stock_depleted",
      entityType: "Product",
      entityId: "product-1",
      ip: "203.0.113.12",
    }) });
  });

  it("does not audit a stock depletion for an unknown product", async () => {
    mocks.productFindUnique.mockResolvedValue(null);

    const response = await PATCH(request({ action: "mark_out_of_stock" }), { params: Promise.resolve({ id: "missing-product" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Produit introuvable.");
    expect(mocks.productUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
