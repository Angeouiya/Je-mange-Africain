export const PRIVACY_CONSENT_VERSION = 1;
export const PRIVACY_CONSENT_STORAGE_KEY = "jma-privacy-consent-v1";
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

export function readPrivacyConsent() {
  if (typeof window === "undefined") return null;
  return parsePrivacyConsent(window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY));
}

export function savePrivacyConsent(consent: PrivacyConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  const flags = `${Number(consent.analytics)}${Number(consent.personalization)}${Number(consent.marketing)}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `jma_privacy_consent=v${consent.version}.${flags}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(PRIVACY_CONSENT_CHANGE_EVENT, { detail: consent }));
}

export function requestPrivacyPreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}

export function optionalConsentCount(consent: Pick<PrivacyConsent, OptionalPrivacyPreference>) {
  return Number(consent.analytics) + Number(consent.personalization) + Number(consent.marketing);
}
