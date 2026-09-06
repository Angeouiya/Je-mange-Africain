#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

export const PRODUCTION_SUPABASE_PROJECT_REF = "ahigidhuhqcmxzjxetnw";
export const PRODUCTION_SUPABASE_PROJECT_NAME = "JMA";
export const PRODUCTION_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
export const PRODUCTION_CLOUDFLARE_ACCOUNT_ID = "82164eca9557f63e18984230deac12bc";
export const PRODUCTION_WORKER_NAME = "je-mange-africain";
export const PRODUCTION_SITE_URL = "https://je-mange-africain.com";
export const CLOUDFLARE_PUBLICATION_MODE = "Worker created, public domain deferred";
export const SUPABASE_OPERATIONAL_KEYS = ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "DIRECT_URL"];

const DOTENV_FILES = [".env", ".env.local", ".env.production.local"];
const REQUIRED_ENV = [
  ["DATABASE_URL", "PostgreSQL runtime connection"],
  ["NEXT_PUBLIC_SUPABASE_URL", `Supabase URL must target ${PRODUCTION_SUPABASE_PROJECT_NAME} (${PRODUCTION_SUPABASE_PROJECT_REF})`],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase publishable key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase server service role"],
  ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Stripe publishable key"],
  ["STRIPE_SECRET_KEY", "Stripe server key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret"],
  ["UPSTASH_REDIS_REST_URL", "Upstash Redis REST URL"],
  ["UPSTASH_REDIS_REST_TOKEN", "Upstash Redis REST token"],
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Web Push public VAPID key"],
  ["VAPID_PRIVATE_KEY", "Web Push private VAPID key"],
  ["VAPID_SUBJECT", "Web Push contact subject"],
  ["NEXT_PUBLIC_SITE_URL", "Public storefront URL"],
  ["CLOUDFLARE_DOMAIN_STATUS", "Cloudflare domain attachment status"],
  ["CLOUDFLARE_ACCOUNT_ID", "Cloudflare account"],
  ["CLOUDFLARE_DEPLOYMENT_TARGET", "Cloudflare Workers target"],
];
const CLOUDFLARE_SECRET_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

function parseDotenvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const entries = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const index = normalized.indexOf("=");
    const key = normalized.slice(0, index).trim();
    const rawValue = normalized.slice(index + 1).trim();
    entries[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return entries;
}

function readWranglerConfig(cwd = process.cwd()) {
  const configPath = resolve(cwd, "wrangler.jsonc");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

export function loadProductionEnvironment(cwd = process.cwd()) {
  const values = {};
  const sources = {};
  for (const name of DOTENV_FILES) {
    const filePath = resolve(cwd, name);
    const parsed = parseDotenvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      values[key] = value;
      sources[key] = name;
    }
  }

  const wrangler = readWranglerConfig(cwd);
  const wranglerVars = wrangler.vars || {};
  const wranglerFallbacks = {
    CLOUDFLARE_ACCOUNT_ID: wrangler.account_id,
    ...wranglerVars,
  };
  for (const [key, value] of Object.entries(wranglerFallbacks)) {
    if (values[key] || !value) continue;
    values[key] = String(value);
    sources[key] = "wrangler.jsonc";
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    values[key] = value;
    sources[key] = "process.env";
  }

  return { values, sources, cwd };
}

function isPlaceholder(key, value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower.includes("your_")
    || lower.includes("replace_me")
    || lower.includes("change_me")
    || lower.includes("user:password@host")
    || lower === `${key.toLowerCase()}_value`;
}

function isPostgresUrl(value) {
  return /^postgres(?:ql)?:\/\//i.test(value || "");
}

function hasUsableValue(key, value) {
  return Boolean(value && !isPlaceholder(key, value));
}

function normalizedUrl(value) {
  return value.replace(/\/+$/, "");
}

function evaluateRequirement(key, label, values, sources) {
  const value = values[key] || "";
  const source = sources[key] || "missing";
  if (!value) return { key, label, ok: false, source, problem: "missing" };
  if (isPlaceholder(key, value)) return { key, label, ok: false, source, problem: "placeholder value" };
  if (key === "DATABASE_URL" && !isPostgresUrl(value)) {
    return { key, label, ok: false, source, problem: "must be PostgreSQL, not SQLite/local file" };
  }
  if (key === "NEXT_PUBLIC_SUPABASE_URL" && normalizedUrl(value) !== PRODUCTION_SUPABASE_URL) {
    const currentRef = (value.match(/https:\/\/([^.]+)/) || [])[1] || "unknown";
    return { key, label, ok: false, source, problem: `points to ${currentRef}, expected ${PRODUCTION_SUPABASE_PROJECT_REF}` };
  }
  if (key === "NEXT_PUBLIC_SITE_URL" && !/^https:\/\//i.test(normalizedUrl(value))) {
    return { key, label, ok: false, source, problem: "must be an HTTPS URL" };
  }
  if (key === "NEXT_PUBLIC_SITE_URL" && normalizedUrl(value) !== PRODUCTION_SITE_URL) {
    return { key, label, ok: false, source, problem: `must be ${PRODUCTION_SITE_URL}` };
  }
  if (key === "CLOUDFLARE_DOMAIN_STATUS" && !["deferred", "attached"].includes(value)) {
    return { key, label, ok: false, source, problem: "must be deferred or attached" };
  }
  if (key === "CLOUDFLARE_ACCOUNT_ID" && value !== PRODUCTION_CLOUDFLARE_ACCOUNT_ID) {
    return { key, label, ok: false, source, problem: `must target ${PRODUCTION_CLOUDFLARE_ACCOUNT_ID}` };
  }
  if (key === "CLOUDFLARE_DEPLOYMENT_TARGET" && value !== "workers") {
    return { key, label, ok: false, source, problem: "must be workers" };
  }
  return { key, label, ok: true, source, problem: "" };
}

export function productionReadiness(environment = loadProductionEnvironment()) {
  const requirements = REQUIRED_ENV.map(([key, label]) => evaluateRequirement(key, label, environment.values, environment.sources));
  const blockers = requirements.filter((item) => !item.ok);
  return {
    ready: blockers.length === 0,
    requirements,
    blockers,
    target: {
      supabaseRef: PRODUCTION_SUPABASE_PROJECT_REF,
      supabaseName: PRODUCTION_SUPABASE_PROJECT_NAME,
      supabaseUrl: PRODUCTION_SUPABASE_URL,
      cloudflareAccountId: PRODUCTION_CLOUDFLARE_ACCOUNT_ID,
      workerName: PRODUCTION_WORKER_NAME,
      siteUrl: PRODUCTION_SITE_URL,
      domainStatus: environment.values.CLOUDFLARE_DOMAIN_STATUS || "deferred",
      publicationMode: CLOUDFLARE_PUBLICATION_MODE,
    },
  };
}

export function supabaseCliReadiness(environment = loadProductionEnvironment()) {
  const values = environment.values;
  const directUrl = hasUsableValue("DIRECT_URL", values.DIRECT_URL) && isPostgresUrl(values.DIRECT_URL)
    ? values.DIRECT_URL
    : hasUsableValue("DATABASE_URL", values.DATABASE_URL) && isPostgresUrl(values.DATABASE_URL)
      ? values.DATABASE_URL
      : "";
  return {
    targetRef: PRODUCTION_SUPABASE_PROJECT_REF,
    hasAccessToken: hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN),
    hasDbPassword: hasUsableValue("SUPABASE_DB_PASSWORD", values.SUPABASE_DB_PASSWORD),
    hasDirectDatabaseUrl: Boolean(directUrl),
    readyForLink: hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN) && hasUsableValue("SUPABASE_DB_PASSWORD", values.SUPABASE_DB_PASSWORD),
    readyForDbPush: Boolean(directUrl) || (hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN) && hasUsableValue("SUPABASE_DB_PASSWORD", values.SUPABASE_DB_PASSWORD)),
  };
}

export function printProductionReadiness(report, writer = console.log) {
  const publicTarget = report.target.domainStatus === "attached"
    ? report.target.siteUrl
    : `public domain deferred (${report.target.siteUrl})`;
  writer(`Production target: Supabase ${report.target.supabaseName} (${report.target.supabaseRef}) -> Cloudflare Worker ${report.target.workerName} -> ${publicTarget} (${report.target.publicationMode})`);
  for (const item of report.requirements) {
    const state = item.ok ? "OK" : "BLOCKED";
    const suffix = item.problem ? ` - ${item.problem}` : "";
    writer(`${state} ${item.key} (${item.source})${suffix}`);
  }
  writer(report.ready ? "Production environment is ready to deploy." : `${report.blockers.length} production blocker(s) remain.`);
}

export function printSupabaseCliReadiness(report, writer = console.log) {
  writer(`Supabase CLI target: ${PRODUCTION_SUPABASE_PROJECT_NAME} (${report.targetRef})`);
  writer(`${report.hasAccessToken ? "OK" : "BLOCKED"} SUPABASE_ACCESS_TOKEN`);
  writer(`${report.hasDbPassword ? "OK" : "BLOCKED"} SUPABASE_DB_PASSWORD`);
  writer(`${report.hasDirectDatabaseUrl ? "OK" : "BLOCKED"} DIRECT_URL or PostgreSQL DATABASE_URL`);
  writer(`${report.readyForLink ? "OK" : "BLOCKED"} Supabase project link`);
  writer(`${report.readyForDbPush ? "OK" : "BLOCKED"} Supabase migration push`);
}

function ensureReady(report) {
  if (report.ready) return;
  printProductionReadiness(report, (line) => console.error(line));
  process.exit(1);
}

function bin(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function run(command, args, env) {
  const result = spawnSync(bin(command), args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function ensureSupabaseCanLink(values) {
  const report = supabaseCliReadiness({ values, sources: {}, cwd: process.cwd() });
  if (report.readyForLink) return;
  printSupabaseCliReadiness(report, (line) => console.error(line));
  console.error("Supabase link needs SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD in the local environment.");
  process.exit(1);
}

function ensureSupabaseCanPush(values) {
  const report = supabaseCliReadiness({ values, sources: {}, cwd: process.cwd() });
  if (report.readyForDbPush) return;
  printSupabaseCliReadiness(report, (line) => console.error(line));
  console.error("Supabase db push needs DIRECT_URL/PostgreSQL DATABASE_URL, or SUPABASE_ACCESS_TOKEN plus SUPABASE_DB_PASSWORD.");
  process.exit(1);
}

function cloudflareSecrets(values) {
  return Object.fromEntries(
    CLOUDFLARE_SECRET_KEYS
      .filter((key) => values[key])
      .map((key) => [key, values[key]]),
  );
}

function writeTemporarySecretsFile(values) {
  const dir = mkdtempSync(join(tmpdir(), "jma-cloudflare-secrets-"));
  const filePath = join(dir, "secrets.json");
  writeFileSync(filePath, `${JSON.stringify(cloudflareSecrets(values), null, 2)}\n`, { mode: 0o600 });
  return { dir, filePath };
}

function syncCloudflareSecrets(values) {
  const payload = JSON.stringify(cloudflareSecrets(values));
  const result = spawnSync(bin("npx"), ["wrangler", "secret", "bulk", "--config", "wrangler.jsonc", "--name", PRODUCTION_WORKER_NAME], {
    cwd: process.cwd(),
    env: { ...process.env, ...values },
    input: payload,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function migrateDatabase(values) {
  const migrationEnv = { ...values };
  if (values.DIRECT_URL) migrationEnv.DATABASE_URL = values.DIRECT_URL;
  run("npm", ["run", "db:generate:postgres"], migrationEnv);
  run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/postgresql/schema.prisma"], migrationEnv);
}

function linkSupabaseProject(values) {
  ensureSupabaseCanLink(values);
  run("npx", [
    "supabase",
    "link",
    "--project-ref",
    PRODUCTION_SUPABASE_PROJECT_REF,
    "--password",
    values.SUPABASE_DB_PASSWORD,
    "--yes",
  ], values);
}

function pushSupabaseMigrations(values) {
  ensureSupabaseCanPush(values);
  const directUrl = hasUsableValue("DIRECT_URL", values.DIRECT_URL) && isPostgresUrl(values.DIRECT_URL)
    ? values.DIRECT_URL
    : hasUsableValue("DATABASE_URL", values.DATABASE_URL) && isPostgresUrl(values.DATABASE_URL)
      ? values.DATABASE_URL
      : "";
  const args = ["supabase", "db", "push", "--skip-vault", "--yes"];
  if (directUrl) {
    args.push("--db-url", directUrl);
  } else {
    args.push("--project-ref", PRODUCTION_SUPABASE_PROJECT_REF, "--password", values.SUPABASE_DB_PASSWORD);
  }
  run("npx", args, values);
}

function deployCloudflare(values) {
  run("npm", ["run", "cloudflare:build"], values);
  const { dir, filePath } = writeTemporarySecretsFile(values);
  try {
    run("npx", ["wrangler", "deploy", "--config", "dist/server/wrangler.json", "--keep-vars", "--secrets-file", filePath], values);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function preferredDashboardBrowser({
  platform = process.platform,
  env = process.env,
  exists = existsSync,
} = {}) {
  if (platform !== "win32") return null;
  const edgeCandidates = [
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe"),
    env.PROGRAMFILES && join(env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
    env["PROGRAMFILES(X86)"] && join(env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter(Boolean);
  const chromeCandidates = [
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    env.PROGRAMFILES && join(env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    env["PROGRAMFILES(X86)"] && join(env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  const preferChrome = (env.JMA_PRODUCTION_BROWSER || "").toLowerCase().includes("chrome");
  const browserGroups = preferChrome
    ? [["Chrome", chromeCandidates], ["Microsoft Edge", edgeCandidates]]
    : [["Microsoft Edge", edgeCandidates], ["Chrome", chromeCandidates]];

  for (const [label, candidates] of browserGroups) {
    const executable = candidates.find((candidate) => exists(candidate));
    if (executable) return { label, executable };
  }
  return null;
}

function openDashboards() {
  const urls = [
    `https://supabase.com/dashboard/project/${PRODUCTION_SUPABASE_PROJECT_REF}/settings/api`,
    `https://supabase.com/dashboard/project/${PRODUCTION_SUPABASE_PROJECT_REF}/settings/database`,
    `https://dash.cloudflare.com/${PRODUCTION_CLOUDFLARE_ACCOUNT_ID}/workers/services/view/${PRODUCTION_WORKER_NAME}/production/settings`,
    "https://dashboard.stripe.com/apikeys",
    "https://dashboard.stripe.com/webhooks",
    "https://console.upstash.com/redis",
  ];
  const browser = preferredDashboardBrowser();
  if (browser) {
    spawn(browser.executable, urls, { detached: true, stdio: "ignore" }).unref();
  } else {
    const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", ...urls] : urls;
    spawn(command, args, { detached: true, stdio: "ignore" }).unref();
  }
  console.log(`Opened production dashboards${browser ? ` in ${browser.label}` : ""} for Supabase, Cloudflare, Stripe and Upstash.`);
}

function printHelp() {
  console.log(`Usage: node scripts/production-autopilot.mjs [options]

Options:
  --check              Print redacted production readiness.
  --assert             Fail unless every production prerequisite is ready.
  --check-supabase     Print redacted Supabase CLI readiness.
  --open-dashboards    Open the exact provider pages needed to retrieve missing keys. Uses Edge first on Windows.
  --link-supabase      Link the local repo to the production Supabase project.
  --push-supabase      Push Supabase SQL migrations to the production project.
  --sync-cloudflare    Upload current env values to Cloudflare secrets for an existing Worker.
  --migrate            Run PostgreSQL migrations against Supabase using DATABASE_URL or DIRECT_URL.
  --deploy             Build and deploy the Cloudflare Worker with a temporary secrets file.
`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.size === 0) args.add("--check");
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }

  const environment = loadProductionEnvironment();
  const report = productionReadiness(environment);
  if (args.has("--check")) printProductionReadiness(report);
  if (args.has("--check-supabase")) printSupabaseCliReadiness(supabaseCliReadiness(environment));
  if (args.has("--open-dashboards")) openDashboards();
  if (args.has("--assert") || args.has("--sync-cloudflare") || args.has("--migrate") || args.has("--deploy")) ensureReady(report);
  if (args.has("--link-supabase")) linkSupabaseProject(environment.values);
  if (args.has("--push-supabase")) pushSupabaseMigrations(environment.values);
  if (args.has("--sync-cloudflare")) syncCloudflareSecrets(environment.values);
  if (args.has("--migrate")) migrateDatabase(environment.values);
  if (args.has("--deploy")) deployCloudflare(environment.values);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
