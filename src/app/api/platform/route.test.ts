import { describe, expect, it, vi } from "vitest";

const read = vi.hoisted(() => vi.fn());

vi.mock("@/lib/platform-configuration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform-configuration")>();
  return { ...actual, readPlatformConfiguration: read };
});

import { GET } from "./route";

describe("public platform configuration", () => {
  it("exposes customer service details only", async () => {
    read.mockResolvedValue({
      configuration: {
        supportEmail: "support@je-mange-africain.com",
        supportPhone: "+33 1 84 80 20 26",
        supportHoursFr: "Lundi au vendredi",
        supportHoursEn: "Monday to Friday",
        supportResponseHours: 24,
        businessCity: "Paris",
        businessCountry: "France",
      },
      persisted: true,
      databaseAvailable: true,
      updatedBy: "private-admin@example.test",
      updatedAt: "2026-09-05T07:00:00.000Z",
    });

    const response = await GET();
    const payload = await response.json();

    expect(payload).toEqual({ configuration: {
      support: { email: "support@je-mange-africain.com", phone: "+33 1 84 80 20 26", hours: { fr: "Lundi au vendredi", en: "Monday to Friday" }, responseHours: 24 },
      location: { city: "Paris", country: "France" },
    } });
    expect(JSON.stringify(payload)).not.toContain("private-admin");
    expect(JSON.stringify(payload)).not.toContain("databaseAvailable");
  });
});
