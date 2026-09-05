import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), findUnique: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({ db: { wholesaleQuote: { findUnique: mocks.findUnique }, $transaction: mocks.transaction } }));

import { PATCH } from "./route";

const before = { id: "quote-1", reference: "JMA-GROS-260905-A1B2C3", status: "reviewing", locale: "fr", company: "Maison Awa", contactName: "Awa Traore", email: "awa@example.fr", phone: "+33612345678", country: "France", postalCode: "75011", deliveryRequirements: "Livraison réfrigérée.", additionalNeeds: null, estimatedSubtotal: 150, totalPacks: 5, currency: "EUR", adminNote: null, assignedTo: null, createdAt: new Date("2026-09-05T12:00:00.000Z"), updatedAt: new Date("2026-09-05T12:00:00.000Z"), items: [] };
const params = { params: Promise.resolve({ id: before.id }) };
const request = (status: string) => new NextRequest(`http://localhost/api/admin/wholesale-quotes/${before.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "fr", status, adminNote: "Transport frigorifique à confirmer.", assignedTo: "Équipe grands comptes" }) });

describe("PATCH /api/admin/wholesale-quotes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "direction@example.fr", role: "super_admin" } });
    mocks.findUnique.mockResolvedValue(before);
    mocks.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ ...before, ...data, updatedAt: new Date("2026-09-05T13:00:00.000Z") }));
    mocks.audit.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({ wholesaleQuote: { update: mocks.update }, auditLog: { create: mocks.audit } }));
  });

  it("advances a qualified request and audits the commercial owner", async () => {
    const response = await PATCH(request("quoted"), params);

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "orders", action: "update" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "quoted", adminNote: "Transport frigorifique à confirmer.", assignedTo: "Équipe grands comptes" } }));
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "wholesale_quote_status_change", entityType: "WholesaleQuote", entityId: before.id }) });
  });

  it("blocks a direct agreement before an offer has been sent", async () => {
    const response = await PATCH(request("accepted"), params);
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
