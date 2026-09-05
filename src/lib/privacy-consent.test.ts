import { describe, expect, it } from "vitest";
import { createPrivacyConsent, optionalConsentCount, parsePrivacyConsent, PRIVACY_CONSENT_VERSION } from "@/lib/privacy-consent";

describe("privacy consent", () => {
  it("keeps every optional purpose disabled until the visitor chooses it", () => {
    const consent = createPrivacyConsent({}, new Date("2026-09-05T12:00:00.000Z"));

    expect(consent).toEqual({
      version: PRIVACY_CONSENT_VERSION,
      necessary: true,
      analytics: false,
      personalization: false,
      marketing: false,
      updatedAt: "2026-09-05T12:00:00.000Z",
    });
    expect(optionalConsentCount(consent)).toBe(0);
  });

  it("round-trips a valid granular choice and rejects incomplete records", () => {
    const consent = createPrivacyConsent({ analytics: true, personalization: true }, new Date("2026-09-05T12:30:00.000Z"));

    expect(parsePrivacyConsent(JSON.stringify(consent))).toEqual(consent);
    expect(optionalConsentCount(consent)).toBe(2);
    expect(parsePrivacyConsent(JSON.stringify({ ...consent, marketing: undefined }))).toBeNull();
    expect(parsePrivacyConsent("not-json")).toBeNull();
  });
});
