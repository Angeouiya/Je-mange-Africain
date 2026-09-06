import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findUser: vi.fn(),
  upsert: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUser },
    pushSubscription: { upsert: mocks.upsert, updateMany: mocks.updateMany, deleteMany: mocks.deleteMany },
  },
}));

import { PATCH, POST } from "./route";

const endpoint = "https://push.example.test/subscriptions/device-1";
const subscription = { endpoint, keys: { p256dh: "p".repeat(40), auth: "a".repeat(20) } };
const preferences = { order: true, system: false, recipe: true, promotion: false };

function request(method: "POST" | "PATCH", body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/push/subscriptions", {
    method,
    headers: { "Content-Type": "application/json", "user-agent": "JMA mobile test" },
    body: JSON.stringify(body),
  });
}

describe("push subscription preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue(null);
    mocks.upsert.mockResolvedValue({ id: "subscription-1" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("starts with operational messages enabled and optional content disabled", async () => {
    const response = await POST(request("POST", { subscription, deviceId: "device-1234", locale: "fr" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.preferences).toEqual({ order: true, system: true, recipe: false, promotion: false });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ orderAlerts: true, systemAlerts: true, recipeAlerts: false, promotionAlerts: false }),
      update: expect.objectContaining({ orderAlerts: true, systemAlerts: true, recipeAlerts: false, promotionAlerts: false }),
    }));
  });

  it("updates only the matching active device subscription", async () => {
    const response = await PATCH(request("PATCH", { endpoint, deviceId: "device-1234", preferences }));

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { endpoint, deviceId: "device-1234", enabled: true },
      data: expect.objectContaining({ orderAlerts: true, systemAlerts: false, recipeAlerts: true, promotionAlerts: false }),
    });
  });

  it("rejects incomplete preference updates", async () => {
    const response = await PATCH(request("PATCH", { endpoint, deviceId: "device-1234", preferences: { order: true } }));

    expect(response.status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
