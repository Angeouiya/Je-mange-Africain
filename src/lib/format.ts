import type { Locale } from "./i18n";

/** Format a EUR price. fr → "12,90 €", en → "€12.90" */
export function formatPrice(amount: number, locale: Locale = "fr"): string {
  const n = Number.isFinite(amount) ? amount : 0;
  if (locale === "en") {
    return "€" + n.toFixed(2);
  }
  return n.toFixed(2).replace(".", ",") + " €";
}

export function formatUnitPrice(amount: number | null | undefined, locale: Locale = "fr"): string {
  if (!amount || !Number.isFinite(Number(amount))) return "";
  const normalized = Number(amount) > 300 ? Number(amount) / 1000 : Number(amount);
  return formatPrice(normalized, locale);
}

/** Format a weight in grams → "1,2 kg" / "350 g" */
export function formatWeight(grams: number, locale: Locale = "fr"): string {
  if (!grams || grams <= 0) return "—";
  if (grams >= 1000) {
    const kg = grams / 1000;
    const s = (Math.round(kg * 100) / 100).toFixed(kg % 1 === 0 ? 0 : 1);
    return locale === "en" ? `${s} kg` : `${s.replace(".", ",")} kg`;
  }
  return `${Math.round(grams)} g`;
}

/** Format a volume in ml → "1,5 L" / "500 ml" */
export function formatVolume(ml: number, locale: Locale = "fr"): string {
  if (!ml || ml <= 0) return "—";
  if (ml >= 1000) {
    const l = ml / 1000;
    const s = (Math.round(l * 100) / 100).toFixed(l % 1 === 0 ? 0 : 1);
    return locale === "en" ? `${s} L` : `${s.replace(".", ",")} L`;
  }
  return `${Math.round(ml)} ml`;
}

/** Format an ISO date → "12 janv. 2024" / "Jan 12, 2024" */
export function formatDate(iso: string | Date, locale: Locale = "fr"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Format an ISO datetime with time */
export function formatDateTime(iso: string | Date, locale: Locale = "fr"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Human label for a unit code, localized */
export function unitLabel(unit: string, locale: Locale = "fr"): string {
  const labels: Record<string, [string, string]> = {
    g: ["g", "g"],
    kg: ["kg", "kg"],
    ml: ["ml", "ml"],
    L: ["L", "L"],
    piece: ["pièce", "piece"],
    tbsp: ["c. à soupe", "tbsp"],
    tsp: ["c. à café", "tsp"],
  };
  return (labels[unit] || [unit, unit])[locale === "en" ? 1 : 0];
}

/** Normalize a string for accent/case-insensitive search */
export function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Classify thermal class color for badges */
export function thermalColor(thermal: string): string {
  switch (thermal) {
    case "FROZEN": return "bg-blue-100 text-blue-800 border-blue-200";
    case "REFRIGERATED": return "bg-teal-100 text-teal-800 border-teal-200";
    default: return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

/** Classify thermal class label */
export function thermalLabel(thermal: string, locale: Locale = "fr"): string {
  const map: Record<string, [string, string]> = {
    FROZEN: ["Surgelé", "Frozen"],
    REFRIGERATED: ["Réfrigéré", "Chilled"],
    AMBIANT: ["Ambiant", "Ambient"],
  };
  return (map[thermal] || map.AMBIANT)[locale === "en" ? 1 : 0];
}

/** Status color for order state */
export function orderStatusColor(status: string): string {
  if (["delivered"].includes(status)) return "bg-green-100 text-green-800 border-green-200";
  if (["cancelled", "failed", "refunded"].includes(status)) return "bg-red-100 text-red-800 border-red-200";
  if (["shipped", "in_transit", "delivering", "packed", "controlDone"].includes(status))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (["preparing", "paymentPending", "stockReserved", "fraudCheck", "awaitingClient", "replacement"].includes(status))
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}
