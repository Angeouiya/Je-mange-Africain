import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export type RateLimitPolicy =
  | "api-gateway"
  | "auth"
  | "register"
  | "password-reset"
  | "checkout"
  | "shipping-quote"
  | "payment-intent"
  | "checkout-finalize"
  | "recipe-configurator"
  | "search"
  | "account"
  | "saved-library"
  | "admin-auth"
  | "admin-read"
  | "admin-write"
  | "admin-sensitive"
  | "media-upload"
  | "push";

type RateLimitScope = "ip" | "subject" | "route" | "global";
type RateLimitWindow = {
  requests: number;
  windowMs: number;
  window: `${number} ${"s" | "m" | "h"}`;
  scope: RateLimitScope;
};
type RateLimitPolicyConfig = {
  windows: RateLimitWindow[];
  messageFr: string;
  messageEn: string;
};
type RateLimitOptions = {
  scopes?: RateLimitScope[];
};
type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const remoteRequiredPolicies = new Set<RateLimitPolicy>([
  "auth",
  "register",
  "password-reset",
  "checkout",
  "shipping-quote",
  "payment-intent",
  "checkout-finalize",
  "recipe-configurator",
  "account",
  "saved-library",
  "admin-auth",
  "admin-read",
  "admin-write",
  "admin-sensitive",
  "media-upload",
  "push",
]);

export const rateLimitPolicyConfig: Record<RateLimitPolicy, RateLimitPolicyConfig> = {
  "api-gateway": {
    windows: [
      { scope: "ip", requests: 240, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 90, windowMs: 60_000, window: "1 m" },
      { scope: "ip", requests: 1_800, windowMs: 60 * 60_000, window: "1 h" },
      { scope: "global", requests: 12_000, windowMs: 60_000, window: "1 m" },
    ],
    messageFr: "La plateforme reçoit trop de requêtes depuis cet accès. Veuillez patienter avant de recommencer.",
    messageEn: "The platform is receiving too many requests from this access. Please wait before trying again.",
  },
  auth: {
    windows: [
      { scope: "ip", requests: 12, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 5, windowMs: 60_000, window: "1 m" },
      { scope: "ip", requests: 40, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de tentatives de connexion. Veuillez patienter avant de recommencer.",
    messageEn: "Too many sign-in attempts. Please wait before trying again.",
  },
  register: {
    windows: [
      { scope: "ip", requests: 5, windowMs: 60 * 60_000, window: "1 h" },
      { scope: "subject", requests: 2, windowMs: 60 * 60_000, window: "1 h" },
      { scope: "global", requests: 120, windowMs: 60_000, window: "1 m" },
    ],
    messageFr: "Trop de créations de compte depuis cet accès. Réessayez plus tard.",
    messageEn: "Too many account creations from this access. Try again later.",
  },
  "password-reset": {
    windows: [
      { scope: "ip", requests: 4, windowMs: 60 * 60_000, window: "1 h" },
      { scope: "subject", requests: 3, windowMs: 60 * 60_000, window: "1 h" },
      { scope: "global", requests: 100, windowMs: 60_000, window: "1 m" },
    ],
    messageFr: "Trop de demandes de mot de passe. Veuillez patienter avant de recommencer.",
    messageEn: "Too many password requests. Please wait before trying again.",
  },
  checkout: {
    windows: [
      { scope: "ip", requests: 16, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 10, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 30, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de tentatives de commande. Veuillez patienter avant de recommencer.",
    messageEn: "Too many checkout attempts. Please wait before trying again.",
  },
  "shipping-quote": {
    windows: [
      { scope: "ip", requests: 30, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 40, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 24, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 180, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de simulations de livraison. Veuillez patienter avant de recommencer.",
    messageEn: "Too many delivery simulations. Please wait before trying again.",
  },
  "payment-intent": {
    windows: [
      { scope: "ip", requests: 10, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 18, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 6, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 18, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de tentatives de paiement. Veuillez patienter avant de recommencer.",
    messageEn: "Too many payment attempts. Please wait before trying again.",
  },
  "checkout-finalize": {
    windows: [
      { scope: "ip", requests: 12, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 20, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 8, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 24, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de finalisations de commande. Veuillez patienter avant de recommencer.",
    messageEn: "Too many order finalization attempts. Please wait before trying again.",
  },
  "recipe-configurator": {
    windows: [
      { scope: "ip", requests: 36, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 48, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 24, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 160, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de recalculs de recette. Veuillez patienter avant de recommencer.",
    messageEn: "Too many recipe recalculations. Please wait before trying again.",
  },
  search: {
    windows: [
      { scope: "ip", requests: 120, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 160, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 90, windowMs: 60_000, window: "1 m" },
    ],
    messageFr: "La recherche reçoit trop de demandes. Réessayez dans un instant.",
    messageEn: "Search is receiving too many requests. Try again shortly.",
  },
  account: {
    windows: [
      { scope: "ip", requests: 60, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 40, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 400, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop d'actions sur le compte. Veuillez patienter avant de recommencer.",
    messageEn: "Too many account actions. Please wait before trying again.",
  },
  "saved-library": {
    windows: [
      { scope: "ip", requests: 70, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 50, windowMs: 60_000, window: "1 m" },
    ],
    messageFr: "Trop d'actions sur vos favoris. Veuillez patienter avant de recommencer.",
    messageEn: "Too many saved item actions. Please wait before trying again.",
  },
  "admin-auth": {
    windows: [
      { scope: "ip", requests: 6, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 5, windowMs: 60_000, window: "1 m" },
      { scope: "ip", requests: 25, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de tentatives de connexion professionnelle. Veuillez patienter avant de recommencer.",
    messageEn: "Too many professional sign-in attempts. Please wait before trying again.",
  },
  "admin-read": {
    windows: [
      { scope: "ip", requests: 600, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 240, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 360, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 2_400, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop de requêtes administrateur. Veuillez patienter avant de recommencer.",
    messageEn: "Too many admin requests. Please wait before trying again.",
  },
  "admin-write": {
    windows: [
      { scope: "ip", requests: 160, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 80, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 60, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 300, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop d'actions administrateur. Veuillez patienter avant de recommencer.",
    messageEn: "Too many admin actions. Please wait before trying again.",
  },
  "admin-sensitive": {
    windows: [
      { scope: "ip", requests: 24, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 18, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 12, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 80, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop d'actions sensibles. Veuillez patienter avant de recommencer.",
    messageEn: "Too many sensitive actions. Please wait before trying again.",
  },
  "media-upload": {
    windows: [
      { scope: "ip", requests: 24, windowMs: 60_000, window: "1 m" },
      { scope: "route", requests: 18, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 16, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 100, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop d'envois de médias. Veuillez patienter avant de recommencer.",
    messageEn: "Too many media uploads. Please wait before trying again.",
  },
  push: {
    windows: [
      { scope: "ip", requests: 40, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 24, windowMs: 60_000, window: "1 m" },
      { scope: "subject", requests: 160, windowMs: 60 * 60_000, window: "1 h" },
    ],
    messageFr: "Trop d'actions de notification. Veuillez patienter avant de recommencer.",
    messageEn: "Too many notification actions. Please wait before trying again.",
  },
};

const remoteLimiters = redis
  ? Object.fromEntries(Object.entries(rateLimitPolicyConfig).flatMap(([name, config]) => config.windows.map((window, index) => [
      `${name}:${index}`,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(window.requests, window.window),
        prefix: `jma:ratelimit:${name}:${window.scope}:${index}`,
        analytics: true,
        timeout: 1_500,
      }),
    ]))) as Record<string, Ratelimit>
  : null;

const localBuckets = new Map<string, { count: number; resetAt: number }>();

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy, subject?: string, options: RateLimitOptions = {}) {
  const config = rateLimitPolicyConfig[policy];
  const activeScopes = options.scopes ? new Set(options.scopes) : null;
  const remoteRequired = remoteRateLimitRequired(policy);

  if (remoteRequired && !remoteLimiters) {
    return rateLimitUnavailableResponse(request, policy);
  }

  for (let index = 0; index < config.windows.length; index += 1) {
    const window = config.windows[index];
    if (activeScopes && !activeScopes.has(window.scope)) continue;
    const identifier = identifierForWindow(request, policy, window.scope, subject);
    if (!identifier) continue;
    const windowIdentifier = `${identifier}:window:${index}`;

    let result: RateLimitResult;
    try {
      result = remoteLimiters
        ? await remoteLimiters[`${policy}:${index}`].limit(windowIdentifier)
        : limitLocally(windowIdentifier, window);
    } catch {
      if (remoteRequired) return rateLimitUnavailableResponse(request, policy);
      result = limitLocally(windowIdentifier, window);
    }

    if (!result.success) return rateLimitResponse(request, policy, window.scope, result);
  }

  return null;
}

export function clearLocalRateLimitBuckets() {
  localBuckets.clear();
}

export function remoteRateLimitRequired(policy: RateLimitPolicy, environment: Record<string, string | undefined> = process.env) {
  if (!remoteRequiredPolicies.has(policy)) return false;
  if (environment.JMA_REQUIRE_REMOTE_RATE_LIMITS === "true") return true;
  return environment.NODE_ENV === "production"
    || environment.CLOUDFLARE_ENV === "production"
    || environment.CLOUDFLARE_DEPLOYMENT_TARGET === "workers"
    || environment.CF_PAGES === "1";
}

function rateLimitResponse(request: Request, policy: RateLimitPolicy, scope: RateLimitScope, result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: localizedRateLimitMessage(request, policy), code: "RATE_LIMITED", policy },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Policy": policy,
        "X-RateLimit-Scope": scope,
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}

function rateLimitUnavailableResponse(request: Request, policy: RateLimitPolicy) {
  const acceptsEnglish = request.headers.get("accept-language")?.toLowerCase().startsWith("en");
  return NextResponse.json(
    {
      error: acceptsEnglish
        ? "This protected action is temporarily unavailable while security throttling is offline."
        : "Cette action protégée est momentanément indisponible pendant que la limitation de sécurité est hors ligne.",
      code: "RATE_LIMIT_UNAVAILABLE",
      policy,
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "30",
        "X-RateLimit-Policy": policy,
        "X-RateLimit-Mode": "required",
      },
    },
  );
}

function localizedRateLimitMessage(request: Request, policy: RateLimitPolicy) {
  const acceptsEnglish = request.headers.get("accept-language")?.toLowerCase().startsWith("en");
  return acceptsEnglish ? rateLimitPolicyConfig[policy].messageEn : rateLimitPolicyConfig[policy].messageFr;
}

function identifierForWindow(request: Request, policy: RateLimitPolicy, scope: RateLimitScope, subject?: string) {
  const ip = clientAddress(request);
  if (scope === "ip") return `${policy}:ip:${safeSegment(ip)}`;
  if (scope === "route") return `${policy}:route:${safeSegment(ip)}:${safeSegment(requestPath(request))}`;
  if (scope === "global") return `${policy}:global`;
  const normalizedSubject = subject?.trim().toLowerCase();
  if (!normalizedSubject) return null;
  return `${policy}:subject:${fingerprint(normalizedSubject)}`;
}

function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

function requestPath(request: Request) {
  try {
    return new URL(request.url).pathname || "unknown";
  } catch {
    return "unknown";
  }
}

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._:/-]/g, "_").slice(0, 180) || "unknown";
}

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(36);
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
