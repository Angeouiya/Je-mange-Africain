import { describe, expect, it } from "vitest";
import { summarizeTeam, type TeamInsightMember } from "@/lib/team-insights";

const permissions = (modules: string[]) => Object.fromEntries(modules.map((module) => [module, ["read"]]));

describe("team operational insights", () => {
  it("measures delegated coverage without inflating it with the current super admin", () => {
    const members: TeamInsightMember[] = [
      { role: "super_admin", status: "active", current: true, permissions: permissions(["dashboard", "catalog", "orders", "team"]) },
      { role: "marketing", status: "active", permissions: permissions(["dashboard", "catalog", "marketing"]), lastSignInAt: "2026-08-25T10:00:00.000Z" },
      { role: "logistics", status: "active", permissions: permissions(["dashboard", "orders", "customers"]), lastSignInAt: "2026-08-20T10:00:00.000Z" },
    ];

    expect(summarizeTeam(members, 10, new Date("2026-09-03T00:00:00.000Z"))).toMatchObject({
      total: 3,
      active: 3,
      protected: 1,
      delegatedRoles: 2,
      coveredModules: 5,
      recentlyActive: 2,
    });
  });

  it("reports pending, suspended and dormant access", () => {
    const members: TeamInsightMember[] = [
      { role: "support", status: "invited", permissions: permissions(["customers"]) },
      { role: "accounting", status: "suspended", permissions: permissions(["finance"]) },
      { role: "warehouse_manager", status: "active", permissions: permissions(["stock"]), lastSignInAt: "2026-01-01T00:00:00.000Z" },
      { role: "catalog_manager", status: "active", permissions: permissions(["catalog"]) },
    ];

    expect(summarizeTeam(members, 10, new Date("2026-09-03T00:00:00.000Z"))).toMatchObject({
      invited: 1,
      suspended: 1,
      dormant: 2,
    });
  });
});
