import { z } from "zod";
import { db } from "@/lib/db";
import { COMPANY_PROFILE, PRIMARY_BUSINESS_LOCATION } from "@/lib/company-profile";

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
  supportEmail: process.env.NEXT_PUBLIC_COMPANY_EMAIL || COMPANY_PROFILE.email,
  supportPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE || PRIMARY_BUSINESS_LOCATION.phoneDisplay,
  supportHoursFr: "Du lundi au vendredi, de 9 h à 18 h",
  supportHoursEn: "Monday to Friday, 9am to 6pm",
  supportResponseHours: 48,
  businessCity: PRIMARY_BUSINESS_LOCATION.city,
  businessCountry: PRIMARY_BUSINESS_LOCATION.country,
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
  | "CF_PAGES"
  | "CLOUDFLARE_ACCOUNT_ID"
  | "CLOUDFLARE_DEPLOYMENT_TARGET"
  | "CLOUDFLARE_ENV"
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
  | "VAPID_SUBJECT"
>>;

export const PRODUCTION_SUPABASE_PROJECT_REF = "ahigidhuhqcmxzjxetnw";
export const PRODUCTION_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;

export type DeploymentRequirementGroup = "database" | "identity" | "payments" | "cache" | "push" | "hosting";

export type CloudflareDeploymentRequirement = {
  id: string;
  group: DeploymentRequirementGroup;
  labelFr: string;
  labelEn: string;
  detailFr: string;
  detailEn: string;
  envKeys: string[];
  satisfied: boolean;
  severity: "blocking";
};

export type CloudflareDeploymentReadiness = {
  target: "Cloudflare Workers";
  ready: boolean;
  completed: number;
  total: number;
  percentage: number;
  blockers: string[];
  checkedAt: string;
  deployCommand: "npm run cloudflare:deploy";
  requirements: CloudflareDeploymentRequirement[];
};

export const CLOUDFLARE_PRODUCTION_ENV_KEYS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

export function platformIntegrationStatus(databaseAvailable: boolean, environment: PlatformEnvironment = process.env) {
  const databaseUrl = environment.DATABASE_URL || "";
  const supabaseUrl = (environment.NEXT_PUBLIC_SUPABASE_URL || environment.SUPABASE_URL || "").replace(/\/+$/, "");
  const postgres = /^postgres(?:ql)?:/i.test(databaseUrl);
  const deployed = environment.NODE_ENV === "production";
  const cloudflareWorkers = environment.CLOUDFLARE_DEPLOYMENT_TARGET === "workers";
  const cloudflareHosting = Boolean(environment.CLOUDFLARE_ACCOUNT_ID && cloudflareWorkers);
  const cloudflareRuntime = cloudflareHosting || Boolean(environment.CLOUDFLARE_ENV || environment.CF_PAGES);
  const persistentDatabase = databaseAvailable && (postgres || !deployed);
  const productionDatabase = databaseAvailable && postgres;
  const stripeCore = Boolean(environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && environment.STRIPE_SECRET_KEY);
  const supabaseProject = supabaseUrl === PRODUCTION_SUPABASE_URL;
  const supabaseCore = Boolean(supabaseProject && (environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.SUPABASE_PUBLISHABLE_KEY));

  return [
    {
      id: "database",
      state: databaseAvailable && (!deployed || productionDatabase) ? "ready" : "attention",
      provider: postgres ? "PostgreSQL" : deployed ? "SQLite temporaire" : "SQLite locale",
      capabilities: { connection: databaseAvailable, persistence: persistentDatabase, production: productionDatabase },
    },
    { id: "payments", state: stripeCore && environment.STRIPE_WEBHOOK_SECRET ? "ready" : stripeCore ? "partial" : "attention", provider: "Stripe", capabilities: { connection: stripeCore, webhook: Boolean(environment.STRIPE_WEBHOOK_SECRET) } },
    { id: "identity", state: supabaseCore && environment.SUPABASE_SERVICE_ROLE_KEY ? "ready" : supabaseCore ? "partial" : "attention", provider: "Supabase", capabilities: { connection: supabaseCore, project: supabaseProject, serverAccess: Boolean(environment.SUPABASE_SERVICE_ROLE_KEY) } },
    { id: "cache", state: environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN ? "ready" : "attention", provider: "Upstash Redis", capabilities: { connection: Boolean(environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN) } },
    { id: "push", state: environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY && environment.VAPID_PRIVATE_KEY ? "ready" : "attention", provider: "Web Push", capabilities: { connection: Boolean(environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY && environment.VAPID_PRIVATE_KEY) } },
    { id: "hosting", state: cloudflareHosting ? "ready" : cloudflareRuntime ? "partial" : "attention", provider: "Cloudflare Workers", capabilities: { account: Boolean(environment.CLOUDFLARE_ACCOUNT_ID), workers: cloudflareWorkers, runtime: cloudflareRuntime } },
  ] as const;
}

export function cloudflareDeploymentReadiness(databaseAvailable: boolean, environment: PlatformEnvironment = process.env, checkedAt = new Date().toISOString()): CloudflareDeploymentReadiness {
  const databaseUrl = environment.DATABASE_URL || "";
  const supabaseUrl = (environment.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const postgres = /^postgres(?:ql)?:\/\//i.test(databaseUrl);
  const has = (key: keyof PlatformEnvironment) => Boolean(environment[key]);
  const cloudflareWorkers = environment.CLOUDFLARE_DEPLOYMENT_TARGET === "workers";
  const requirements: CloudflareDeploymentRequirement[] = [
    {
      id: "database-url",
      group: "database",
      labelFr: "Base PostgreSQL Supabase",
      labelEn: "Supabase PostgreSQL database",
      detailFr: "Connexion PostgreSQL disponible et utilisable par le runtime Cloudflare.",
      detailEn: "PostgreSQL connection available and usable by the Cloudflare runtime.",
      envKeys: ["DATABASE_URL"],
      satisfied: databaseAvailable && postgres,
      severity: "blocking",
    },
    {
      id: "supabase-url",
      group: "identity",
      labelFr: "URL publique Supabase",
      labelEn: "Public Supabase URL",
      detailFr: `Projet Supabase ${PRODUCTION_SUPABASE_PROJECT_REF} exposé au client pour l'inscription, la session et les médias.`,
      detailEn: `Supabase project ${PRODUCTION_SUPABASE_PROJECT_REF} exposed to the client for registration, session and media.`,
      envKeys: ["NEXT_PUBLIC_SUPABASE_URL"],
      satisfied: supabaseUrl === PRODUCTION_SUPABASE_URL,
      severity: "blocking",
    },
    {
      id: "supabase-publishable-key",
      group: "identity",
      labelFr: "Clé publique Supabase",
      labelEn: "Supabase publishable key",
      detailFr: "Clé publique limitée pour initialiser le client Supabase.",
      detailEn: "Limited public key used to initialize the Supabase client.",
      envKeys: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
      satisfied: has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      severity: "blocking",
    },
    {
      id: "supabase-service-role",
      group: "identity",
      labelFr: "Accès serveur Supabase",
      labelEn: "Supabase server access",
      detailFr: "Accès serveur requis pour les opérations protégées de l'admin et des médias.",
      detailEn: "Server access required for protected admin and media operations.",
      envKeys: ["SUPABASE_SERVICE_ROLE_KEY"],
      satisfied: has("SUPABASE_SERVICE_ROLE_KEY"),
      severity: "blocking",
    },
    {
      id: "stripe-publishable-key",
      group: "payments",
      labelFr: "Clé publique Stripe",
      labelEn: "Stripe publishable key",
      detailFr: "Initialisation sécurisée du formulaire carte, wallets et PayPal côté client.",
      detailEn: "Secure initialization of card, wallets and PayPal on the client.",
      envKeys: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
      satisfied: has("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      severity: "blocking",
    },
    {
      id: "stripe-server-key",
      group: "payments",
      labelFr: "Clé serveur Stripe",
      labelEn: "Stripe server key",
      detailFr: "Création des intentions de paiement et rapprochement côté serveur.",
      detailEn: "Payment intent creation and server-side reconciliation.",
      envKeys: ["STRIPE_SECRET_KEY"],
      satisfied: has("STRIPE_SECRET_KEY"),
      severity: "blocking",
    },
    {
      id: "stripe-webhook",
      group: "payments",
      labelFr: "Webhook Stripe",
      labelEn: "Stripe webhook",
      detailFr: "Confirmation fiable des paiements, remboursements et événements asynchrones.",
      detailEn: "Reliable confirmation for payments, refunds and asynchronous events.",
      envKeys: ["STRIPE_WEBHOOK_SECRET"],
      satisfied: has("STRIPE_WEBHOOK_SECRET"),
      severity: "blocking",
    },
    {
      id: "redis-url",
      group: "cache",
      labelFr: "URL Upstash Redis",
      labelEn: "Upstash Redis URL",
      detailFr: "Cache, limitation de trafic et protection des tentatives sensibles.",
      detailEn: "Cache, traffic limiting and protection for sensitive attempts.",
      envKeys: ["UPSTASH_REDIS_REST_URL"],
      satisfied: has("UPSTASH_REDIS_REST_URL"),
      severity: "blocking",
    },
    {
      id: "redis-token",
      group: "cache",
      labelFr: "Jeton Upstash Redis",
      labelEn: "Upstash Redis token",
      detailFr: "Autorisation serveur pour écrire les compteurs et données temporaires.",
      detailEn: "Server authorization to write counters and temporary data.",
      envKeys: ["UPSTASH_REDIS_REST_TOKEN"],
      satisfied: has("UPSTASH_REDIS_REST_TOKEN"),
      severity: "blocking",
    },
    {
      id: "vapid-public",
      group: "push",
      labelFr: "Clé publique push",
      labelEn: "Push public key",
      detailFr: "Abonnement mobile aux notifications web push.",
      detailEn: "Mobile subscription to web push notifications.",
      envKeys: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"],
      satisfied: has("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
      severity: "blocking",
    },
    {
      id: "vapid-private",
      group: "push",
      labelFr: "Clé serveur push",
      labelEn: "Push server key",
      detailFr: "Signature serveur des notifications envoyées aux abonnés.",
      detailEn: "Server signing for notifications sent to subscribers.",
      envKeys: ["VAPID_PRIVATE_KEY"],
      satisfied: has("VAPID_PRIVATE_KEY"),
      severity: "blocking",
    },
    {
      id: "vapid-subject",
      group: "push",
      labelFr: "Contact push VAPID",
      labelEn: "VAPID push contact",
      detailFr: "Contact technique exigé par le protocole Web Push.",
      detailEn: "Technical contact required by the Web Push protocol.",
      envKeys: ["VAPID_SUBJECT"],
      satisfied: has("VAPID_SUBJECT"),
      severity: "blocking",
    },
    {
      id: "cloudflare-account",
      group: "hosting",
      labelFr: "Compte Cloudflare",
      labelEn: "Cloudflare account",
      detailFr: "Compte Cloudflare ciblé par la configuration Wrangler.",
      detailEn: "Cloudflare account targeted by the Wrangler configuration.",
      envKeys: ["CLOUDFLARE_ACCOUNT_ID"],
      satisfied: has("CLOUDFLARE_ACCOUNT_ID"),
      severity: "blocking",
    },
    {
      id: "cloudflare-workers-target",
      group: "hosting",
      labelFr: "Cible Workers",
      labelEn: "Workers target",
      detailFr: "Le déploiement doit cibler le runtime Workers de Cloudflare.",
      detailEn: "Deployment must target the Cloudflare Workers runtime.",
      envKeys: ["CLOUDFLARE_DEPLOYMENT_TARGET"],
      satisfied: cloudflareWorkers,
      severity: "blocking",
    },
  ];
  const completed = requirements.filter((requirement) => requirement.satisfied).length;
  const blockers = requirements.filter((requirement) => !requirement.satisfied).map((requirement) => requirement.id);

  return {
    target: "Cloudflare Workers",
    ready: blockers.length === 0,
    completed,
    total: requirements.length,
    percentage: Math.round((completed / requirements.length) * 100),
    blockers,
    checkedAt,
    deployCommand: "npm run cloudflare:deploy",
    requirements,
  };
}
