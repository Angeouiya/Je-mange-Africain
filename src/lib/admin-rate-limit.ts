import type { NextRequest } from "next/server";
import { enforceRateLimit, type RateLimitPolicy } from "@/lib/redis";

export type AdminCriticalRateLimitPolicy = Extract<RateLimitPolicy, "admin-sensitive" | "media-upload">;

export function adminRateLimitSubject(user: { id?: string | null; email?: string | null }) {
  return user.id || user.email || undefined;
}

export function enforceAdminCriticalPerimeterRateLimit(request: NextRequest, policy: AdminCriticalRateLimitPolicy) {
  return enforceRateLimit(request, policy, undefined, { scopes: ["ip", "route"] });
}

export function enforceAdminCriticalSubjectRateLimit(request: NextRequest, policy: AdminCriticalRateLimitPolicy, subject?: string) {
  return enforceRateLimit(request, policy, subject, { scopes: ["subject"] });
}
