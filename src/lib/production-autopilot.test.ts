import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import {
  CLOUDFLARE_PUBLICATION_MODE,
  cloudflareSecretNames,
  parseJsonPayload,
  preferredDashboardBrowser,
  postgresPasswordFromUrl,
  prismaBaselineReadiness,
  prismaPostgresMigrationNames,
  printRemoteProductionReadiness,
  printProductionReadiness,
  productionReadiness,
  PRODUCTION_HYPERDRIVE_ID,
  PRODUCTION_SITE_URL,
  PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
  PRODUCTION_SUPABASE_PROJECT_NAME,
  PRODUCTION_SUPABASE_PROJECT_REF,
  PRODUCTION_SUPABASE_URL,
  remoteProductionReadiness,
  REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS,
  supabaseCliReadiness,
  supabaseProjectRefFromPostgresUrl,
  unappliedPrismaMigrationNames,
} from "../../scripts/production-autopilot.mjs";

function environment(values: Record<string, string>) {
  return {
    values,
    sources: Object.fromEntries(Object.keys(values).map((key) => [key, "test"])),
    cwd: process.cwd(),
  };
}

describe("production autopilot", () => {
  const cliResult = (stdout: string, status = 0) => ({ status, stdout, stderr: "", error: "" });
  const readyValues = {
    DATABASE_URL: `postgresql://postgres:secret@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`,
    NEXT_PUBLIC_SUPABASE_URL: PRODUCTION_SUPABASE_URL,
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
    NEXT_PUBLIC_SITE_URL: PRODUCTION_SITE_URL,
    CLOUDFLARE_DOMAIN_STATUS: "attached",
    CLOUDFLARE_ACCOUNT_ID: "82164eca9557f63e18984230deac12bc",
    CLOUDFLARE_HYPERDRIVE_ID: PRODUCTION_HYPERDRIVE_ID,
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

  it("blocks an unrelated Hyperdrive and previous Supabase projects", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      CLOUDFLARE_HYPERDRIVE_ID: "unrelated-hyperdrive",
      NEXT_PUBLIC_SUPABASE_URL: "https://ailevucikakmgsxfptwv.supabase.co",
    }));

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "CLOUDFLARE_HYPERDRIVE_ID", problem: expect.stringContaining(PRODUCTION_HYPERDRIVE_ID) }),
      expect.objectContaining({ key: "NEXT_PUBLIC_SUPABASE_URL", problem: expect.stringContaining(PRODUCTION_SUPABASE_PROJECT_REF) }),
    ]));
  });

  it("blocks publishable keys that do not belong to the JMA Supabase project", () => {
    const report = productionReadiness(environment({
      ...readyValues,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_other_project",
    }));

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", problem: expect.stringContaining(PRODUCTION_SUPABASE_PROJECT_NAME) }),
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
      hasDbPassword: true,
      dbPasswordSource: "DIRECT_URL",
      hasDirectDatabaseUrl: true,
      directDatabaseUrlKey: "DIRECT_URL",
      directDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      readyForLink: false,
      readyForDbPush: true,
    });
  });

  it("prepares a redacted Prisma baseline plan only for the JMA database", () => {
    const directUrl = `postgresql://postgres:${encodeURIComponent("remote@password")}@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
    const report = prismaBaselineReadiness({ DIRECT_URL: directUrl });
    const migrations = prismaPostgresMigrationNames();

    expect(report.ready).toBe(true);
    expect(report.directDatabaseUrlKey).toBe("DIRECT_URL");
    expect(report.directDatabaseProjectRef).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(report.migrations).toEqual(migrations);
    expect(report.migrations).toContain("0001_initial");
    expect(JSON.stringify(report)).not.toContain("remote%40password");
  });

  it("blocks Prisma baselining for non-JMA database URLs", () => {
    const report = prismaBaselineReadiness({
      DIRECT_URL: "postgresql://postgres:secret@db.ailevucikakmgsxfptwv.supabase.co:5432/postgres",
    });

    expect(report.ready).toBe(false);
    expect(report.directDatabaseUrlKey).toBeNull();
    expect(report.problem).toContain("JMA Supabase");
  });

  it("parses unapplied Prisma migrations from migrate status output", () => {
    const migrations = ["0001_initial", "20260907150000_align_order_allocations_and_phone_index"];
    const output = `Following migrations have not yet been applied:
0001_initial
20260907150000_align_order_allocations_and_phone_index

To apply migrations in production run prisma migrate deploy.`;

    expect(unappliedPrismaMigrationNames(output, migrations)).toEqual(migrations);
    expect(unappliedPrismaMigrationNames("Database schema is up to date!", migrations)).toEqual([]);
  });

  it("derives the Supabase database password from a valid production Postgres URL", () => {
    const encodedPassword = encodeURIComponent("remote@password#2609");
    const report = supabaseCliReadiness(environment({
      SUPABASE_ACCESS_TOKEN: "sbp_example",
      DATABASE_URL: `postgresql://postgres:${encodedPassword}@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`,
    }));

    expect(postgresPasswordFromUrl(`postgresql://postgres:${encodedPassword}@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`)).toBe("remote@password#2609");
    expect(report).toMatchObject({
      hasAccessToken: true,
      hasDbPassword: true,
      dbPasswordSource: "DATABASE_URL",
      hasDirectDatabaseUrl: true,
      readyForLink: true,
      readyForDbPush: true,
    });
  });

  it("rejects placeholder Postgres passwords before Supabase linking", () => {
    const placeholderUrl = `postgresql://postgres:${encodeURIComponent("[YOUR-PASSWORD]")}@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
    const report = supabaseCliReadiness(environment({
      SUPABASE_ACCESS_TOKEN: "sbp_example",
      DATABASE_URL: placeholderUrl,
    }));

    expect(postgresPasswordFromUrl(placeholderUrl)).toBe("");
    expect(report).toMatchObject({
      hasDbPassword: false,
      hasDirectDatabaseUrl: false,
      directDatabaseProblem: "placeholder value",
      readyForLink: false,
      readyForDbPush: false,
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

  it("parses provider JSON even when a CLI appends a status line", () => {
    expect(parseJsonPayload('{"projects":[{"ref":"one","name":"Demo"}]}\nCannot find project ref.')).toEqual({
      projects: [{ ref: "one", name: "Demo" }],
    });
    expect(cloudflareSecretNames([{ name: "DATABASE_URL" }, { name: "STRIPE_SECRET_KEY" }])).toEqual(["DATABASE_URL", "STRIPE_SECRET_KEY"]);
  });

  it("reports remote blockers when Cloudflare secrets are empty and JMA is not visible in Supabase", () => {
    const { DATABASE_URL: _databaseUrl, ...valuesWithoutDirectDatabase } = readyValues;
    const report = remoteProductionReadiness({
      environment: environment(valuesWithoutDirectDatabase),
      linkedProjectRef: "",
      runner: (command, args) => {
        const joined = `${command} ${args.join(" ")}`;
        if (joined.includes("wrangler deployments list")) return cliResult("Version(s): prod");
        if (joined.includes("wrangler secret list")) return cliResult("[]");
        if (joined.includes("supabase projects list")) return {
          status: 0,
          stdout: JSON.stringify({ projects: [{ ref: "umockhnaabuxdmeeyszy", name: "Angeouiya's Project" }] }),
          stderr: "",
          error: "",
        };
        return { status: 1, stdout: "", stderr: "unexpected", error: "" };
      },
    });
    const lines: string[] = [];
    printRemoteProductionReadiness(report, (line) => lines.push(line));

    expect(report.ready).toBe(false);
    expect(report.cloudflare.workerDeploymentsReadable).toBe(true);
    expect(report.cloudflare.missingRemoteSecretKeys).toEqual(REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS);
    expect(report.supabase.targetProject).toBeNull();
    expect(report.supabase.hasRemoteAccess).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "CLOUDFLARE_SECRETS" }),
      expect.objectContaining({ key: "SUPABASE_PROJECT" }),
      expect.objectContaining({ key: "SUPABASE_LINK" }),
    ]));
    expect(lines.join("\n")).toContain(`0/${REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS.length} required present`);
  });

  it("accepts direct JMA database access when migrations are aligned", () => {
    const migrationRows = readdirSync("supabase/migrations")
      .map((name) => name.match(/^(\d{14})_/)?.[1])
      .filter(Boolean)
      .map((version) => ({ local: version, remote: version }));
    const report = remoteProductionReadiness({
      environment: environment({
        ...readyValues,
        DIRECT_URL: readyValues.DATABASE_URL,
      }),
      linkedProjectRef: "",
      runner: (command, args) => {
        const joined = `${command} ${args.join(" ")}`;
        if (joined.includes("wrangler deployments list")) return cliResult("Version(s): prod");
        if (joined.includes("wrangler secret list")) return cliResult(JSON.stringify(REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS.map((name) => ({ name }))));
        if (joined.includes("supabase projects list")) return {
          status: 0,
          stdout: JSON.stringify({ projects: [{ ref: "umockhnaabuxdmeeyszy", name: "Angeouiya's Project" }] }),
          stderr: "",
          error: "",
        };
        if (joined.includes("supabase migration list")) return cliResult(JSON.stringify({ migrations: migrationRows }));
        return { status: 1, stdout: "", stderr: "unexpected", error: "" };
      },
    });
    const lines: string[] = [];

    printRemoteProductionReadiness(report, (line) => lines.push(line));

    expect(report.ready).toBe(true);
    expect(report.supabase.targetProject).toBeNull();
    expect(report.supabase.hasRemoteAccess).toBe(true);
    expect(report.supabase.directMigrationAligned).toBe(true);
    expect(lines.join("\n")).toContain("direct database verified");
    expect(lines.join("\n")).not.toContain(readyValues.STRIPE_SECRET_KEY);
  });

  it("accepts remote production wiring when the worker secrets and JMA project are visible", () => {
    const report = remoteProductionReadiness({
      environment: environment(readyValues),
      linkedProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      runner: (command, args) => {
        const joined = `${command} ${args.join(" ")}`;
        if (joined.includes("wrangler deployments list")) return cliResult("Version(s): prod");
        if (joined.includes("wrangler secret list")) return cliResult(JSON.stringify(REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS.map((name) => ({ name }))));
        if (joined.includes("supabase projects list")) return {
          status: 0,
          stdout: JSON.stringify({ projects: [{ ref: PRODUCTION_SUPABASE_PROJECT_REF, name: PRODUCTION_SUPABASE_PROJECT_NAME, region: "eu-west-3" }] }),
          stderr: "",
          error: "",
        };
        return { status: 1, stdout: "", stderr: "unexpected", error: "" };
      },
    });
    const lines: string[] = [];

    printRemoteProductionReadiness(report, (line) => lines.push(line));

    expect(report.ready).toBe(true);
    expect(lines.join("\n")).toContain("Remote production wiring is ready.");
    expect(lines.join("\n")).not.toContain(readyValues.STRIPE_SECRET_KEY);
  });
});
