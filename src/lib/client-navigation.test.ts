import { describe, expect, it } from "vitest";
import { clientPrimaryNavigationTarget, clientSidebarUtilityTarget } from "./client-navigation";

describe("client navigation hierarchy", () => {
  it("keeps one primary mobile destination active throughout nested journeys", () => {
    expect(clientPrimaryNavigationTarget("product", "mobile", false)).toBe("catalog");
    expect(clientPrimaryNavigationTarget("wholesale", "mobile", false)).toBe("catalog");
    expect(clientPrimaryNavigationTarget("recipe-config", "mobile", false)).toBe("recipes");
    expect(clientPrimaryNavigationTarget("checkout", "mobile", true)).toBe("cart");
    expect(clientPrimaryNavigationTarget("order-confirmation", "mobile", true)).toBe("account");
    expect(clientPrimaryNavigationTarget("order-tracking", "mobile", true)).toBe("account");
  });

  it("distinguishes retail, wholesale and order workspaces on desktop", () => {
    expect(clientPrimaryNavigationTarget("catalog", "desktop", true)).toBe("catalog");
    expect(clientPrimaryNavigationTarget("wholesale", "desktop", true)).toBe("wholesale");
    expect(clientPrimaryNavigationTarget("checkout", "desktop", true)).toBe("cart");
    expect(clientPrimaryNavigationTarget("order-confirmation", "desktop", true)).toBe("orders");
    expect(clientPrimaryNavigationTarget("order-tracking", "desktop", true)).toBe("orders");
    expect(clientPrimaryNavigationTarget("orders", "desktop", false)).toBeNull();
  });

  it("gives desktop account and support utilities an unambiguous active state", () => {
    expect(clientSidebarUtilityTarget("account", { accountSection: "profile" })).toBe("account");
    expect(clientSidebarUtilityTarget("account", { accountSection: "settings" })).toBe("settings");
    expect(clientSidebarUtilityTarget("info", { infoPage: "contact" })).toBe("help");
    expect(clientSidebarUtilityTarget("info", { infoPage: "privacy" })).toBe("privacy");
    expect(clientSidebarUtilityTarget("info", { infoPage: "about" })).toBeNull();
  });
});
