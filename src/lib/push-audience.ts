export const PUSH_AUDIENCES = ["all", "signed_in", "guests", "ambassador", "active", "at_risk", "new"] as const;

export type PushAudience = (typeof PUSH_AUDIENCES)[number];
export type PushAudienceCounts = Record<PushAudience, number>;
