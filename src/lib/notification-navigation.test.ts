import { describe, expect, it } from "vitest";
import { parseNotificationDestination } from "./notification-navigation";

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
});
