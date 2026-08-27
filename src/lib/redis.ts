import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export type RateLimitPolicy = "auth" | "register" | "checkout" | "search";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const policyConfig: Record<RateLimitPolicy, { requests: number; windowMs: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  auth: { requests: 8, windowMs: 60_000, window: "1 m" },
  register: { requests: 4, windowMs: 60 * 60_000, window: "1 h" },
  checkout: { requests: 12, windowMs: 60_000, window: "1 m" },
  search: { requests: 90, windowMs: 60_000, window: "1 m" },
};

const remoteLimiters = redis
  ? Object.fromEntries(Object.entries(policyConfig).map(([name, config]) => [
      name,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `jma:ratelimit:${name}`,
        analytics: true,
        timeout: 1_500,
      }),
    ])) as Record<RateLimitPolicy, Ratelimit>
  : null;

const localBuckets = new Map<string, { count: number; resetAt: number }>();

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy, subject?: string) {
  const identifier = `${subject || clientAddress(request)}:${policy}`;
  let result;
  try {
    result = remoteLimiters
      ? await remoteLimiters[policy].limit(identifier)
      : limitLocally(identifier, policyConfig[policy]);
  } catch {
    result = limitLocally(identifier, policyConfig[policy]);
  }

  if (result.success) return null;

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Trop de tentatives. Veuillez patienter avant de recommencer." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

function limitLocally(identifier: string, config: { requests: number; windowMs: number }) {
  const now = Date.now();
  const current = localBuckets.get(identifier);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + config.windowMs } : current;
  bucket.count += 1;
  localBuckets.set(identifier, bucket);

  if (localBuckets.size > 5_000) {
    for (const [key, value] of localBuckets) {
      if (value.resetAt <= now) localBuckets.delete(key);
    }
  }

  return {
    success: bucket.count <= config.requests,
    limit: config.requests,
    remaining: Math.max(0, config.requests - bucket.count),
    reset: bucket.resetAt,
  };
}
