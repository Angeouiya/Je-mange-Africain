import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enforce: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  enforceRateLimit: mocks.enforce,
}));

import {
  adminRateLimitSubject,
  enforceAdminCriticalPerimeterRateLimit,
  enforceAdminCriticalSubjectRateLimit,
} from "./admin-rate-limit";

function request() {
  return new NextRequest("https://je-mange-africain.com/api/admin/team/member-1", {
    method: "PATCH",
    headers: { "cf-connecting-ip": "203.0.113.44" },
  });
}

describe("admin critical rate limit helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforce.mockResolvedValue(null);
  });

  it("guards critical admin routes by IP and route before authorization", async () => {
    const nextRequest = request();

    await expect(enforceAdminCriticalPerimeterRateLimit(nextRequest, "admin-sensitive")).resolves.toBeNull();

    expect(mocks.enforce).toHaveBeenCalledWith(nextRequest, "admin-sensitive", undefined, { scopes: ["ip", "route"] });
  });

  it("guards critical admin routes by authenticated administrator after authorization", async () => {
    const nextRequest = request();

    await expect(enforceAdminCriticalSubjectRateLimit(nextRequest, "media-upload", "admin-1")).resolves.toBeNull();

    expect(mocks.enforce).toHaveBeenCalledWith(nextRequest, "media-upload", "admin-1", { scopes: ["subject"] });
  });

  it("uses the stable account id before falling back to email", () => {
    expect(adminRateLimitSubject({ id: "admin-1", email: "ops@je-mange-africain.com" })).toBe("admin-1");
    expect(adminRateLimitSubject({ id: "", email: "ops@je-mange-africain.com" })).toBe("ops@je-mange-africain.com");
    expect(adminRateLimitSubject({ id: null, email: null })).toBeUndefined();
  });
});
