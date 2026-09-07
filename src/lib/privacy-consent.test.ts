import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPrivacyConsent,
  optionalConsentCount,
  parsePrivacyConsent,
  parsePrivacyConsentCookie,
  PRIVACY_CONSENT_COMPLETED_COOKIE_NAME,
  PRIVACY_CONSENT_COMPLETED_SESSION_KEY,
  PRIVACY_CONSENT_COMPLETED_STORAGE_KEY,
  PRIVACY_CONSENT_SESSION_KEY,
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_CONSENT_VERSION,
  readPrivacyConsent,
  resetPrivacyConsentMemoryForTests,
  savePrivacyConsent,
} from "@/lib/privacy-consent";

describe("privacy consent", () => {
  afterEach(() => {
    resetPrivacyConsentMemoryForTests();
    vi.unstubAllGlobals();
  });

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

  it("restores a refused choice from the durable cookie when localStorage is missing", () => {
    const stored: Record<string, string> = {};
    vi.stubGlobal("document", { cookie: "jma_privacy_consent=v1.000; another=value" });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
      },
      location: { protocol: "https:" },
      dispatchEvent: vi.fn(),
    });

    const consent = readPrivacyConsent();

    expect(consent).toMatchObject({ necessary: true, analytics: false, personalization: false, marketing: false });
    expect(JSON.parse(stored[PRIVACY_CONSENT_STORAGE_KEY] || "{}")).toMatchObject({ analytics: false, personalization: false, marketing: false });
  });

  it("keeps the first privacy step dismissed from the completed marker", () => {
    const stored: Record<string, string | null> = {
      [PRIVACY_CONSENT_STORAGE_KEY]: null,
      [PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]: "v1",
    };
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => stored[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
      },
      location: { protocol: "https:", hostname: "je-mange-africain.com" },
      dispatchEvent: vi.fn(),
    });

    const consent = readPrivacyConsent();

    expect(consent).toMatchObject({ necessary: true, analytics: false, personalization: false, marketing: false });
    expect(stored[PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]).toBe("v1");
    expect(JSON.parse(stored[PRIVACY_CONSENT_STORAGE_KEY] || "{}")).toMatchObject({ analytics: false, personalization: false, marketing: false });
  });

  it("keeps the European privacy step dismissed after accepted or refused legacy markers", () => {
    const markers = [
      "accepted",
      "refused",
      "rejected",
      "v1.000",
      JSON.stringify({ version: 1, completed: true }),
      JSON.stringify({ version: "v1", accepted: false }),
      JSON.stringify({ version: 1, status: "refused" }),
    ];

    for (const marker of markers) {
      const stored: Record<string, string | null> = {
        [PRIVACY_CONSENT_STORAGE_KEY]: null,
        [PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]: marker,
      };
      vi.stubGlobal("document", { cookie: "" });
      vi.stubGlobal("window", {
        localStorage: {
          getItem: vi.fn((key: string) => stored[key] ?? null),
          setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
        },
        sessionStorage: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
        },
        location: { protocol: "https:", hostname: "je-mange-africain.com" },
        dispatchEvent: vi.fn(),
      });

      expect(readPrivacyConsent()).toMatchObject({
        necessary: true,
        analytics: false,
        personalization: false,
        marketing: false,
      });
      expect(stored[PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]).toBe("v1");
      resetPrivacyConsentMemoryForTests();
    }
  });

  it("keeps the European privacy step dismissed from a completed cookie marker", () => {
    const stored: Record<string, string | null> = {
      [PRIVACY_CONSENT_STORAGE_KEY]: null,
      [PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]: null,
    };
    vi.stubGlobal("document", { cookie: `${PRIVACY_CONSENT_COMPLETED_COOKIE_NAME}=refused` });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => stored[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
      },
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      location: { protocol: "https:", hostname: "je-mange-africain.com" },
      dispatchEvent: vi.fn(),
    });

    expect(readPrivacyConsent()).toMatchObject({ necessary: true, analytics: false, personalization: false, marketing: false });
    expect(stored[PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]).toBe("v1");
  });

  it("keeps the refusal cookie even when localStorage is blocked", () => {
    const cookies: string[] = [];
    vi.stubGlobal("document", {
      get cookie() { return cookies.join("; "); },
      set cookie(value: string) { cookies.push(value); },
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => { throw new Error("blocked"); }),
        setItem: vi.fn(() => { throw new Error("blocked"); }),
      },
      location: { protocol: "https:" },
      dispatchEvent: vi.fn(),
    });

    savePrivacyConsent(createPrivacyConsent({}, new Date("2026-09-05T13:00:00.000Z")));

    const cookie = cookies.join("; ");
    expect(cookie).toContain("jma_privacy_consent=v1.000");
    expect(parsePrivacyConsentCookie(cookie, new Date("2026-09-05T13:01:00.000Z"))).toMatchObject({
      analytics: false,
      personalization: false,
      marketing: false,
    });
  });

  it("writes a durable completed marker when the visitor accepts or refuses", () => {
    const stored: Record<string, string> = {};
    const cookies: string[] = [];
    const session: Record<string, string> = {};
    vi.stubGlobal("document", {
      get cookie() { return cookies.join("; "); },
      set cookie(value: string) { cookies.push(value); },
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
      },
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn((key: string, value: string) => { session[key] = value; }),
      },
      location: { protocol: "https:", hostname: "je-mange-africain.com" },
      dispatchEvent: vi.fn(),
    });

    savePrivacyConsent(createPrivacyConsent({ analytics: true, personalization: true, marketing: true }, new Date("2026-09-05T13:30:00.000Z")));

    expect(stored[PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]).toBe("v1");
    expect(session[PRIVACY_CONSENT_COMPLETED_SESSION_KEY]).toBe("v1");
    expect(JSON.parse(stored[PRIVACY_CONSENT_STORAGE_KEY] || "{}")).toMatchObject({ analytics: true, personalization: true, marketing: true });
    expect(JSON.parse(session[PRIVACY_CONSENT_SESSION_KEY] || "{}")).toMatchObject({ analytics: true, personalization: true, marketing: true });
    expect(cookies.some((cookie) => cookie.startsWith(`${PRIVACY_CONSENT_COMPLETED_COOKIE_NAME}=v1`))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("Domain=.je-mange-africain.com"))).toBe(true);
  });

  it("does not reopen after a choice when cookies are refused by the browser", () => {
    const stored: Record<string, string | null> = {};
    const session: Record<string, string | null> = {};
    vi.stubGlobal("document", {
      get cookie() { return ""; },
      set cookie(_value: string) { throw new Error("cookies blocked"); },
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => stored[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { stored[key] = value; }),
      },
      sessionStorage: {
        getItem: vi.fn((key: string) => session[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { session[key] = value; }),
      },
      location: { protocol: "https:", hostname: "je-mange-africain.com" },
      dispatchEvent: vi.fn(),
    });

    expect(() => savePrivacyConsent(createPrivacyConsent({}, new Date("2026-09-05T14:00:00.000Z")))).not.toThrow();

    expect(stored[PRIVACY_CONSENT_COMPLETED_STORAGE_KEY]).toBe("v1");
    expect(session[PRIVACY_CONSENT_COMPLETED_SESSION_KEY]).toBe("v1");
    expect(readPrivacyConsent()).toMatchObject({ analytics: false, personalization: false, marketing: false });
  });

  it("restores the completed step from session storage when localStorage is unavailable", () => {
    const consent = createPrivacyConsent({ analytics: true }, new Date("2026-09-05T14:30:00.000Z"));
    const session: Record<string, string | null> = {
      [PRIVACY_CONSENT_SESSION_KEY]: JSON.stringify(consent),
      [PRIVACY_CONSENT_COMPLETED_SESSION_KEY]: "v1",
    };
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => { throw new Error("blocked"); }),
        setItem: vi.fn(() => { throw new Error("blocked"); }),
      },
      sessionStorage: {
        getItem: vi.fn((key: string) => session[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { session[key] = value; }),
      },
      location: { protocol: "https:", hostname: "je-mange-africain.com" },
      dispatchEvent: vi.fn(),
    });

    expect(readPrivacyConsent()).toMatchObject({ analytics: true, personalization: false, marketing: false });
  });
});
