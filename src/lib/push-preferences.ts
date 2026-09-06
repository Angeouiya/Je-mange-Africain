export const PUSH_PREFERENCE_KEYS = ["order", "system", "recipe", "promotion"] as const;

export type PushPreferenceKey = (typeof PUSH_PREFERENCE_KEYS)[number];

export type PushPreferences = Record<PushPreferenceKey, boolean>;

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  order: true,
  system: true,
  recipe: false,
  promotion: false,
};

export type PushPreferenceRecord = {
  orderAlerts?: boolean;
  systemAlerts?: boolean;
  recipeAlerts?: boolean;
  promotionAlerts?: boolean;
};

const PREFERENCE_FIELDS: Record<PushPreferenceKey, keyof PushPreferenceRecord> = {
  order: "orderAlerts",
  system: "systemAlerts",
  recipe: "recipeAlerts",
  promotion: "promotionAlerts",
};

export function normalizePushPreferences(value: unknown): PushPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_PUSH_PREFERENCES };
  const candidate = value as Partial<Record<PushPreferenceKey, unknown>>;
  return Object.fromEntries(PUSH_PREFERENCE_KEYS.map((key) => [
    key,
    typeof candidate[key] === "boolean" ? candidate[key] : DEFAULT_PUSH_PREFERENCES[key],
  ])) as PushPreferences;
}

export function pushPreferenceField(type: string | null | undefined) {
  const key = PUSH_PREFERENCE_KEYS.includes(type as PushPreferenceKey) ? type as PushPreferenceKey : "system";
  return PREFERENCE_FIELDS[key];
}

export function pushPreferenceData(preferences: PushPreferences): Required<PushPreferenceRecord> {
  return {
    orderAlerts: preferences.order,
    systemAlerts: preferences.system,
    recipeAlerts: preferences.recipe,
    promotionAlerts: preferences.promotion,
  };
}

export function acceptsPushType(subscription: PushPreferenceRecord, type: string | null | undefined) {
  return subscription[pushPreferenceField(type)] === true;
}
