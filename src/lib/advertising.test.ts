import { describe, expect, it } from "vitest";
import { advertisementLifecycle } from "./advertising";

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
