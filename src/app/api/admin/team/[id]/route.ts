import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ADMIN_ROLES, authorizeAdminRequest, getSupabaseAdminConfig } from "@/lib/admin-auth";
import { permissionsForRole } from "@/lib/admin-permissions";
import { supabaseAuthAdminFetch, teamConfigurationError, teamServiceUnavailableError } from "@/lib/supabase-admin-team";

export const dynamic = "force-dynamic";

const MemberUpdate = z.object({
  role: z.string().refine((role) => ADMIN_ROLES.has(role) && role !== "super_admin"),
  status: z.enum(["invited", "active", "suspended"]),
  reason: z.string().trim().min(5).max(500).optional(),
});

const MemberDelete = z.object({ reason: z.string().trim().min(5).max(500).optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "team", action: "update" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  if (id === authorization.user.id) return NextResponse.json({ error: "Votre propre compte super admin ne peut pas être modifié depuis cette session." }, { status: 409 });
  const parsed = MemberUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le rôle ou l'état demandé est invalide." }, { status: 400 });
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) return teamConfigurationError();
  const input = parsed.data;
  let targetResponse: Response;
  try {
    targetResponse = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url);
  } catch {
    return teamServiceUnavailableError();
  }
  const target = await targetResponse.json().catch(() => null);
  if (!targetResponse.ok) return NextResponse.json({ error: target?.msg || target?.message || "Compte professionnel introuvable." }, { status: targetResponse.status });
  const previousRole = target.app_metadata?.role || "";
  if (previousRole === "super_admin") return NextResponse.json({ error: "Un compte super admin protégé ne peut pas être modifié depuis cet espace." }, { status: 409 });
  const previousStatus = target.banned_until && new Date(target.banned_until) > new Date() ? "suspended" : target.confirmed_at ? "active" : "invited";
  let response: Response;
  try {
    response = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url, { method: "PUT", body: JSON.stringify({ app_metadata: { role: input.role }, ban_duration: input.status === "suspended" ? "876000h" : "none" }) });
  } catch {
    return teamServiceUnavailableError();
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: payload?.msg || payload?.message || "Mise à jour impossible." }, { status: response.status });
  await db.adminMembership.updateMany({ where: { authUserId: id }, data: { role: input.role, permissions: JSON.stringify(permissionsForRole(input.role)), status: input.status } });
  await db.auditLog.create({ data: { action: "team_member_update", entityType: "AdminMembership", entityId: id, before: JSON.stringify({ role: previousRole, status: previousStatus }), after: JSON.stringify({ role: input.role, status: input.status }), reason: `${input.reason || "Mise à jour des habilitations"} · par ${authorization.user.email}` } });
  return NextResponse.json({ member: { id, role: input.role, status: input.status, permissions: permissionsForRole(input.role) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "team", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  if (id === authorization.user.id) return NextResponse.json({ error: "Votre propre compte super admin ne peut pas être supprimé." }, { status: 409 });
  const parsed = MemberDelete.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Le motif de suppression est invalide." }, { status: 400 });
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) return teamConfigurationError();
  let targetResponse: Response;
  try {
    targetResponse = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url);
  } catch {
    return teamServiceUnavailableError();
  }
  const target = await targetResponse.json().catch(() => null);
  if (!targetResponse.ok) return NextResponse.json({ error: target?.msg || target?.message || "Compte professionnel introuvable." }, { status: targetResponse.status });
  const targetRole = target.app_metadata?.role || "";
  if (targetRole === "super_admin") return NextResponse.json({ error: "Un compte super admin protégé ne peut pas être supprimé depuis cet espace." }, { status: 409 });
  let response: Response;
  try {
    response = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url, { method: "DELETE" });
  } catch {
    return teamServiceUnavailableError();
  }
  if (!response.ok) return NextResponse.json({ error: "Suppression du compte impossible." }, { status: response.status });
  await db.adminMembership.deleteMany({ where: { authUserId: id } });
  const targetStatus = target.banned_until && new Date(target.banned_until) > new Date() ? "suspended" : target.confirmed_at ? "active" : "invited";
  await db.auditLog.create({ data: { action: "team_member_delete", entityType: "AdminMembership", entityId: id, before: JSON.stringify({ email: target.email || null, role: targetRole, status: targetStatus }), reason: `${parsed.data.reason || "Suppression du compte professionnel"} · par ${authorization.user.email}` } });
  return NextResponse.json({ ok: true });
}
