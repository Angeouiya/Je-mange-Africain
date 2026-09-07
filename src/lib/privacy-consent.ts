export const PRIVACY_CONSENT_VERSION = 1;
export const PRIVACY_CONSENT_STORAGE_KEY = "jma-privacy-consent-v1";
export const PRIVACY_CONSENT_COOKIE_NAME = "jma_privacy_consent";
export const PRIVACY_PREFERENCES_EVENT = "jma:open-privacy-preferences";
export const PRIVACY_CONSENT_CHANGE_EVENT = "jma:privacy-consent-change";

export type OptionalPrivacyPreference = "analytics" | "personalization" | "marketing";

export type PrivacyConsent = {
  version: typeof PRIVACY_CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function createPrivacyConsent(
  preferences: Partial<Record<OptionalPrivacyPreference, boolean>> = {},
  now = new Date(),
): PrivacyConsent {
  return {
    version: PRIVACY_CONSENT_VERSION,
    necessary: true,
    analytics: preferences.analytics === true,
    personalization: preferences.personalization === true,
    marketing: preferences.marketing === true,
    updatedAt: now.toISOString(),
  };
}

export function parsePrivacyConsent(raw: string | null | undefined): PrivacyConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PrivacyConsent>;
    if (
      value.version !== PRIVACY_CONSENT_VERSION
      || value.necessary !== true
      || typeof value.analytics !== "boolean"
      || typeof value.personalization !== "boolean"
      || typeof value.marketing !== "boolean"
      || typeof value.updatedAt !== "string"
      || Number.isNaN(Date.parse(value.updatedAt))
    ) return null;
    return value as PrivacyConsent;
  } catch {
    return null;
  }
}

export function parsePrivacyConsentCookie(rawCookie: string | null | undefined, now = new Date()): PrivacyConsent | null {
  if (!rawCookie) return null;
  const encodedValue = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PRIVACY_CONSENT_COOKIE_NAME}=`))
    ?.slice(PRIVACY_CONSENT_COOKIE_NAME.length + 1);
  if (!encodedValue) return null;

  let value = encodedValue;
  try {
    value = decodeURIComponent(encodedValue);
  } catch {
    return null;
  }

  const match = value.match(/^v(\d+)\.([01]{3})$/);
  if (!match || Number(match[1]) !== PRIVACY_CONSENT_VERSION) return null;
  const flags = match[2];
  return createPrivacyConsent({
    analytics: flags[0] === "1",
    personalization: flags[1] === "1",
    marketing: flags[2] === "1",
  }, now);
}

export function readPrivacyConsent() {
  if (typeof window === "undefined") return null;
  try {
    const stored = parsePrivacyConsent(window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Some browsers or privacy modes can block localStorage; the cookie remains the durable fallback.
  }

  const cookieConsent = parsePrivacyConsentCookie(typeof document === "undefined" ? null : document.cookie);
  if (cookieConsent) {
    try {
      window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(cookieConsent));
    } catch {
      // The cookie is enough to avoid reopening the first-choice step.
    }
  }
  return cookieConsent;
}

export function savePrivacyConsent(consent: PrivacyConsent) {
  if (typeof window === "undefined") return;
  const flags = `${Number(consent.analytics)}${Number(consent.personalization)}${Number(consent.marketing)}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (typeof document !== "undefined") {
    document.cookie = `${PRIVACY_CONSENT_COOKIE_NAME}=v${consent.version}.${flags}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }
  try {
    window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Cookie persistence already captured the user's accept/refuse decision.
  }
  try {
    window.dispatchEvent(new CustomEvent(PRIVACY_CONSENT_CHANGE_EVENT, { detail: consent }));
  } catch {
    window.dispatchEvent(new Event(PRIVACY_CONSENT_CHANGE_EVENT));
  }
}

export function requestPrivacyPreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}

export function optionalConsentCount(consent: Pick<PrivacyConsent, OptionalPrivacyPreference>) {
  return Number(consent.analytics) + Number(consent.personalization) + Number(consent.marketing);
}
