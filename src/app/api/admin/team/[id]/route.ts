import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ADMIN_ROLES, authorizeAdminRequest, getSupabaseAdminConfig } from "@/lib/admin-auth";
import { permissionsForRole } from "@/lib/admin-permissions";
import { supabaseAuthAdminFetch, teamConfigurationError } from "@/lib/supabase-admin-team";

export const dynamic = "force-dynamic";

const MemberUpdate = z.object({
  role: z.string().refine((role) => ADMIN_ROLES.has(role) && role !== "super_admin"),
  status: z.enum(["active", "suspended"]),
});

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
  const response = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url, { method: "PUT", body: JSON.stringify({ app_metadata: { role: input.role }, ban_duration: input.status === "suspended" ? "876000h" : "none" }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: payload?.msg || payload?.message || "Mise à jour impossible." }, { status: response.status });
  await db.adminMembership.updateMany({ where: { authUserId: id }, data: { role: input.role, permissions: JSON.stringify(permissionsForRole(input.role)), status: input.status } });
  await db.auditLog.create({ data: { action: "team_member_update", entityType: "AdminMembership", entityId: id, after: JSON.stringify(input), reason: `Mise à jour par ${authorization.user.email}` } });
  return NextResponse.json({ member: { id, role: input.role, status: input.status, permissions: permissionsForRole(input.role) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "team", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  if (id === authorization.user.id) return NextResponse.json({ error: "Votre propre compte super admin ne peut pas être supprimé." }, { status: 409 });
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) return teamConfigurationError();
  const response = await supabaseAuthAdminFetch(`/users/${id}`, serviceRoleKey, url, { method: "DELETE" });
  if (!response.ok) return NextResponse.json({ error: "Suppression du compte impossible." }, { status: response.status });
  await db.adminMembership.deleteMany({ where: { authUserId: id } });
  await db.auditLog.create({ data: { action: "team_member_delete", entityType: "AdminMembership", entityId: id, reason: `Suppression par ${authorization.user.email}` } });
  return NextResponse.json({ ok: true });
}
