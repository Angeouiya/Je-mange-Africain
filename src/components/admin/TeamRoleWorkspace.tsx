"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { TeamPermissionList } from "@/components/admin/TeamPermissionList";
import { permissionTotals, roleDescription, roleLabel } from "@/components/admin/team-labels";
import type { TeamMember, TeamRole } from "@/components/admin/team-types";
import { Badge } from "@/components/ui/badge";

export function TeamRoleWorkspace({ roles, members, locale }: { roles: TeamRole[]; members: TeamMember[]; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [selectedId, setSelectedId] = useState(roles[0]?.id || "");
  const selected = roles.find((role) => role.id === selectedId) || roles[0];
  if (!selected) return null;
  const totals = permissionTotals(selected.permissions);
  const assigned = members.filter((member) => member.role === selected.id);
  const active = assigned.filter((member) => member.status === "active").length;

  return <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
    <section className="h-fit overflow-hidden rounded-lg border border-charcoal/8 bg-white"><div className="border-b border-charcoal/8 bg-[#F8F7F4] px-4 py-4"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Rôles disponibles" : "Available roles"}</p><h3 className="mt-1 text-sm font-black text-charcoal">{isFr ? "Choisir un périmètre" : "Choose a scope"}</h3></div><label className="block p-4 xl:hidden"><span className="sr-only">{isFr ? "Rôle à inspecter" : "Role to inspect"}</span><select aria-label={isFr ? "Rôle à inspecter" : "Role to inspect"} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs font-bold text-charcoal">{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.id, locale)}</option>)}</select></label><div className="hidden divide-y divide-border xl:block">{roles.map((role) => { const count = members.filter((member) => member.role === role.id).length; return <button key={role.id} type="button" onClick={() => setSelectedId(role.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition ${selected.id === role.id ? "bg-burgundy/[0.07] text-burgundy" : "text-charcoal hover:bg-[#F8F7F4]"}`} aria-pressed={selected.id === role.id}><span className="truncate text-[11px] font-black">{roleLabel(role.id, locale)}</span><span className="text-[9px] font-black tabular-nums">{count}</span></button>; })}</div></section>

    <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-labelledby="role-profile-title"><div className="border-b border-charcoal/8 bg-[#F8F7F4] px-4 py-4 sm:px-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${selected.assignable === false || selected.id === "super_admin" ? "bg-charcoal text-white" : "bg-burgundy text-white"}`}>{selected.assignable === false || selected.id === "super_admin" ? <LockKeyhole className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Profil d'autorisation" : "Permission profile"}</p><h3 id="role-profile-title" className="mt-1 text-base font-black text-charcoal">{roleLabel(selected.id, locale)}</h3><p className="mt-1 max-w-2xl text-[11px] leading-4 text-muted-foreground">{roleDescription(selected.id, locale)}</p></div></div><Badge variant="outline" className={`shrink-0 text-[8px] ${selected.assignable === false || selected.id === "super_admin" ? "border-charcoal/15 text-charcoal" : "border-burgundy/20 text-burgundy"}`}>{selected.assignable === false || selected.id === "super_admin" ? (isFr ? "Protégé" : "Protected") : (isFr ? "Attribuable" : "Assignable")}</Badge></div></div>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border"><RoleMetric icon={<ShieldCheck className="h-4 w-4" />} label={isFr ? "Modules" : "Modules"} value={String(totals.modules)} /><RoleMetric icon={<KeyRound className="h-4 w-4" />} label={isFr ? "Actions" : "Actions"} value={String(totals.actions)} /><RoleMetric icon={<UsersRound className="h-4 w-4" />} label={isFr ? "Membres actifs" : "Active members"} value={`${active}/${assigned.length}`} /></div>
      <div className="px-4 py-4 sm:px-5"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Matrice serveur" : "Server matrix"}</p><h4 className="mt-1 text-sm font-black text-charcoal">{isFr ? "Accès effectifs par espace" : "Effective access by workspace"}</h4></div><p className="text-right text-[9px] leading-4 text-muted-foreground">{isFr ? "Tout ce qui n'apparaît pas est refusé." : "Anything not shown is denied."}</p></div><div className="mt-3"><TeamPermissionList permissions={selected.permissions} locale={locale} includeEmpty /></div></div>
    </section>
  </div>;
}

function RoleMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="min-w-0 p-3 sm:p-4"><span className="text-terre">{icon}</span><p className="mt-2 text-lg font-black tabular-nums text-charcoal">{value}</p><p className="mt-1 truncate text-[9px] font-bold text-muted-foreground">{label}</p></div>; }
