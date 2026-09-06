import { describe, expect, it } from "vitest";
import {
  CLOUDFLARE_PUBLICATION_MODE,
  preferredDashboardBrowser,
  printProductionReadiness,
  productionReadiness,
  PRODUCTION_SITE_URL,
  PRODUCTION_SUPABASE_PROJECT_NAME,
  PRODUCTION_SUPABASE_PROJECT_REF,
  PRODUCTION_SUPABASE_URL,
  supabaseCliReadiness,
  supabaseProjectRefFromPostgresUrl,
} from "../../scripts/production-autopilot.mjs";

function environment(values: Record<string, string>) {
  return {
    values,
    sources: Object.fromEntries(Object.keys(values).map((key) => [key, "test"])),
    cwd: process.cwd(),
  };
}

describe("production autopilot", () => {
  const readyValues = {
    DATABASE_URL: `postgresql://postgres:secret@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`,
    NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    SUPABASE_SERVICE_ROLE_KEY: "service_role_example",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
    STRIPE_SECRET_KEY: "sk_live_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    UPSTASH_REDIS_REST_URL: "https://cache.example.test",
    UPSTASH_REDIS_REST_TOKEN: "redis_token",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "push_public",
    VAPID_PRIVATE_KEY: "push_private",
    VAPID_SUBJECT: "mailto:contact@je-mange-africain.com",
    NEXT_PUBLIC_SITE_URL: PRODUCTION_SITE_URL,
    CLOUDFLARE_DOMAIN_STATUS: "attached",
    CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
    CLOUDFLARE_DEPLOYMENT_TARGET: "workers",
  };

  it("accepts only the JMA Supabase project and Workers target", () => {
    const report = productionReadiness(environment(readyValues));

    expect(report.ready).toBe(true);
    expect(report.target.supabaseName).toBe(PRODUCTION_SUPABASE_PROJECT_NAME);
    expect(report.target.supabaseRef).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(report.target.supabaseUrl).toBe(PRODUCTION_SUPABASE_URL);
    expect(report.target.siteUrl).toBe(PRODUCTION_SITE_URL);
    expect(report.target.domainStatus).toBe("attached");
    expect(report.target.publicationMode).toBe(CLOUDFLARE_PUBLICATION_MODE);
    expect(report.blockers).toEqual([]);
  });

  it("allows the initial Cloudflare setup with the public domain still deferred", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      CLOUDFLARE_DOMAIN_STATUS: "deferred",
    }));

    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("refuses any unrelated workers.dev URL as the public storefront", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      NEXT_PUBLIC_SITE_URL: "https://je-mange-africain.other-project.workers.dev",
    }));

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "NEXT_PUBLIC_SITE_URL", problem: expect.stringContaining(PRODUCTION_SITE_URL) }),
    ]));
  });

  it("blocks local databases and previous Supabase projects", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      DATABASE_URL: "file:./dev.db",
      NEXT_PUBLIC_SUPABASE_URL: "https://ailevucikakmgsxfptwv.supabase.co",
    }));

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "DATABASE_URL", problem: expect.stringContaining("PostgreSQL") }),
      expect.objectContaining({ key: "NEXT_PUBLIC_SUPABASE_URL", problem: expect.stringContaining(PRODUCTION_SUPABASE_PROJECT_REF) }),
    ]));
  });

  it("blocks PostgreSQL URLs that do not target the JMA Supabase project", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      DATABASE_URL: "postgresql://postgres:secret@db.ailevucikakmgsxfptwv.supabase.co:5432/postgres",
      DIRECT_URL: "postgresql://postgres.ailevucikakmgsxfptwv:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
    }));

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "DATABASE_URL", problem: expect.stringContaining("ailevucikakmgsxfptwv") }),
      expect.objectContaining({ key: "DIRECT_URL", problem: expect.stringContaining("ailevucikakmgsxfptwv") }),
    ]));
  });

  it("prints readiness without leaking secret values", () => {
    const report = productionReadiness(environment(readyValues));
    const lines: string[] = [];

    printProductionReadiness(report, (line) => lines.push(line));
    const output = lines.join("\n");

    expect(output).toContain("Production environment is ready to deploy.");
    expect(output).toContain("STRIPE_SECRET_KEY");
    expect(output).not.toContain(readyValues.STRIPE_SECRET_KEY);
    expect(output).not.toContain(readyValues.SUPABASE_SERVICE_ROLE_KEY);
    expect(output).not.toContain(readyValues.UPSTASH_REDIS_REST_TOKEN);
  });

  it("tracks Supabase CLI credentials separately from the public runtime", () => {
    const report = supabaseCliReadiness(environment({
      NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL,
      SUPABASE_ACCESS_TOKEN: "sbp_example",
      SUPABASE_DB_PASSWORD: "remote_password",
    }), PRODUCTION_SUPABASE_PROJECT_REF);

    expect(report).toMatchObject({
      targetRef: PRODUCTION_SUPABASE_PROJECT_REF,
      hasAccessToken: true,
      hasDbPassword: true,
      hasDirectDatabaseUrl: false,
      linkedToTarget: true,
      readyForLink: true,
      readyForDbPush: true,
    });
  });

  it("allows Supabase migration push with a direct PostgreSQL URL", () => {
    const report = supabaseCliReadiness(environment({
      DIRECT_URL: `postgresql://postgres.${PRODUCTION_SUPABASE_PROJECT_REF}:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`,
    }));

    expect(report).toMatchObject({
      hasAccessToken: false,
      hasDbPassword: false,
      hasDirectDatabaseUrl: true,
      directDatabaseUrlKey: "DIRECT_URL",
      directDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      readyForLink: false,
      readyForDbPush: true,
    });
  });

  it("refuses direct migration URLs from unrelated PostgreSQL or Supabase projects", () => {
    const report = supabaseCliReadiness(environment({
      DIRECT_URL: "postgresql://app:secret@db.example.test:5432/app",
    }));

    expect(report).toMatchObject({
      hasDirectDatabaseUrl: false,
      directDatabaseProblem: expect.stringContaining(PRODUCTION_SUPABASE_PROJECT_REF),
      readyForDbPush: false,
    });
  });

  it("extracts the project ref from Supabase direct and pooler database URLs", () => {
    expect(supabaseProjectRefFromPostgresUrl(`postgresql://postgres:secret@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`)).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(supabaseProjectRefFromPostgresUrl(`postgresql://postgres.${PRODUCTION_SUPABASE_PROJECT_REF}:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`)).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
  });

  it("opens provider dashboards with Edge first on Windows", () => {
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const env = {
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
      PROGRAMFILES: "C:\\Program Files",
    } as unknown as NodeJS.ProcessEnv;
    const exists = ((candidate: unknown) => [edgePath, chromePath].includes(String(candidate))) as typeof import("node:fs").existsSync;

    expect(preferredDashboardBrowser({ platform: "win32", env, exists })).toEqual({ label: "Microsoft Edge", executable: edgePath });
    expect(preferredDashboardBrowser({ platform: "win32", env: { ...env, JMA_PRODUCTION_BROWSER: "chrome" }, exists })).toEqual({ label: "Chrome", executable: chromePath });
  });
});
