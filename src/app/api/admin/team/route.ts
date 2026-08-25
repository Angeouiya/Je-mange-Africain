import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ADMIN_ROLES, authorizeAdminRequest, getSupabaseAdminConfig } from "@/lib/admin-auth";
import { permissionsForRole } from "@/lib/admin-permissions";
import { supabaseAuthAdminFetch, teamConfigurationError } from "@/lib/supabase-admin-team";

export const dynamic = "force-dynamic";

const MemberInput = z.object({
  email: z.string().trim().email().max(240),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  role: z.string().refine((role) => ADMIN_ROLES.has(role) && role !== "super_admin"),
});

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "team", action: "read" });
  if (!authorization.ok) return authorization.response;
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) return teamConfigurationError();
  const response = await supabaseAuthAdminFetch("/users?page=1&per_page=200", serviceRoleKey, url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: payload?.msg || payload?.message || "Lecture de l'équipe impossible." }, { status: response.status });
  const memberships = await db.adminMembership.findMany();
  const membershipByUser = new Map(memberships.filter((member) => member.authUserId).map((member) => [member.authUserId!, member]));
  const members = (payload.users || []).filter((user: any) => ADMIN_ROLES.has(user.app_metadata?.role) || membershipByUser.has(user.id)).map((user: any) => {
    const membership = membershipByUser.get(user.id);
    const role = user.app_metadata?.role || membership?.role || "";
    return { id: user.id, email: user.email, firstName: user.user_metadata?.first_name || membership?.firstName || "", lastName: user.user_metadata?.last_name || membership?.lastName || "", role, status: user.banned_until && new Date(user.banned_until) > new Date() ? "suspended" : user.confirmed_at ? "active" : "invited", lastSignInAt: user.last_sign_in_at, createdAt: user.created_at, permissions: permissionsForRole(role), current: user.id === authorization.user.id };
  });
  return NextResponse.json({ members, roles: [...ADMIN_ROLES].filter((role) => role !== "super_admin").map((role) => ({ id: role, permissions: permissionsForRole(role) })) });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "team", action: "create" });
  if (!authorization.ok) return authorization.response;
  const parsed = MemberInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Les informations du membre sont invalides." }, { status: 400 });
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) return teamConfigurationError();
  const input = parsed.data;
  const invited = await fetch(`${url}/auth/v1/invite`, { method: "POST", headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email.toLowerCase(), data: { first_name: input.firstName, last_name: input.lastName } }), signal: AbortSignal.timeout(15_000) });
  const invitedUser = await invited.json().catch(() => null);
  if (!invited.ok) return NextResponse.json({ error: invitedUser?.msg || invitedUser?.message || "Invitation impossible." }, { status: invited.status });
  const secured = await supabaseAuthAdminFetch(`/users/${invitedUser.id}`, serviceRoleKey, url, { method: "PUT", body: JSON.stringify({ app_metadata: { role: input.role }, user_metadata: { first_name: input.firstName, last_name: input.lastName } }) });
  if (!secured.ok) return NextResponse.json({ error: "Le compte a été invité mais son rôle n'a pas pu être sécurisé." }, { status: 502 });
  await db.adminMembership.upsert({ where: { email: input.email.toLowerCase() }, update: { authUserId: invitedUser.id, firstName: input.firstName, lastName: input.lastName, role: input.role, permissions: JSON.stringify(permissionsForRole(input.role)), status: "invited", invitedBy: authorization.user.email }, create: { authUserId: invitedUser.id, email: input.email.toLowerCase(), firstName: input.firstName, lastName: input.lastName, role: input.role, permissions: JSON.stringify(permissionsForRole(input.role)), status: "invited", invitedBy: authorization.user.email } });
  await db.auditLog.create({ data: { action: "team_invite", entityType: "AdminMembership", entityId: invitedUser.id, after: JSON.stringify(input), reason: `Invitation par ${authorization.user.email}` } });
  return NextResponse.json({ member: { id: invitedUser.id, ...input, status: "invited", permissions: permissionsForRole(input.role) } }, { status: 201 });
}
