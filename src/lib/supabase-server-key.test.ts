import { describe, expect, it } from "vitest";
import { getSupabaseServerKey, supabaseApiHeaders } from "./supabase-server-key";

describe("Supabase server keys", () => {
  it("prefers the current opaque secret key", () => {
    expect(getSupabaseServerKey({
      SUPABASE_SECRET_KEY: "sb_secret_current",
      SUPABASE_SERVICE_ROLE_KEY: "legacy.jwt.value",
    })).toBe("sb_secret_current");
  });

  it("keeps legacy service-role keys compatible", () => {
    expect(getSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy.jwt.value" })).toBe("legacy.jwt.value");
    expect(supabaseApiHeaders("legacy.jwt.value")).toEqual({
      apikey: "legacy.jwt.value",
      Authorization: "Bearer legacy.jwt.value",
    });
  });

  it("never sends an opaque secret key as a bearer token", () => {
    expect(supabaseApiHeaders("sb_secret_current", { contentType: "application/json" })).toEqual({
      apikey: "sb_secret_current",
      "Content-Type": "application/json",
    });
  });

  it("uses the authenticated user token for public-key storage calls", () => {
    expect(supabaseApiHeaders("sb_publishable_public", { accessToken: "user.jwt", contentType: "image/webp" })).toEqual({
      apikey: "sb_publishable_public",
      Authorization: "Bearer user.jwt",
      "Content-Type": "image/webp",
    });
  });
});
