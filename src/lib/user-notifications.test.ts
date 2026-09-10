import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { notification: { create: mocks.create, update: mocks.update } },
}));
vi.mock("@/lib/push-server", () => ({ sendPushToUser: mocks.send }));

import { createAndSendUserNotification } from "./user-notifications";

const input = {
  userId: "user-1",
  type: "order" as const,
  url: "/?view=order-tracking&orderId=order-1",
  tag: "order-order-1",
  fr: { title: "Commande expédiée", body: "Votre colis est en route." },
  en: { title: "Order shipped", body: "Your parcel is on its way." },
};

describe("customer notification delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ id: "notification-1" });
    mocks.update.mockResolvedValue({ id: "notification-1" });
    mocks.send.mockResolvedValue({ total: 3, sent: 2, failed: 1, configured: true });
  });

  it("stores the activity and the measured multi-device push result", async () => {
    const result = await createAndSendUserNotification(input);

    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user-1", type: "order", url: input.url }) });
    expect(mocks.send).toHaveBeenCalledWith("user-1", {
      fr: expect.objectContaining({ title: "Commande expédiée", type: "order", tag: "order-order-1" }),
      en: expect.objectContaining({ title: "Order shipped", type: "order", tag: "order-order-1" }),
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "notification-1" },
      data: { sent: true, recipientCount: 3, deliveredCount: 2, failedCount: 1 },
    });
    expect(result.delivery).toMatchObject({ total: 3, sent: 2, failed: 1 });
  });

  it("keeps the in-app notification when the push provider is unavailable", async () => {
    mocks.send.mockRejectedValueOnce(new Error("provider unavailable"));

    const result = await createAndSendUserNotification(input);

    expect(result).toEqual({
      notificationId: "notification-1",
      delivery: { total: 0, sent: 0, failed: 0, configured: false },
    });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { sent: false, recipientCount: 0, deliveredCount: 0, failedCount: 0 },
    }));
  });
});
