#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

export const PRODUCTION_SUPABASE_PROJECT_REF = "ahigidhuhqcmxzjxetnw";
export const PRODUCTION_SUPABASE_PROJECT_NAME = "JMA";
export const PRODUCTION_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
export const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AUIg2aOqbAJKzAvkEFdG8A_qYZiGd7D";
export const PRODUCTION_CLOUDFLARE_ACCOUNT_ID = "82164eca9557f63e18984230deac12bc";
export const PRODUCTION_HYPERDRIVE_ID = "ecda2d6ebe7e44babfe8e29ab4fabecc";
export const PRODUCTION_WORKER_NAME = "je-mange-africain";
export const PRODUCTION_SITE_URL = "https://je-mange-africain.com";
export const CLOUDFLARE_PUBLICATION_MODE = "Cloudflare Workers custom-domain deployment";
export const SUPABASE_OPERATIONAL_KEYS = ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "DIRECT_URL"];

const DOTENV_FILES = [".env", ".env.local", ".env.production.local"];
const REQUIRED_ENV = [
  ["CLOUDFLARE_HYPERDRIVE_ID", `Cloudflare Hyperdrive connection for ${PRODUCTION_SUPABASE_PROJECT_NAME}`],
  ["NEXT_PUBLIC_SUPABASE_URL", `Supabase URL must target ${PRODUCTION_SUPABASE_PROJECT_NAME} (${PRODUCTION_SUPABASE_PROJECT_REF})`],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase publishable key"],
  ["SUPABASE_SECRET_KEY", "Supabase server secret key"],
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
const OPTIONAL_ENV = [
  ["DIRECT_URL", `Supabase direct migration connection for ${PRODUCTION_SUPABASE_PROJECT_NAME}`],
];
const CLOUDFLARE_SECRET_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
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
export const REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
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
  /** @type {Record<string, string>} */
  const values = {};
  /** @type {Record<string, string>} */
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
    CLOUDFLARE_HYPERDRIVE_ID: wrangler.hyperdrive?.find((binding) => binding.binding === "HYPERDRIVE")?.id,
    ...wranglerVars,
  };
  for (const [key, value] of Object.entries(wranglerFallbacks)) {
    if (values[key] || !value) continue;
    values[key] = String(value);
    sources[key] = "wrangler.jsonc";
  }
  if (!values.SUPABASE_SECRET_KEY && values.SUPABASE_SERVICE_ROLE_KEY) {
    values.SUPABASE_SECRET_KEY = values.SUPABASE_SERVICE_ROLE_KEY;
    sources.SUPABASE_SECRET_KEY = `${sources.SUPABASE_SERVICE_ROLE_KEY || "environment"} (legacy service role)`;
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
    || lower.includes("your-password")
    || lower.includes("replace_me")
    || lower.includes("change_me")
    || lower.includes("user:password@host")
    || lower === `${key.toLowerCase()}_value`;
}

function isPostgresUrl(value) {
  return /^postgres(?:ql)?:\/\//i.test(value || "");
}

export function supabaseProjectRefFromPostgresUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const username = decodeURIComponent(parsed.username || "").toLowerCase();
    const directHost = hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
    if (directHost) return directHost[1];
    const poolerUser = username.match(/(?:^|\.)([a-z0-9]{20})(?:$|[._-])/);
    if (hostname.includes("supabase.") && poolerUser) return poolerUser[1];
    if (hostname.includes(PRODUCTION_SUPABASE_PROJECT_REF) || username.includes(PRODUCTION_SUPABASE_PROJECT_REF)) {
      return PRODUCTION_SUPABASE_PROJECT_REF;
    }
  } catch {
    return null;
  }
  return null;
}

function isSupabasePostgresConnection(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const username = decodeURIComponent(parsed.username || "").toLowerCase();
    return hostname.includes("supabase.") || username.includes(PRODUCTION_SUPABASE_PROJECT_REF);
  } catch {
    return false;
  }
}

export function postgresPasswordFromUrl(value) {
  if (!isPostgresUrl(value)) return "";
  try {
    const parsed = new URL(value);
    const password = decodeURIComponent(parsed.password || "");
    if (!hasUsableValue("DATABASE_URL", password) || isPlaceholder("SUPABASE_DB_PASSWORD", password)) return "";
    return password;
  } catch {
    return "";
  }
}

function postgresCredentialProblem(value) {
  try {
    const parsed = new URL(value);
    const username = decodeURIComponent(parsed.username || "");
    const password = decodeURIComponent(parsed.password || "");
    if (!username) return "must include a database username";
    if (!password) return "must include a database password";
    if (isPlaceholder("DATABASE_URL", username) || isPlaceholder("DATABASE_URL", password) || isPlaceholder("SUPABASE_DB_PASSWORD", password)) {
      return "must replace placeholder database credentials";
    }
  } catch {
    return "must be a valid PostgreSQL URL";
  }
  return "";
}

function postgresConnectionProblem(value) {
  if (!isPostgresUrl(value)) return "must be PostgreSQL, not SQLite/local file";
  const projectRef = supabaseProjectRefFromPostgresUrl(value);
  if (projectRef === PRODUCTION_SUPABASE_PROJECT_REF) return postgresCredentialProblem(value);
  if (projectRef) return `points to Supabase project ${projectRef}, expected ${PRODUCTION_SUPABASE_PROJECT_REF}`;
  if (isSupabasePostgresConnection(value)) return `must include Supabase project ${PRODUCTION_SUPABASE_PROJECT_REF}`;
  return `must target Supabase ${PRODUCTION_SUPABASE_PROJECT_NAME} (${PRODUCTION_SUPABASE_PROJECT_REF})`;
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
  if (key === "DATABASE_URL" || key === "DIRECT_URL") {
    const problem = postgresConnectionProblem(value);
    if (problem) return { key, label, ok: false, source, problem };
  }
  if (key === "NEXT_PUBLIC_SUPABASE_URL" && normalizedUrl(value) !== PRODUCTION_SUPABASE_URL) {
    const currentRef = (value.match(/https:\/\/([^.]+)/) || [])[1] || "unknown";
    return { key, label, ok: false, source, problem: `points to ${currentRef}, expected ${PRODUCTION_SUPABASE_PROJECT_REF}` };
  }
  if (key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" && value !== PRODUCTION_SUPABASE_PUBLISHABLE_KEY) {
    return { key, label, ok: false, source, problem: `must match the publishable key for ${PRODUCTION_SUPABASE_PROJECT_NAME}` };
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
  if (key === "CLOUDFLARE_HYPERDRIVE_ID" && value !== PRODUCTION_HYPERDRIVE_ID) {
    return { key, label, ok: false, source, problem: `must target JMA Hyperdrive ${PRODUCTION_HYPERDRIVE_ID}` };
  }
  if (key === "CLOUDFLARE_DEPLOYMENT_TARGET" && value !== "workers") {
    return { key, label, ok: false, source, problem: "must be workers" };
  }
  return { key, label, ok: true, source, problem: "" };
}

export function productionReadiness(environment = loadProductionEnvironment()) {
  const optionalRequirements = OPTIONAL_ENV
    .filter(([key]) => Boolean(environment.values[key]))
    .map(([key, label]) => evaluateRequirement(key, label, environment.values, environment.sources));
  const requirements = [
    ...REQUIRED_ENV.map(([key, label]) => evaluateRequirement(key, label, environment.values, environment.sources)),
    ...optionalRequirements,
  ];
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
      hyperdriveId: PRODUCTION_HYPERDRIVE_ID,
      workerName: PRODUCTION_WORKER_NAME,
      siteUrl: PRODUCTION_SITE_URL,
      domainStatus: environment.values.CLOUDFLARE_DOMAIN_STATUS || "deferred",
      publicationMode: CLOUDFLARE_PUBLICATION_MODE,
    },
  };
}

export function readSupabaseLinkedProjectRef(cwd = process.cwd()) {
  const linkPath = resolve(cwd, "supabase", ".temp", "project-ref");
  if (!existsSync(linkPath)) return "";
  return readFileSync(linkPath, "utf8").trim();
}

export function supabaseCliReadiness(environment = loadProductionEnvironment(), linkedProjectRef = readSupabaseLinkedProjectRef(environment.cwd)) {
  const values = environment.values;
  const directCandidate = [
    ["DIRECT_URL", values.DIRECT_URL],
    ["DATABASE_URL", values.DATABASE_URL],
  ].find(([, value]) => value && isPostgresUrl(value));
  const directProblem = directCandidate
    ? hasUsableValue(directCandidate[0], directCandidate[1])
      ? postgresConnectionProblem(directCandidate[1])
      : "placeholder value"
    : "";
  const directProjectRef = directCandidate ? supabaseProjectRefFromPostgresUrl(directCandidate[1]) : null;
  const hasDirectDatabaseUrl = Boolean(directCandidate && !directProblem);
  const explicitDbPassword = hasUsableValue("SUPABASE_DB_PASSWORD", values.SUPABASE_DB_PASSWORD);
  const derivedDbPassword = hasDirectDatabaseUrl && directCandidate ? postgresPasswordFromUrl(directCandidate[1]) : "";
  const hasDbPassword = explicitDbPassword || Boolean(derivedDbPassword);
  return {
    targetRef: PRODUCTION_SUPABASE_PROJECT_REF,
    hasAccessToken: hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN),
    hasDbPassword,
    dbPasswordSource: explicitDbPassword ? "SUPABASE_DB_PASSWORD" : derivedDbPassword ? directCandidate?.[0] || null : null,
    hasDirectDatabaseUrl,
    directDatabaseUrlKey: directCandidate?.[0] || null,
    directDatabaseProjectRef: directProjectRef,
    directDatabaseProblem: directProblem,
    linkedProjectRef,
    linkedToTarget: linkedProjectRef === PRODUCTION_SUPABASE_PROJECT_REF,
    readyForLink: hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN) && hasDbPassword,
    readyForDbPush: hasDirectDatabaseUrl || (hasUsableValue("SUPABASE_ACCESS_TOKEN", values.SUPABASE_ACCESS_TOKEN) && hasDbPassword),
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
  const passwordSource = report.dbPasswordSource && report.dbPasswordSource !== "SUPABASE_DB_PASSWORD" ? ` (derived from ${report.dbPasswordSource})` : "";
  writer(`${report.hasDbPassword ? "OK" : "BLOCKED"} SUPABASE_DB_PASSWORD${passwordSource}`);
  writer(`${report.hasDirectDatabaseUrl ? "OK" : "BLOCKED"} DIRECT_URL or PostgreSQL DATABASE_URL${report.directDatabaseProblem ? ` - ${report.directDatabaseProblem}` : ""}`);
  const linkDetail = report.linkedProjectRef ? (report.linkedToTarget ? report.linkedProjectRef : `points to ${report.linkedProjectRef}`) : "missing";
  writer(`${report.linkedToTarget ? "OK" : "BLOCKED"} Local Supabase project link (${linkDetail})`);
  writer(`${report.readyForLink ? "OK" : "BLOCKED"} Supabase relink capability`);
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

function windowsPowerShellArg(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function commandInvocation(command, args) {
  if (process.platform !== "win32") return { command: bin(command), args };
  const line = `& ${[bin(command), ...args].map(windowsPowerShellArg).join(" ")}`;
  return { command: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", line] };
}

function run(command, args, env) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function runCapture(command, args, env = {}, cwd = process.cwd()) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error?.message || "",
  };
}

function stripAnsi(value) {
  return String(value || "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export function parseJsonPayload(output) {
  const text = stripAnsi(output).trim();
  const starts = [text.indexOf("["), text.indexOf("{")].filter((index) => index >= 0).sort((left, right) => left - right);
  if (!starts.length) return null;
  const start = starts[0];
  const close = text[start] === "[" ? "]" : "}";
  const end = text.lastIndexOf(close);
  if (end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function cloudflareSecretNames(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => typeof item === "string" ? item : item?.name)
    .filter((item) => typeof item === "string" && item.trim())
    .sort();
}

function supabaseProjectsFromPayload(payload) {
  const projects = Array.isArray(payload?.projects) ? payload.projects : Array.isArray(payload) ? payload : [];
  return projects
    .map((project) => ({
      ref: String(project?.ref || project?.id || ""),
      name: String(project?.name || ""),
      region: String(project?.region || ""),
      status: String(project?.status || ""),
    }))
    .filter((project) => project.ref);
}

function localSupabaseMigrationVersions(cwd = process.cwd()) {
  const migrationsDir = resolve(cwd, "supabase", "migrations");
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .map((name) => {
      const match = name.match(/^(\d{14})_/);
      return match?.[1] || "";
    })
    .filter(Boolean)
    .sort();
}

export function prismaPostgresMigrationNames(cwd = process.cwd()) {
  const migrationsDir = resolve(cwd, "prisma", "postgresql", "migrations");
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function productionDirectDatabaseUrl(values) {
  const candidate = [
    ["DIRECT_URL", values.DIRECT_URL],
    ["DATABASE_URL", values.DATABASE_URL],
  ].find(([, value]) => hasUsableValue("DATABASE_URL", value) && isPostgresUrl(value) && !postgresConnectionProblem(value));
  return candidate ? { key: candidate[0], value: candidate[1] } : null;
}

export function prismaBaselineReadiness(values, cwd = process.cwd()) {
  const direct = productionDirectDatabaseUrl(values);
  const migrations = prismaPostgresMigrationNames(cwd);
  return {
    ready: Boolean(direct && migrations.length),
    directDatabaseUrlKey: direct?.key || null,
    directDatabaseProjectRef: direct ? supabaseProjectRefFromPostgresUrl(direct.value) : null,
    migrations,
    problem: !direct
      ? "DIRECT_URL or PostgreSQL DATABASE_URL must target the JMA Supabase project"
      : migrations.length
        ? ""
      : "No Prisma PostgreSQL migrations were found",
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function unappliedPrismaMigrationNames(statusOutput, migrations) {
  const text = stripAnsi(statusOutput || "");
  if (/Database schema is up to date/i.test(text) || /No pending migrations to apply/i.test(text)) return [];
  const section = text.split("Following migrations have not yet been applied:")[1]?.split(/\r?\n\r?\n/)[0] || "";
  return migrations.filter((migration) => new RegExp(`(^|\\s)${escapeRegExp(migration)}(\\s|$)`).test(section));
}

function directSupabaseMigrationAudit(result, cwd = process.cwd()) {
  const payload = parseJsonPayload(`${result?.stdout || ""}\n${result?.stderr || ""}`);
  const migrations = Array.isArray(payload?.migrations) ? payload.migrations : [];
  const remoteVersions = migrations
    .map((migration) => String(migration?.remote || ""))
    .filter(Boolean)
    .sort();
  const localVersions = localSupabaseMigrationVersions(cwd);
  const missingRemoteVersions = localVersions.filter((version) => !remoteVersions.includes(version));

  return {
    readable: result?.status === 0 && Array.isArray(payload?.migrations),
    localVersions,
    remoteVersions,
    missingRemoteVersions,
    aligned: result?.status === 0 && Array.isArray(payload?.migrations) && missingRemoteVersions.length === 0,
  };
}

export function remoteProductionReadiness({
  environment = loadProductionEnvironment(),
  linkedProjectRef = readSupabaseLinkedProjectRef(environment.cwd),
  runner = (command, args) => runCapture(command, args, environment.values, environment.cwd),
} = {}) {
  const deploymentResult = runner("npx", ["wrangler", "deployments", "list", "--config", "wrangler.jsonc", "--name", PRODUCTION_WORKER_NAME]);
  const deploymentOutput = `${deploymentResult.stdout || ""}\n${deploymentResult.stderr || ""}`;
  const workerDeploymentsReadable = deploymentResult.status === 0 && !/not found|does not exist/i.test(deploymentOutput);

  const secretResult = runner("npx", ["wrangler", "secret", "list", "--config", "wrangler.jsonc", "--name", PRODUCTION_WORKER_NAME]);
  const secretPayload = parseJsonPayload(`${secretResult.stdout || ""}\n${secretResult.stderr || ""}`);
  const remoteSecrets = cloudflareSecretNames(secretPayload);
  const missingRemoteSecretKeys = REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS.filter((key) => !remoteSecrets.includes(key));
  const cloudflareSecretsReadable = secretResult.status === 0 && Array.isArray(secretPayload);

  const supabaseResult = runner("npx", ["supabase", "projects", "list"]);
  const supabasePayload = parseJsonPayload(`${supabaseResult.stdout || ""}\n${supabaseResult.stderr || ""}`);
  const visibleProjects = supabaseProjectsFromPayload(supabasePayload);
  const supabaseProjectsReadable = supabaseResult.status === 0 && visibleProjects.length > 0;
  const targetProject = visibleProjects.find((project) => project.ref === PRODUCTION_SUPABASE_PROJECT_REF) || null;
  const linkedToTarget = linkedProjectRef === PRODUCTION_SUPABASE_PROJECT_REF;
  const supabaseCli = supabaseCliReadiness(environment, linkedProjectRef);
  const directDatabaseUrl = supabaseCli.hasDirectDatabaseUrl && supabaseCli.directDatabaseUrlKey
    ? environment.values[supabaseCli.directDatabaseUrlKey]
    : "";
  const needsDirectMigrationAudit = Boolean(directDatabaseUrl && (!targetProject || !linkedToTarget));
  const directMigrationResult = needsDirectMigrationAudit
    ? runner("npx", ["supabase", "migration", "list", "--db-url", directDatabaseUrl])
    : null;
  const directMigrationAudit = directMigrationResult
    ? directSupabaseMigrationAudit(directMigrationResult, environment.cwd)
    : {
        readable: false,
        localVersions: localSupabaseMigrationVersions(environment.cwd),
        remoteVersions: [],
        missingRemoteVersions: [],
        aligned: false,
      };
  const directDatabaseTargetsJma = supabaseCli.directDatabaseProjectRef === PRODUCTION_SUPABASE_PROJECT_REF;
  const directDatabaseVerified = directDatabaseTargetsJma && directMigrationAudit.aligned;
  const hasSupabaseRemoteAccess = Boolean(targetProject && linkedToTarget) || directDatabaseVerified;

  const blockers = [];
  if (!workerDeploymentsReadable) blockers.push({ key: "CLOUDFLARE_WORKER", problem: "deployments are not readable for the configured Worker" });
  if (!cloudflareSecretsReadable) blockers.push({ key: "CLOUDFLARE_SECRETS", problem: "remote Worker secrets cannot be listed" });
  else if (missingRemoteSecretKeys.length) blockers.push({ key: "CLOUDFLARE_SECRETS", problem: `${missingRemoteSecretKeys.length} required secret(s) missing` });
  if (!hasSupabaseRemoteAccess) {
    if (directDatabaseTargetsJma && needsDirectMigrationAudit && !directMigrationAudit.readable) {
      blockers.push({ key: "SUPABASE_MIGRATIONS", problem: "remote migrations cannot be verified through DIRECT_URL" });
    } else if (directDatabaseTargetsJma && directMigrationAudit.missingRemoteVersions.length) {
      blockers.push({ key: "SUPABASE_MIGRATIONS", problem: `${directMigrationAudit.missingRemoteVersions.length} local migration(s) missing remotely` });
    } else {
      if (!supabaseProjectsReadable) blockers.push({ key: "SUPABASE_PROJECTS", problem: "Supabase CLI projects are not readable" });
      else if (!targetProject) blockers.push({ key: "SUPABASE_PROJECT", problem: `project ${PRODUCTION_SUPABASE_PROJECT_REF} is not visible to the current CLI session` });
      if (!linkedToTarget) blockers.push({ key: "SUPABASE_LINK", problem: linkedProjectRef ? `linked to ${linkedProjectRef}` : "missing local project link" });
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    cloudflare: {
      workerDeploymentsReadable,
      deploymentStatus: deploymentResult.status,
      cloudflareSecretsReadable,
      secretStatus: secretResult.status,
      remoteSecrets,
      requiredRemoteSecretKeys: REQUIRED_CLOUDFLARE_REMOTE_SECRET_KEYS,
      missingRemoteSecretKeys,
    },
    supabase: {
      projectsReadable: supabaseProjectsReadable,
      projectsStatus: supabaseResult.status,
      targetProject,
      visibleProjects,
      linkedProjectRef,
      linkedToTarget,
      directDatabaseProjectRef: supabaseCli.directDatabaseProjectRef,
      directMigrationReadable: directMigrationAudit.readable,
      directMigrationAligned: directMigrationAudit.aligned,
      directMigrationMissingRemoteVersions: directMigrationAudit.missingRemoteVersions,
      hasRemoteAccess: hasSupabaseRemoteAccess,
    },
  };
}

export function printRemoteProductionReadiness(report, writer = console.log) {
  writer(`Remote production audit: Cloudflare Worker ${PRODUCTION_WORKER_NAME} + Supabase ${PRODUCTION_SUPABASE_PROJECT_NAME} (${PRODUCTION_SUPABASE_PROJECT_REF})`);
  writer(`${report.cloudflare.workerDeploymentsReadable ? "OK" : "BLOCKED"} Cloudflare Worker deployments`);
  const present = report.cloudflare.requiredRemoteSecretKeys.filter((key) => report.cloudflare.remoteSecrets.includes(key)).length;
  const required = report.cloudflare.requiredRemoteSecretKeys.length;
  const missing = report.cloudflare.missingRemoteSecretKeys.length
    ? ` - missing: ${report.cloudflare.missingRemoteSecretKeys.join(", ")}`
    : "";
  writer(`${report.cloudflare.cloudflareSecretsReadable && !report.cloudflare.missingRemoteSecretKeys.length ? "OK" : "BLOCKED"} Cloudflare Worker secrets (${present}/${required} required present)${missing}`);
  const visible = report.supabase.visibleProjects.length
    ? report.supabase.visibleProjects.map((project) => `${project.name || "Sans nom"} (${project.ref})`).join(", ")
    : "none";
  const directAccess = report.supabase.directDatabaseProjectRef === PRODUCTION_SUPABASE_PROJECT_REF
    ? (report.supabase.directMigrationAligned ? "direct database verified" : "direct database needs migration verification")
    : "no direct JMA database URL";
  writer(`${report.supabase.hasRemoteAccess ? "OK" : "BLOCKED"} Supabase production target access - visible: ${visible}; ${directAccess}`);
  const linkDetail = report.supabase.linkedProjectRef ? report.supabase.linkedProjectRef : "missing";
  writer(`${report.supabase.linkedToTarget || report.supabase.directMigrationAligned ? "OK" : "BLOCKED"} Supabase migration path (${report.supabase.linkedToTarget ? linkDetail : directAccess})`);
  writer(report.ready ? "Remote production wiring is ready." : `${report.blockers.length} remote production blocker(s) remain.`);
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

function supabaseDbPassword(values) {
  if (hasUsableValue("SUPABASE_DB_PASSWORD", values.SUPABASE_DB_PASSWORD)) return values.SUPABASE_DB_PASSWORD;
  const directCandidate = [
    ["DIRECT_URL", values.DIRECT_URL],
    ["DATABASE_URL", values.DATABASE_URL],
  ].find(([, value]) => hasUsableValue("DATABASE_URL", value) && isPostgresUrl(value) && !postgresConnectionProblem(value));
  return directCandidate ? postgresPasswordFromUrl(directCandidate[1]) : "";
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
  ensureSupabaseCanPush(values);
  const migrationEnv = { ...values };
  if (values.DIRECT_URL) migrationEnv.DATABASE_URL = values.DIRECT_URL;
  run("npm", ["run", "db:generate:postgres"], migrationEnv);
  run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/postgresql/schema.prisma"], migrationEnv);
}

function baselinePrismaMigrations(values) {
  const readiness = prismaBaselineReadiness(values);
  if (!readiness.ready) {
    printSupabaseCliReadiness(supabaseCliReadiness({ values, sources: {}, cwd: process.cwd() }), (line) => console.error(line));
    console.error(`Prisma baseline blocked: ${readiness.problem}`);
    process.exit(1);
  }

  const direct = productionDirectDatabaseUrl(values);
  const migrationEnv = { ...values, DATABASE_URL: direct.value };
  const status = runCapture("npx", ["prisma", "migrate", "status", "--schema", "prisma/postgresql/schema.prisma"], migrationEnv);
  const pendingMigrations = unappliedPrismaMigrationNames(`${status.stdout || ""}\n${status.stderr || ""}`, readiness.migrations);
  if (status.status === 0 && pendingMigrations.length === 0) {
    console.log("Prisma baseline already aligned: no migration history update required.");
    return;
  }

  const diff = runCapture("npx", [
    "prisma",
    "migrate",
    "diff",
    "--from-schema-datamodel",
    "prisma/postgresql/schema.prisma",
    "--to-schema-datasource",
    "prisma/postgresql/schema.prisma",
    "--exit-code",
  ], migrationEnv);

  if (diff.status === 2) {
    console.error("Prisma baseline blocked: the live Supabase schema differs from prisma/postgresql/schema.prisma.");
    if (diff.stdout.trim()) console.error(diff.stdout.trim());
    if (diff.stderr.trim()) console.error(diff.stderr.trim());
    process.exit(1);
  }
  if (diff.status !== 0) {
    console.error("Prisma baseline blocked: schema comparison failed.");
    if (diff.stdout.trim()) console.error(diff.stdout.trim());
    if (diff.stderr.trim()) console.error(diff.stderr.trim());
    process.exit(diff.status || 1);
  }

  if (!pendingMigrations.length) {
    console.error("Prisma baseline blocked: migrate status did not expose the pending Prisma migrations.");
    if (status.stdout.trim()) console.error(status.stdout.trim());
    if (status.stderr.trim()) console.error(status.stderr.trim());
    process.exit(status.status || 1);
  }

  for (const migration of pendingMigrations) {
    run("npx", ["prisma", "migrate", "resolve", "--schema", "prisma/postgresql/schema.prisma", "--applied", migration], migrationEnv);
  }
  run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/postgresql/schema.prisma"], migrationEnv);
}

function linkSupabaseProject(values) {
  ensureSupabaseCanLink(values);
  const password = supabaseDbPassword(values);
  run("npx", [
    "supabase",
    "link",
    "--project-ref",
    PRODUCTION_SUPABASE_PROJECT_REF,
    "--password",
    password,
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
    `https://supabase.com/dashboard/project/${PRODUCTION_SUPABASE_PROJECT_REF}/settings/api-keys`,
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
  --check-remote       Verify remote Cloudflare secrets and Supabase project visibility.
  --open-dashboards    Open the exact provider pages needed to retrieve missing keys. Uses Edge first on Windows.
  --link-supabase      Link the local repo to the production Supabase project.
  --push-supabase      Push Supabase SQL migrations to the production project.
  --baseline-prisma    Mark Prisma PostgreSQL migrations as applied only after a zero-diff schema check.
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
  if (args.has("--check-remote")) printRemoteProductionReadiness(remoteProductionReadiness({ environment }));
  if (args.has("--open-dashboards")) openDashboards();
  if (args.has("--assert") || args.has("--sync-cloudflare") || args.has("--deploy")) ensureReady(report);
  if (args.has("--link-supabase")) linkSupabaseProject(environment.values);
  if (args.has("--push-supabase")) pushSupabaseMigrations(environment.values);
  if (args.has("--baseline-prisma")) baselinePrismaMigrations(environment.values);
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
