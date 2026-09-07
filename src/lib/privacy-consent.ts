export const PRIVACY_CONSENT_VERSION = 1;
export const PRIVACY_CONSENT_STORAGE_KEY = "jma-privacy-consent-v1";
export const PRIVACY_CONSENT_COMPLETED_STORAGE_KEY = "jma-privacy-choice-v1";
export const PRIVACY_CONSENT_COOKIE_NAME = "jma_privacy_consent";
export const PRIVACY_CONSENT_COMPLETED_COOKIE_NAME = "jma_privacy_choice";
export const PRIVACY_PREFERENCES_EVENT = "jma:open-privacy-preferences";
export const PRIVACY_CONSENT_CHANGE_EVENT = "jma:privacy-consent-change";

const PRIVACY_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

function legacyPrivacyConsent(raw: string | null | undefined, now = new Date()): PrivacyConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PrivacyConsent> & { accepted?: boolean; refused?: boolean };
    if (value.necessary === true) {
      return createPrivacyConsent({
        analytics: value.analytics === true,
        personalization: value.personalization === true,
        marketing: value.marketing === true,
      }, now);
    }
    if (typeof value.accepted === "boolean") {
      return createPrivacyConsent({
        analytics: value.accepted,
        personalization: value.accepted,
        marketing: value.accepted,
      }, now);
    }
    if (value.refused === true) return createPrivacyConsent({}, now);
  } catch {
    return null;
  }
  return null;
}

function privacyCookieValues(rawCookie: string | null | undefined, name: string) {
  if (!rawCookie) return [];
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1));
}

function decodePrivacyCookieValue(encodedValue: string) {
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return null;
  }
}

export function parsePrivacyConsentCookie(rawCookie: string | null | undefined, now = new Date()): PrivacyConsent | null {
  for (const encodedValue of privacyCookieValues(rawCookie, PRIVACY_CONSENT_COOKIE_NAME)) {
    const value = decodePrivacyCookieValue(encodedValue);
    const match = value?.match(/^v(\d+)\.([01]{3})$/);
    if (!match || Number(match[1]) !== PRIVACY_CONSENT_VERSION) continue;
    const flags = match[2];
    return createPrivacyConsent({
      analytics: flags[0] === "1",
      personalization: flags[1] === "1",
      marketing: flags[2] === "1",
    }, now);
  }
  return null;
}

function hasCompletedPrivacyStep(raw: string | null | undefined) {
  if (!raw) return false;
  return raw === `v${PRIVACY_CONSENT_VERSION}`;
}

function hasCompletedPrivacyStepCookie(rawCookie: string | null | undefined) {
  return privacyCookieValues(rawCookie, PRIVACY_CONSENT_COMPLETED_COOKIE_NAME)
    .some((value) => hasCompletedPrivacyStep(decodePrivacyCookieValue(value)));
}

function persistLocalPrivacyConsent(consent: PrivacyConsent) {
  try {
    window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    window.localStorage.setItem(PRIVACY_CONSENT_COMPLETED_STORAGE_KEY, `v${consent.version}`);
  } catch {
    // The cookie is enough to avoid reopening the first-choice step.
  }
}

function privacyCookieAttributes() {
  const protocol = typeof window !== "undefined" ? window.location?.protocol : "";
  const hostname = typeof window !== "undefined" ? window.location?.hostname?.toLowerCase() : "";
  const secure = protocol === "https:" ? "; Secure" : "";
  const domain = hostname === "je-mange-africain.com" || hostname?.endsWith(".je-mange-africain.com")
    ? "; Domain=.je-mange-africain.com"
    : "";
  return `; Path=/; Max-Age=${PRIVACY_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${domain}${secure}`;
}

function writePrivacyCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}${privacyCookieAttributes()}`;
}

export function readPrivacyConsent() {
  if (typeof window === "undefined") return null;
  const now = new Date();
  let completedLocally = false;
  try {
    const rawStored = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    const stored = parsePrivacyConsent(rawStored) || legacyPrivacyConsent(rawStored, now);
    if (stored) {
      persistLocalPrivacyConsent(stored);
      return stored;
    }
    completedLocally = hasCompletedPrivacyStep(window.localStorage.getItem(PRIVACY_CONSENT_COMPLETED_STORAGE_KEY));
  } catch {
    // Some browsers or privacy modes can block localStorage; the cookie remains the durable fallback.
  }

  const cookieConsent = parsePrivacyConsentCookie(typeof document === "undefined" ? null : document.cookie);
  if (cookieConsent) {
    persistLocalPrivacyConsent(cookieConsent);
    return cookieConsent;
  }
  if (completedLocally || hasCompletedPrivacyStepCookie(typeof document === "undefined" ? null : document.cookie)) {
    const completed = createPrivacyConsent({}, now);
    persistLocalPrivacyConsent(completed);
    return completed;
  }
  return null;
}

export function savePrivacyConsent(consent: PrivacyConsent) {
  if (typeof window === "undefined") return;
  const flags = `${Number(consent.analytics)}${Number(consent.personalization)}${Number(consent.marketing)}`;
  writePrivacyCookie(PRIVACY_CONSENT_COOKIE_NAME, `v${consent.version}.${flags}`);
  writePrivacyCookie(PRIVACY_CONSENT_COMPLETED_COOKIE_NAME, `v${consent.version}`);
  persistLocalPrivacyConsent(consent);
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
