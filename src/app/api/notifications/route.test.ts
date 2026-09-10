import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  userFindUnique: vi.fn(),
  notificationFindMany: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    notification: { findMany: mocks.notificationFindMany },
  },
}));

import { GET } from "./route";

const session = { id: "customer-auth-1", email: "awa@example.fr", role: "customer" };
const directoryUser = { id: "user-1" };
const notification = {
  id: "notification-1",
  type: "order",
  titleFr: "Commande en préparation",
  titleEn: "Order in preparation",
  bodyFr: "Votre commande Je mange Africain est en cuisine.",
  bodyEn: "Your Je mange Africain order is being prepared.",
  url: "/?view=order-tracking&orderId=order-1",
  createdAt: new Date("2026-09-06T10:00:00.000Z"),
};

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue(session);
    mocks.userFindUnique.mockResolvedValue(directoryUser);
    mocks.notificationFindMany.mockResolvedValue([notification]);
  });

  it("rejects anonymous customers before reading notifications", async () => {
    mocks.authorize.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/notifications?locale=fr"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentification client requise.");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.notificationFindMany).not.toHaveBeenCalled();
  });

  it("returns global and personal notifications for the connected customer", async () => {
    const response = await GET(new NextRequest("http://localhost/api/notifications?locale=en"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { email: "awa@example.fr" }, select: { id: true } });
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ userId: null }, { userId: "user-1" }] }),
    }));
    expect(payload.notifications[0]).toMatchObject({
      id: notification.id,
      title: "Order in preparation",
      body: "Your Je mange Africain order is being prepared.",
      url: notification.url,
    });
  });

  it("returns an honest empty activity feed instead of fabricated production offers", async () => {
    mocks.notificationFindMany.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/notifications?locale=fr"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ notifications: [] });
  });
});
