import "dotenv/config";
import { Pool } from "pg";

const PROJECT_REF = "ahigidhuhqcmxzjxetnw";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ADMIN_EMAIL = "ezechielouiya@gmail.com";
const ADMIN_RESET_URL = "https://admin.je-mange-africain.com/admin/reset";
const directUrl = process.env.DIRECT_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const reinvite = process.argv.includes("--reinvite");

if (!directUrl || !directUrl.includes(`db.${PROJECT_REF}.supabase.co`)) {
  throw new Error(`DIRECT_URL must target the JMA Supabase project (${PROJECT_REF}).`);
}
if (!secretKey || (!secretKey.startsWith("sb_secret_") && secretKey.split(".").length !== 3)) {
  throw new Error("A valid SUPABASE_SECRET_KEY or legacy service role key is required.");
}

function adminHeaders() {
  const headers = { apikey: secretKey, "Content-Type": "application/json" };
  if (!secretKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${secretKey}`;
  return headers;
}

async function supabase(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.msg || payload?.message || `Supabase request failed (${response.status}).`);
  return payload;
}

async function main() {
  const list = await supabase("/auth/v1/admin/users?page=1&per_page=200");
  const users = Array.isArray(list?.users) ? list.users : [];
  const unexpectedAdmins = users.filter((user) => user.email?.toLowerCase() !== ADMIN_EMAIL && user.app_metadata?.role);
  if (unexpectedAdmins.length) throw new Error("Unexpected privileged identities exist; bootstrap refused.");

  let user = users.find((candidate) => candidate.email?.toLowerCase() === ADMIN_EMAIL);
  let invited = false;
  if (reinvite && user && !user.confirmed_at) {
    await supabase(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    user = null;
  }
  if (!user) {
    const redirect = encodeURIComponent(ADMIN_RESET_URL);
    user = await supabase(`/auth/v1/invite?redirect_to=${redirect}`, {
      method: "POST",
      body: JSON.stringify({ email: ADMIN_EMAIL, data: { first_name: "Ange Ezéchiel", last_name: "OUIYA" } }),
    });
    invited = true;
  }

  user = await supabase(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      app_metadata: { ...(user.app_metadata || {}), role: "super_admin" },
      user_metadata: { ...(user.user_metadata || {}), first_name: "Ange Ezéchiel", last_name: "OUIYA" },
    }),
  });

  const pool = new Pool({ connectionString: directUrl, max: 1 });
  try {
    await pool.query(`
      INSERT INTO "AdminMembership" (
        "id", "authUserId", "email", "firstName", "lastName", "role", "permissions", "status", "invitedBy", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 'Ange Ezéchiel', 'OUIYA', 'super_admin', '{}', $4, 'production-bootstrap', NOW(), NOW()
      )
      ON CONFLICT ("email") DO UPDATE SET
        "authUserId" = EXCLUDED."authUserId",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "role" = 'super_admin',
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
    `, [`bootstrap-${user.id}`, user.id, ADMIN_EMAIL, user.confirmed_at ? "active" : "invited"]);
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify({
    configured: true,
    email: ADMIN_EMAIL,
    role: user.app_metadata?.role,
    status: user.confirmed_at ? "active" : "invited",
    invitationSent: invited,
    resetUrl: ADMIN_RESET_URL,
  }));
}

await main();
