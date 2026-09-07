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

  it("routes commercial notifications to precise client workspaces only", () => {
    expect(parseNotificationDestination("/?view=wholesale&category=manioc&query=placali")).toEqual({
      view: "wholesale",
      params: { category: "manioc", query: "placali" },
    });
    expect(parseNotificationDestination("/?view=catalog&category=epices&sort=available")).toEqual({
      view: "catalog",
      params: { category: "epices", sort: "available" },
    });
    expect(parseNotificationDestination("/?view=account&accountSection=settings")).toEqual({
      view: "account",
      params: { accountSection: "settings" },
    });
    expect(parseNotificationDestination("/?view=info&infoPage=delivery&contactReason=delivery")).toEqual({
      view: "info",
      params: { infoPage: "delivery", contactReason: "delivery" },
    });
  });

  it("rejects incomplete protected notification destinations", () => {
    expect(parseNotificationDestination("/?view=product")).toBeNull();
    expect(parseNotificationDestination("/?view=recipe-config")).toBeNull();
    expect(parseNotificationDestination("/?view=order-tracking")).toBeNull();
    expect(parseNotificationDestination("/?view=order-confirmation")).toBeNull();
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
