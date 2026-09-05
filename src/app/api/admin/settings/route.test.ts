import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  read: vi.fn(),
  upsert: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    platformConfiguration: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/platform-configuration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform-configuration")>();
  return {
    ...actual,
    readPlatformConfiguration: mocks.read,
    platformIntegrationStatus: (databaseAvailable: boolean) => [{ id: "database", state: databaseAvailable ? "ready" : "attention", provider: "PostgreSQL", capabilities: { connection: databaseAvailable } }],
  };
});

import { GET, PATCH } from "./route";

const configuration = {
  supportEmail: "support@je-mange-africain.com",
  supportPhone: "+33 1 84 80 20 26",
  supportHoursFr: "Du lundi au vendredi, de 9 h à 18 h",
  supportHoursEn: "Monday to Friday, 9am to 6pm",
  supportResponseHours: 36,
  businessCity: "Paris",
  businessCountry: "France",
};

function request(method: "GET" | "PATCH", body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/settings", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("admin platform settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "super-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.read.mockResolvedValue({ configuration, persisted: true, databaseAvailable: true, updatedBy: "direction@je-mange-africain.com", updatedAt: "2026-09-05T07:00:00.000Z" });
    mocks.upsert.mockResolvedValue({ id: "primary", ...configuration, updatedBy: "direction@je-mange-africain.com", updatedAt: new Date("2026-09-05T07:05:00.000Z") });
    mocks.audit.mockResolvedValue({ id: "audit-settings" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({ platformConfiguration: { upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
  });

  it("requires the settings read permission and returns readiness without credentials", async () => {
    const response = await GET(request("GET"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "settings", action: "read" });
    expect(payload.configuration.supportEmail).toBe(configuration.supportEmail);
    expect(payload.integrations[0]).toEqual(expect.objectContaining({ id: "database", state: "ready" }));
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("publishes a valid configuration and records the previous state", async () => {
    const next = { ...configuration, supportResponseHours: 24, businessCity: "Lyon" };
    mocks.upsert.mockResolvedValueOnce({ id: "primary", ...next, updatedBy: "direction@je-mange-africain.com", updatedAt: new Date("2026-09-05T07:05:00.000Z") });

    const response = await PATCH(request("PATCH", next));
    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "settings", action: "update" });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ businessCity: "Lyon", supportResponseHours: 24 }) }));
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "platform_configuration_update",
      before: JSON.stringify(configuration),
      after: JSON.stringify(next),
    }) });
  });

  it("rejects invalid public contact data before opening a transaction", async () => {
    const response = await PATCH(request("PATCH", { ...configuration, supportEmail: "not-an-email", supportResponseHours: 999 }));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
