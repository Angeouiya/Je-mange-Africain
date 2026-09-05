import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    promotion: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));

import { GET, POST } from "./route";

const validPromotion = {
  code: "epices15",
  type: "percent",
  value: 15,
  minOrder: 40,
  appliesTo: "category",
  targetId: "category-spices",
  startsAt: "2026-09-10T08:00:00.000Z",
  endsAt: "2026-09-30T22:00:00.000Z",
  usageLimit: 250,
  active: true,
};

function request(method: "GET" | "POST", body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/promotions", {
    method,
    headers: body ? { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.20" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("admin promotion collection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "marketing@je-mange-africain.com", role: "marketing" } });
    mocks.findMany.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: "promotion-1", ...validPromotion, code: "EPICES15", usedCount: 0 });
    mocks.audit.mockResolvedValue({ id: "audit-promotion-1" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({ promotion: { create: mocks.create }, auditLog: { create: mocks.audit } }));
  });

  it("lists promotions through the marketing read permission", async () => {
    const response = await GET(request("GET"));

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "marketing", action: "read" });
    expect(mocks.findMany).toHaveBeenCalledWith({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  });

  it("normalizes and audits a valid commercial rule", async () => {
    const response = await POST(request("POST", validPromotion));

    expect(response.status).toBe(201);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "marketing", action: "create" });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: "EPICES15", value: 15, appliesTo: "category", targetId: "category-spices", startsAt: new Date(validPromotion.startsAt) }) });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "promotion_create", entityType: "Promotion", ip: "203.0.113.20" }) });
  });

  it("rejects a promotion that could erase the margin before a transaction starts", async () => {
    const response = await POST(request("POST", { ...validPromotion, value: 95 }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
