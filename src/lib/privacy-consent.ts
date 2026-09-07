export const PRIVACY_CONSENT_VERSION = 1;
export const PRIVACY_CONSENT_STORAGE_KEY = "jma-privacy-consent-v1";
export const PRIVACY_CONSENT_COMPLETED_STORAGE_KEY = "jma-privacy-choice-v1";
export const PRIVACY_CONSENT_COOKIE_NAME = "jma_privacy_consent";
export const PRIVACY_CONSENT_COMPLETED_COOKIE_NAME = "jma_privacy_choice";
export const PRIVACY_PREFERENCES_EVENT = "jma:open-privacy-preferences";
export const PRIVACY_CONSENT_CHANGE_EVENT = "jma:privacy-consent-change";

const PRIVACY_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const PRIVACY_CONSENT_SESSION_KEY = "jma-privacy-consent-session-v1";
export const PRIVACY_CONSENT_COMPLETED_SESSION_KEY = "jma-privacy-choice-session-v1";

let memoryPrivacyConsent: PrivacyConsent | null = null;
let memoryPrivacyChoiceCompleted = false;

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

function normalizePrivacyMarker(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function markerPrivacyConsent(raw: string | null | undefined, now = new Date()): PrivacyConsent | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const flagMatch = value.match(/^v(\d+)\.([01]{3})$/i);
  if (flagMatch && Number(flagMatch[1]) === PRIVACY_CONSENT_VERSION) {
    const flags = flagMatch[2];
    return createPrivacyConsent({
      analytics: flags[0] === "1",
      personalization: flags[1] === "1",
      marketing: flags[2] === "1",
    }, now);
  }
  const marker = normalizePrivacyMarker(value);
  if (marker === "accepted" || marker === "accept" || marker === "accepte" || marker === "allowed") {
    return createPrivacyConsent({ analytics: true, personalization: true, marketing: true }, now);
  }
  if (marker === "refused" || marker === "rejected" || marker === "declined" || marker === "reject" || marker === "refuse" || marker === "refuser") {
    return createPrivacyConsent({}, now);
  }
  if (marker === `v${PRIVACY_CONSENT_VERSION}` || marker === String(PRIVACY_CONSENT_VERSION) || marker === "true") {
    return createPrivacyConsent({}, now);
  }
  return null;
}

function legacyPrivacyConsent(raw: string | null | undefined, now = new Date()): PrivacyConsent | null {
  if (!raw) return null;
  const markerConsent = markerPrivacyConsent(raw, now);
  if (markerConsent) return markerConsent;
  try {
    const value = JSON.parse(raw) as Partial<PrivacyConsent> & {
      accepted?: boolean;
      completed?: boolean;
      dismissed?: boolean;
      refused?: boolean;
      rejected?: boolean;
      choice?: string;
      status?: string;
    };
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
    const choice = typeof value.choice === "string" ? normalizePrivacyMarker(value.choice) : "";
    const status = typeof value.status === "string" ? normalizePrivacyMarker(value.status) : "";
    if (choice === "accepted" || choice === "accept" || choice === "accepte" || status === "accepted" || status === "accept" || status === "accepte") {
      return createPrivacyConsent({ analytics: true, personalization: true, marketing: true }, now);
    }
    if (
      value.refused === true
      || value.rejected === true
      || choice === "refused"
      || choice === "rejected"
      || choice === "declined"
      || choice === "refuse"
      || choice === "refuser"
      || status === "refused"
      || status === "rejected"
      || status === "declined"
      || status === "refuse"
      || status === "refuser"
    ) return createPrivacyConsent({}, now);
    if (value.completed === true || value.dismissed === true || choice === "custom" || status === "custom") {
      return createPrivacyConsent({
        analytics: value.analytics === true,
        personalization: value.personalization === true,
        marketing: value.marketing === true,
      }, now);
    }
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
  for (const encodedValue of privacyCookieValues(rawCookie, PRIVACY_CONSENT_COOKIE_NAME)) {
    const value = decodePrivacyCookieValue(encodedValue);
    const legacy = legacyPrivacyConsent(value, now);
    if (legacy) return legacy;
  }
  return null;
}

function hasCompletedPrivacyStep(raw: string | null | undefined, now = new Date()) {
  if (!raw) return false;
  const value = raw.trim();
  if (!value) return false;
  if (markerPrivacyConsent(value, now)) return true;

  if (new RegExp(`^v${PRIVACY_CONSENT_VERSION}\\.[01]{3}$`).test(value)) return true;
  if (parsePrivacyConsent(value) || legacyPrivacyConsent(value, now)) return true;

  try {
    const parsed = JSON.parse(value) as {
      version?: unknown;
      completed?: unknown;
      dismissed?: unknown;
      accepted?: unknown;
      refused?: unknown;
      rejected?: unknown;
      choice?: unknown;
      status?: unknown;
    };
    if (!parsed || typeof parsed !== "object") return false;
    const explicitVersion = parsed.version === undefined
      || parsed.version === PRIVACY_CONSENT_VERSION
      || parsed.version === `v${PRIVACY_CONSENT_VERSION}`;
    if (!explicitVersion) return false;
    return parsed.completed === true
      || parsed.dismissed === true
      || typeof parsed.accepted === "boolean"
      || parsed.refused === true
      || parsed.rejected === true
      || parsed.choice === "accepted"
      || parsed.choice === "refused"
      || parsed.choice === "rejected"
      || parsed.choice === "custom"
      || parsed.status === "accepted"
      || parsed.status === "refused"
      || parsed.status === "rejected";
  } catch {
    return false;
  }
}

function hasCompletedPrivacyStepCookie(rawCookie: string | null | undefined, now = new Date()) {
  return privacyCookieValues(rawCookie, PRIVACY_CONSENT_COMPLETED_COOKIE_NAME)
    .some((value) => hasCompletedPrivacyStep(decodePrivacyCookieValue(value), now));
}

function safeStorageGet(storage: Storage | undefined, key: string) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage | undefined, key: string, value: string) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Browser storage can be blocked; cookies and memory keep the completed step stable.
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
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}${privacyCookieAttributes()}`;
  } catch {
    // Some hardened privacy modes reject cookie writes. Storage fallbacks still record the choice.
  }
}

function persistLocalPrivacyConsent(consent: PrivacyConsent) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(consent);
  const completed = `v${consent.version}`;
  memoryPrivacyConsent = consent;
  memoryPrivacyChoiceCompleted = true;
  safeStorageSet(window.localStorage, PRIVACY_CONSENT_STORAGE_KEY, serialized);
  safeStorageSet(window.localStorage, PRIVACY_CONSENT_COMPLETED_STORAGE_KEY, completed);
  safeStorageSet(window.sessionStorage, PRIVACY_CONSENT_SESSION_KEY, serialized);
  safeStorageSet(window.sessionStorage, PRIVACY_CONSENT_COMPLETED_SESSION_KEY, completed);
}

export function readPrivacyConsent() {
  if (typeof window === "undefined") return null;
  const now = new Date();
  const storageRecords = [
    safeStorageGet(window.localStorage, PRIVACY_CONSENT_STORAGE_KEY),
    safeStorageGet(window.sessionStorage, PRIVACY_CONSENT_SESSION_KEY),
  ];
  for (const rawStored of storageRecords) {
    const stored = parsePrivacyConsent(rawStored) || legacyPrivacyConsent(rawStored, now);
    if (stored) {
      persistLocalPrivacyConsent(stored);
      return stored;
    }
  }

  const cookieConsent = parsePrivacyConsentCookie(typeof document === "undefined" ? null : document.cookie);
  if (cookieConsent) {
    persistLocalPrivacyConsent(cookieConsent);
    return cookieConsent;
  }

  const completedLocally =
    hasCompletedPrivacyStep(safeStorageGet(window.localStorage, PRIVACY_CONSENT_COMPLETED_STORAGE_KEY), now)
    || hasCompletedPrivacyStep(safeStorageGet(window.sessionStorage, PRIVACY_CONSENT_COMPLETED_SESSION_KEY), now);
  if (completedLocally || hasCompletedPrivacyStepCookie(typeof document === "undefined" ? null : document.cookie, now)) {
    const completed = createPrivacyConsent({}, now);
    persistLocalPrivacyConsent(completed);
    return completed;
  }
  if (memoryPrivacyConsent) return memoryPrivacyConsent;
  if (memoryPrivacyChoiceCompleted) return createPrivacyConsent({}, now);
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

export function resetPrivacyConsentMemoryForTests() {
  memoryPrivacyConsent = null;
  memoryPrivacyChoiceCompleted = false;
}
