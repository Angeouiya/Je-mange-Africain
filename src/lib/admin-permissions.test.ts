import { describe, expect, it } from "vitest";
import { hasAdminPermission, permissionsForRole } from "@/lib/admin-permissions";

describe("platform settings permissions", () => {
  it("reserves configuration changes for the super administrator", () => {
    expect(hasAdminPermission("super_admin", "settings", "read")).toBe(true);
    expect(hasAdminPermission("super_admin", "settings", "update")).toBe(true);
    expect(hasAdminPermission("direction", "settings", "read")).toBe(true);
    expect(hasAdminPermission("direction", "settings", "update")).toBe(false);
  });

  it("keeps operational roles outside the platform configuration", () => {
    expect(hasAdminPermission("marketing", "settings", "read")).toBe(false);
    expect(hasAdminPermission("support", "settings", "read")).toBe(false);
    expect(permissionsForRole("accounting")).not.toHaveProperty("settings");
  });

  it("gives logistics teams the delivery workspace without widening unrelated access", () => {
    expect(hasAdminPermission("logistics", "logistics", "read")).toBe(true);
    expect(hasAdminPermission("logistics", "logistics", "update")).toBe(true);
    expect(hasAdminPermission("warehouse_manager", "logistics", "read")).toBe(true);
    expect(hasAdminPermission("warehouse_manager", "logistics", "update")).toBe(false);
    expect(hasAdminPermission("marketing", "logistics", "read")).toBe(false);
  });
});
