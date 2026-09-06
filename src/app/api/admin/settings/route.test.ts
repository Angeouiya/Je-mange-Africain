import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  read: vi.fn(),
  upsert: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
  paymentReadiness: vi.fn(),
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
    platformIntegrationStatus: (databaseAvailable: boolean) => [
      { id: "database", state: databaseAvailable ? "ready" : "attention", provider: "PostgreSQL", capabilities: { connection: databaseAvailable } },
      { id: "payments", state: "ready", provider: "Stripe", capabilities: { connection: true, webhook: true } },
    ],
    cloudflareDeploymentReadiness: () => ({
      target: "Cloudflare Workers",
      ready: false,
      completed: 0,
      total: 2,
      percentage: 0,
      blockers: ["database-url", "stripe-webhook"],
      checkedAt: "2026-09-06T12:00:00.000Z",
      deployCommand: "npm run cloudflare:deploy",
      requirements: [
        { id: "database-url", group: "database", labelFr: "Base PostgreSQL Supabase", labelEn: "Supabase PostgreSQL database", detailFr: "Connexion PostgreSQL disponible.", detailEn: "PostgreSQL connection available.", envKeys: ["DATABASE_URL"], satisfied: false, severity: "blocking" },
        { id: "stripe-webhook", group: "payments", labelFr: "Webhook Stripe", labelEn: "Stripe webhook", detailFr: "Confirmation fiable des paiements.", detailEn: "Reliable payment confirmation.", envKeys: ["STRIPE_WEBHOOK_SECRET"], satisfied: false, severity: "blocking" },
      ],
    }),
  };
});
vi.mock("@/lib/payment-readiness", () => ({ readPaymentReadiness: mocks.paymentReadiness }));

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
    mocks.paymentReadiness.mockResolvedValue({ provider: "Stripe", state: "ready", reachable: true, liveMode: true, configurationName: "Default", isDefault: true, checkedAt: "2026-09-06T12:00:00.000Z", card: true, paypal: true, methods: [] });
  });

  it("requires the settings read permission and returns readiness without credentials", async () => {
    const response = await GET(request("GET"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "settings", action: "read" });
    expect(payload.configuration.supportEmail).toBe(configuration.supportEmail);
    expect(payload.integrations[0]).toEqual(expect.objectContaining({ id: "database", state: "ready" }));
    expect(payload.integrations[1]).toEqual(expect.objectContaining({ id: "payments", state: "ready", capabilities: expect.objectContaining({ configuration: true, card: true, paypal: true }) }));
    expect(payload.deploymentReadiness).toEqual(expect.objectContaining({ target: "Cloudflare Workers", ready: false, deployCommand: "npm run cloudflare:deploy" }));
    expect(payload.deploymentReadiness.requirements[1]).toEqual(expect.objectContaining({ envKeys: ["STRIPE_WEBHOOK_SECRET"], satisfied: false }));
    expect(payload.paymentReadiness).toEqual(expect.objectContaining({ state: "ready", card: true, paypal: true }));
    expect(JSON.stringify(payload)).not.toContain("sk_live_example");
    expect(JSON.stringify(payload)).not.toContain("service_role_example");
  });

  it("marks the payment integration partial when PayPal is not active", async () => {
    mocks.paymentReadiness.mockResolvedValueOnce({ provider: "Stripe", state: "attention", reachable: true, liveMode: true, configurationName: "Default", isDefault: true, checkedAt: "2026-09-06T12:00:00.000Z", card: true, paypal: false, methods: [] });

    const response = await GET(request("GET"));
    const payload = await response.json();

    expect(payload.integrations.find((integration: { id: string }) => integration.id === "payments")).toEqual(expect.objectContaining({ state: "partial", capabilities: expect.objectContaining({ card: true, paypal: false }) }));
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
