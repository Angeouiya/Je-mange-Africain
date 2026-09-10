import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "ahigidhuhqcmxzjxetnw";
const SUBJECT = "Sécurité : votre mot de passe Je mange Africain a été modifié";

for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) loadEnvironmentFile(file);

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!accessToken) {
  console.error("Configuration Supabase non appliquée : SUPABASE_ACCESS_TOKEN est absent.");
  process.exit(1);
}

const templatePath = resolve("supabase/templates/password_changed_notification.html");
const content = readFileSync(templatePath, "utf8");
const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_notifications_password_changed_enabled: true,
    mailer_subjects_password_changed_notification: SUBJECT,
    mailer_templates_password_changed_notification_content: content,
    security_update_password_require_reauthentication: true,
  }),
});

if (!response.ok) {
  console.error(`Configuration Supabase refusée (HTTP ${response.status}).`);
  process.exit(1);
}

console.log(`Notification de changement de mot de passe activée et designée sur Supabase ${PROJECT_REF}.`);

function loadEnvironmentFile(file) {
  const path = resolve(file);
  if (!existsSync(path)) return;
  const source = readFileSync(path, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}
