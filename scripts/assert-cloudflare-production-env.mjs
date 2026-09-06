import { readFileSync, existsSync } from "node:fs";

const required = [
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
];

function parseDotenv() {
  if (!existsSync(".env")) return {};
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

const dotenv = parseDotenv();
const valueFor = (key) => process.env[key] || dotenv[key] || "";
const missing = required.filter((key) => !valueFor(key));
const databaseUrl = valueFor("DATABASE_URL");
const databaseIsPostgres = /^postgres(?:ql)?:\/\//i.test(databaseUrl);

if (missing.length || !databaseIsPostgres) {
  console.error("Cloudflare production deploy is not ready.");
  if (missing.length) console.error(`Missing variables: ${missing.join(", ")}`);
  if (databaseUrl && !databaseIsPostgres) console.error("DATABASE_URL must be a PostgreSQL connection string, not a local SQLite file.");
  if (!databaseUrl) console.error("DATABASE_URL is missing.");
  process.exit(1);
}

console.log("Cloudflare production environment check passed.");
