import { describe, expect, it } from "vitest";
import { groupNotificationsByDay, notificationDateBucket, parseNotificationDestination } from "./notification-navigation";

describe("parseNotificationDestination", () => {
  it("maps an order notification to the protected tracking view", () => {
    expect(parseNotificationDestination("/?view=order-tracking&orderId=order-42")).toEqual({
      view: "order-tracking",
      params: { orderId: "order-42" },
    });
  });

  it("preserves recipe library navigation and rejects unknown routes", () => {
    expect(parseNotificationDestination("/?view=recipes&recipeMode=library&query=mafe")).toEqual({
      view: "recipes",
      params: { query: "mafe", recipeMode: "library" },
    });
    expect(parseNotificationDestination("/admin")).toBeNull();
    expect(parseNotificationDestination("/?view=unknown")).toBeNull();
    expect(parseNotificationDestination("//example.com/?view=catalog")).toBeNull();
  });

  it("classifies activity by the customer local calendar", () => {
    const now = "2026-09-03T12:00:00.000Z";
    expect(notificationDateBucket("2026-09-03T08:00:00.000Z", now)).toBe("today");
    expect(notificationDateBucket("2026-09-02T20:00:00.000Z", now)).toBe("yesterday");
    expect(notificationDateBucket("2026-08-29T20:00:00.000Z", now)).toBe("earlier");
    expect(notificationDateBucket("invalid", now)).toBe("earlier");
  });

  it("preserves notification order while omitting empty day groups", () => {
    const notifications = [
      { id: "today", createdAt: "2026-09-03T08:00:00.000Z" },
      { id: "older", createdAt: "2026-08-29T20:00:00.000Z" },
    ];
    expect(groupNotificationsByDay(notifications, "2026-09-03T12:00:00.000Z")).toEqual([
      { key: "today", notifications: [notifications[0]] },
      { key: "earlier", notifications: [notifications[1]] },
    ]);
  });
});
