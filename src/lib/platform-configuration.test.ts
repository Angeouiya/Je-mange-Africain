import { describe, expect, it } from "vitest";
import { cloudflareDeploymentReadiness, platformIntegrationStatus, PRODUCTION_SUPABASE_PROJECT_REF, PRODUCTION_SUPABASE_PUBLISHABLE_KEY } from "./platform-configuration";

const productionDatabaseUrl = `postgresql://postgres:secret@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;

describe("platform production readiness", () => {
  it("never presents an ephemeral SQLite database as production-ready on Cloudflare", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: "file:/tmp/je-mange-africain/custom.db",
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
    });
    const database = integrations.find((integration) => integration.id === "database");

    expect(database).toMatchObject({
      state: "attention",
      provider: "SQLite temporaire",
      capabilities: { connection: true, persistence: false, production: false },
    });
    expect(integrations.find((integration) => integration.id === "hosting")).toMatchObject({
      state: "ready",
      provider: "Cloudflare Workers",
      capabilities: { account: true, workers: true, runtime: true },
    });
  });

  it("accepts SQLite for local work without claiming production persistence", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: "file:../db/custom.db",
      NODE_ENV: "development",
    });
    const database = integrations.find((integration) => integration.id === "database");

    expect(database).toMatchObject({ state: "ready", provider: "SQLite locale", capabilities: { connection: true, persistence: true, production: false } });
    expect(integrations.find((integration) => integration.id === "hosting")).toMatchObject({ state: "attention", provider: "Cloudflare Workers" });
  });

  it("reports a fully connected PostgreSQL, Stripe, Supabase, cache, push and Cloudflare foundation", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: productionDatabaseUrl,
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      CLOUDFLARE_ENV: "production",
      CLOUDFLARE_DOMAIN_STATUS: "attached",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      UPSTASH_REDIS_REST_URL: "https://cache.example.test",
      UPSTASH_REDIS_REST_TOKEN: "redis_example",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public_example",
      VAPID_PRIVATE_KEY: "private_example",
    });

    expect(integrations.every((integration) => integration.state === "ready")).toBe(true);
    expect(integrations.find((integration) => integration.id === "database")).toMatchObject({ provider: "Supabase PostgreSQL", capabilities: { production: true } });
    expect(integrations.find((integration) => integration.id === "identity")).toMatchObject({ provider: "Supabase", capabilities: { project: true } });
    expect(integrations.find((integration) => integration.id === "hosting")).toMatchObject({ provider: "Cloudflare Workers", capabilities: { runtime: true, domain: true } });
  });

  it("treats the Cloudflare Worker as deployable while the public domain is deferred", () => {
    const environment = {
      DATABASE_URL: productionDatabaseUrl,
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      CLOUDFLARE_DOMAIN_STATUS: "deferred",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      UPSTASH_REDIS_REST_URL: "https://cache.example.test",
      UPSTASH_REDIS_REST_TOKEN: "redis_token",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "push_public",
      VAPID_PRIVATE_KEY: "push_private",
      VAPID_SUBJECT: "mailto:contact@je-mange-africain.com",
    } as const;

    const integrations = platformIntegrationStatus(true, environment);
    const readiness = cloudflareDeploymentReadiness(true, environment);

    expect(integrations.find((integration) => integration.id === "hosting")).toMatchObject({ state: "ready", capabilities: { domainConfigured: true, domainDeferred: true, domain: false } });
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.requirements.find((requirement) => requirement.id === "cloudflare-domain")).toMatchObject({ satisfied: false, severity: "recommended", envKeys: ["NEXT_PUBLIC_SITE_URL", "CLOUDFLARE_DOMAIN_STATUS"] });
  });

  it("refuses an external PostgreSQL database as the production database", () => {
    const environment = {
      DATABASE_URL: "postgresql://app:secret@db.example.test:5432/app",
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
    } as const;

    const integrations = platformIntegrationStatus(true, environment);
    const readiness = cloudflareDeploymentReadiness(true, environment);

    expect(integrations.find((integration) => integration.id === "database")).toMatchObject({ state: "attention", provider: "PostgreSQL externe", capabilities: { production: false } });
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContain("database-url");
  });

  it("refuses to treat another Supabase project as the production identity target", () => {
    const environment = {
      DATABASE_URL: productionDatabaseUrl,
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      CLOUDFLARE_DOMAIN_STATUS: "attached",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ailevucikakmgsxfptwv.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      UPSTASH_REDIS_REST_URL: "https://cache.example.test",
      UPSTASH_REDIS_REST_TOKEN: "redis_token",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "push_public",
      VAPID_PRIVATE_KEY: "push_private",
      VAPID_SUBJECT: "mailto:contact@je-mange-africain.com",
    } as const;

    const integrations = platformIntegrationStatus(true, environment);
    const readiness = cloudflareDeploymentReadiness(true, environment);

    expect(integrations.find((integration) => integration.id === "identity")).toMatchObject({ state: "attention", capabilities: { project: false } });
    expect(readiness.ready).toBe(false);
    expect(readiness.requirements.find((requirement) => requirement.id === "supabase-url")).toMatchObject({ satisfied: false, envKeys: ["NEXT_PUBLIC_SUPABASE_URL"] });
  });

  it("turns the current deployment blockers into an explicit Cloudflare checklist", () => {
    const readiness = cloudflareDeploymentReadiness(true, {
      DATABASE_URL: "file:../db/custom.db",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "push_public",
      VAPID_PRIVATE_KEY: "push_private",
      VAPID_SUBJECT: "mailto:contact@je-mange-africain.com",
    }, "2026-09-06T15:40:00.000Z");
    const missingKeys = readiness.requirements.filter((requirement) => !requirement.satisfied).flatMap((requirement) => requirement.envKeys);

    expect(readiness.ready).toBe(false);
    expect(readiness.deployCommand).toBe("npm run cloudflare:deploy");
    expect(readiness.requirements.find((requirement) => requirement.id === "database-url")).toMatchObject({ satisfied: false, envKeys: ["DATABASE_URL"] });
    expect(missingKeys).toEqual(expect.arrayContaining([
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]));
  });

  it("clears the Cloudflare checklist only when every deploy prerequisite is present", () => {
    const readiness = cloudflareDeploymentReadiness(true, {
      DATABASE_URL: productionDatabaseUrl,
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      CLOUDFLARE_DOMAIN_STATUS: "attached",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      UPSTASH_REDIS_REST_URL: "https://cache.example.test",
      UPSTASH_REDIS_REST_TOKEN: "redis_token",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "push_public",
      VAPID_PRIVATE_KEY: "push_private",
      VAPID_SUBJECT: "mailto:contact@je-mange-africain.com",
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.completed).toBe(readiness.total);
    expect(readiness.percentage).toBe(100);
    expect(readiness.blockers).toEqual([]);
  });

  it("refuses another Supabase publishable key even when the project URL is correct", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: productionDatabaseUrl,
      NODE_ENV: "production",
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_other_project",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
    });
    const readiness = cloudflareDeploymentReadiness(true, {
      DATABASE_URL: productionDatabaseUrl,
      CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
      CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_other_project",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
    });

    expect(integrations.find((integration) => integration.id === "identity")).toMatchObject({ state: "attention", capabilities: { project: true, publishableKey: false } });
    expect(readiness.requirements.find((requirement) => requirement.id === "supabase-publishable-key")).toMatchObject({ satisfied: false });
  });
});
