import { describe, expect, it } from "vitest";
import { advertisementDestination, advertisementLifecycle } from "./advertising";

describe("advertisement lifecycle", () => {
  const now = "2026-09-03T12:00:00.000Z";

  it("distinguishes active, scheduled and expired publication windows", () => {
    expect(advertisementLifecycle({ status: "published", startsAt: "2026-09-01T00:00:00.000Z", endsAt: "2026-09-30T00:00:00.000Z" }, now)).toBe("active");
    expect(advertisementLifecycle({ status: "published", startsAt: "2026-09-05T00:00:00.000Z" }, now)).toBe("scheduled");
    expect(advertisementLifecycle({ status: "published", endsAt: "2026-09-02T00:00:00.000Z" }, now)).toBe("expired");
  });

  it("keeps editorial states ahead of the publication calendar", () => {
    expect(advertisementLifecycle({ status: "draft", startsAt: "2026-09-01T00:00:00.000Z" }, now)).toBe("draft");
    expect(advertisementLifecycle({ status: "archived", startsAt: "2026-09-05T00:00:00.000Z" }, now)).toBe("archived");
  });

  it("treats an undated published artwork as active", () => {
    expect(advertisementLifecycle({ status: "published" }, now)).toBe("active");
  });
});

describe("advertisement destination", () => {
  it("turns storefront campaign links into typed app navigation", () => {
    expect(advertisementDestination("/?view=catalog&query=atti%C3%A9k%C3%A9&sort=new")).toEqual({
      kind: "storefront",
      view: "catalog",
      params: { category: undefined, query: "attiéké", sort: "new" },
    });
    expect(advertisementDestination("https://www.je-mange-africain.com/?view=recipes&recipeMode=library")).toEqual({
      kind: "storefront",
      view: "recipes",
      params: { query: undefined, recipeMode: "library" },
    });
  });

  it("falls back to safe views when a campaign misses a required id", () => {
    expect(advertisementDestination("/?view=product")).toEqual({ kind: "storefront", view: "catalog", params: {} });
    expect(advertisementDestination("/?view=recipe-config")).toEqual({ kind: "storefront", view: "recipes", params: {} });
  });

  it("keeps legal pages local and marks third-party destinations as external", () => {
    expect(advertisementDestination("/conditions-generales?lang=fr")).toEqual({ kind: "url", href: "/conditions-generales?lang=fr", external: false });
    expect(advertisementDestination("https://partner.example/offre")).toEqual({ kind: "url", href: "https://partner.example/offre", external: true });
    expect(advertisementDestination(null)).toBeNull();
  });
});
