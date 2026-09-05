import { describe, expect, it } from "vitest";
import { platformIntegrationStatus } from "./platform-configuration";

describe("platform production readiness", () => {
  it("never presents an ephemeral Vercel SQLite database as production-ready", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: "file:/tmp/je-mange-africain/custom.db",
      NODE_ENV: "production",
      VERCEL: "1",
    });
    const database = integrations.find((integration) => integration.id === "database");

    expect(database).toMatchObject({
      state: "attention",
      provider: "SQLite temporaire",
      capabilities: { connection: true, persistence: false, production: false },
    });
  });

  it("accepts SQLite for local work without claiming production persistence", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: "file:../db/custom.db",
      NODE_ENV: "development",
    });
    const database = integrations.find((integration) => integration.id === "database");

    expect(database).toMatchObject({ state: "ready", provider: "SQLite locale", capabilities: { connection: true, persistence: true, production: false } });
  });

  it("reports a fully connected PostgreSQL, Stripe, Supabase, cache and push foundation", () => {
    const integrations = platformIntegrationStatus(true, {
      DATABASE_URL: "postgresql://app:secret@db.example.test:5432/app",
      NODE_ENV: "production",
      VERCEL: "1",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
      UPSTASH_REDIS_REST_URL: "https://cache.example.test",
      UPSTASH_REDIS_REST_TOKEN: "redis_example",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public_example",
      VAPID_PRIVATE_KEY: "private_example",
    });

    expect(integrations.every((integration) => integration.state === "ready")).toBe(true);
    expect(integrations.find((integration) => integration.id === "database")).toMatchObject({ provider: "PostgreSQL", capabilities: { production: true } });
  });
});
