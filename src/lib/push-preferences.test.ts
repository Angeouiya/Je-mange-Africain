import { describe, expect, it } from "vitest";
import { acceptsPushType, DEFAULT_PUSH_PREFERENCES, normalizePushPreferences, pushPreferenceData, pushPreferenceField } from "./push-preferences";

describe("push topic preferences", () => {
  it("defaults service messages on and optional content off", () => {
    expect(normalizePushPreferences(null)).toEqual({ order: true, system: true, recipe: false, promotion: false });
    expect(DEFAULT_PUSH_PREFERENCES.promotion).toBe(false);
  });

  it("preserves explicit choices while repairing incomplete local data", () => {
    expect(normalizePushPreferences({ order: false, promotion: true, recipe: "yes" })).toEqual({ order: false, system: true, recipe: false, promotion: true });
  });

  it("maps each message type to its persisted consent field", () => {
    expect(pushPreferenceData({ order: true, system: false, recipe: true, promotion: false })).toEqual({ orderAlerts: true, systemAlerts: false, recipeAlerts: true, promotionAlerts: false });
    expect(pushPreferenceField("promotion")).toBe("promotionAlerts");
    expect(pushPreferenceField("unexpected")).toBe("systemAlerts");
    expect(acceptsPushType({ orderAlerts: true, promotionAlerts: false }, "order")).toBe(true);
    expect(acceptsPushType({ orderAlerts: true, promotionAlerts: false }, "promotion")).toBe(false);
  });
});
