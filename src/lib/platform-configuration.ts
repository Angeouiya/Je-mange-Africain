import { z } from "zod";
import { db } from "@/lib/db";

export const PLATFORM_CONFIGURATION_ID = "primary";

export const PlatformConfigurationInput = z.object({
  supportEmail: z.string().trim().email().max(254),
  supportPhone: z.string().trim().max(32),
  supportHoursFr: z.string().trim().min(3).max(160),
  supportHoursEn: z.string().trim().min(3).max(160),
  supportResponseHours: z.coerce.number().int().min(1).max(168),
  businessCity: z.string().trim().min(2).max(80),
  businessCountry: z.string().trim().min(2).max(80),
});

export type PlatformConfigurationValues = z.infer<typeof PlatformConfigurationInput>;

export type PublicPlatformConfiguration = {
  support: {
    email: string;
    phone: string;
    hours: { fr: string; en: string };
    responseHours: number;
  };
  location: { city: string; country: string };
};

export const DEFAULT_PLATFORM_CONFIGURATION: PlatformConfigurationValues = {
  supportEmail: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
  supportPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
  supportHoursFr: "Du lundi au vendredi, de 9 h à 18 h",
  supportHoursEn: "Monday to Friday, 9am to 6pm",
  supportResponseHours: 48,
  businessCity: "Paris",
  businessCountry: "France",
};

type StoredPlatformConfiguration = Partial<PlatformConfigurationValues> & {
  updatedBy?: string | null;
  updatedAt?: Date | string | null;
};

export function normalizePlatformConfiguration(configuration?: StoredPlatformConfiguration | null): PlatformConfigurationValues {
  return PlatformConfigurationInput.parse({ ...DEFAULT_PLATFORM_CONFIGURATION, ...configuration });
}

export function toPublicPlatformConfiguration(configuration: PlatformConfigurationValues): PublicPlatformConfiguration {
  return {
    support: {
      email: configuration.supportEmail,
      phone: configuration.supportPhone,
      hours: { fr: configuration.supportHoursFr, en: configuration.supportHoursEn },
      responseHours: configuration.supportResponseHours,
    },
    location: { city: configuration.businessCity, country: configuration.businessCountry },
  };
}

export async function readPlatformConfiguration() {
  try {
    const stored = await db.platformConfiguration.findUnique({ where: { id: PLATFORM_CONFIGURATION_ID } });
    return {
      configuration: normalizePlatformConfiguration(stored),
      persisted: Boolean(stored),
      databaseAvailable: true,
      updatedBy: stored?.updatedBy || null,
      updatedAt: stored?.updatedAt?.toISOString() || null,
    };
  } catch {
    return {
      configuration: normalizePlatformConfiguration(),
      persisted: false,
      databaseAvailable: false,
      updatedBy: null,
      updatedAt: null,
    };
  }
}

type PlatformEnvironment = Partial<Pick<NodeJS.ProcessEnv,
  | "DATABASE_URL"
  | "NODE_ENV"
  | "VERCEL"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
  | "VAPID_PRIVATE_KEY"
>>;

export function platformIntegrationStatus(databaseAvailable: boolean, environment: PlatformEnvironment = process.env) {
  const databaseUrl = environment.DATABASE_URL || "";
  const postgres = /^postgres(?:ql)?:/i.test(databaseUrl);
  const deployed = environment.VERCEL === "1" || environment.NODE_ENV === "production";
  const persistentDatabase = databaseAvailable && (postgres || !deployed);
  const productionDatabase = databaseAvailable && postgres;
  const stripeCore = Boolean(environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && environment.STRIPE_SECRET_KEY);
  const supabaseCore = Boolean((environment.NEXT_PUBLIC_SUPABASE_URL || environment.SUPABASE_URL) && (environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.SUPABASE_PUBLISHABLE_KEY));

  return [
    {
      id: "database",
      state: databaseAvailable && (!deployed || productionDatabase) ? "ready" : "attention",
      provider: postgres ? "PostgreSQL" : deployed ? "SQLite temporaire" : "SQLite locale",
      capabilities: { connection: databaseAvailable, persistence: persistentDatabase, production: productionDatabase },
    },
    { id: "payments", state: stripeCore && environment.STRIPE_WEBHOOK_SECRET ? "ready" : stripeCore ? "partial" : "attention", provider: "Stripe", capabilities: { connection: stripeCore, webhook: Boolean(environment.STRIPE_WEBHOOK_SECRET) } },
    { id: "identity", state: supabaseCore && environment.SUPABASE_SERVICE_ROLE_KEY ? "ready" : supabaseCore ? "partial" : "attention", provider: "Supabase", capabilities: { connection: supabaseCore, serverAccess: Boolean(environment.SUPABASE_SERVICE_ROLE_KEY) } },
    { id: "cache", state: environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN ? "ready" : "attention", provider: "Upstash Redis", capabilities: { connection: Boolean(environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN) } },
    { id: "push", state: environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY && environment.VAPID_PRIVATE_KEY ? "ready" : "attention", provider: "Web Push", capabilities: { connection: Boolean(environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY && environment.VAPID_PRIVATE_KEY) } },
  ] as const;
}
