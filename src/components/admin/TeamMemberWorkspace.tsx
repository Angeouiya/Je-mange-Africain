"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw, ScrollText, ShieldCheck, SlidersHorizontal, UserCheck, UserRoundX, UsersRound } from "lucide-react";
import { AdminEmptyState, AdminSearchField } from "@/components/admin/AdminPrimitives";
import { MemberAccessDialog } from "@/components/admin/TeamDialogs";
import { moduleLabel, permissionTotals, roleLabel, statusLabel } from "@/components/admin/team-labels";
import type { TeamMember, TeamRole, TeamStatus } from "@/components/admin/team-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, normalize } from "@/lib/format";
import type { AdminModule } from "@/lib/admin-permissions";

type StatusFilter = "all" | TeamStatus;

export function TeamMemberWorkspace({ members, roles, locale, onUpdated }: { members: TeamMember[]; roles: TeamRole[]; locale: "fr" | "en"; onUpdated: () => void }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [role, setRole] = useState("all");
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const filtered = useMemo(() => members.filter((member) => {
    const text = normalize(`${member.firstName} ${member.lastName} ${member.email} ${roleLabel(member.role, locale)}`);
    return text.includes(normalize(query)) && (status === "all" || member.status === status) && (role === "all" || member.role === role);
  }), [locale, members, query, role, status]);
  const filtersActive = Boolean(query) || status !== "all" || role !== "all";

  return <div className="space-y-4">
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_15rem_auto_auto] lg:items-start">
      <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un membre" : "Search team members"} placeholder={isFr ? "Nom, e-mail ou rôle" : "Name, email or role"} resultCount={filtered.length} totalCount={members.length} locale={locale} />
      <FilterSelect label={isFr ? "État du compte" : "Account status"} value={status} onChange={(value) => setStatus(value as StatusFilter)} options={["all", "active", "invited", "suspended"]} optionLabel={(value) => value === "all" ? (isFr ? "Tous les états" : "All statuses") : statusLabel(value as TeamStatus, locale)} />
      <FilterSelect label={isFr ? "Rôle professionnel" : "Professional role"} value={role} onChange={setRole} options={["all", ...roles.map((option) => option.id)]} optionLabel={(value) => value === "all" ? (isFr ? "Tous les rôles" : "All roles") : roleLabel(value, locale)} />
      <Button type="button" variant="ghost" size="sm" disabled={!filtersActive} onClick={() => { setQuery(""); setStatus("all"); setRole("all"); }} className="h-10 px-3 text-[10px] text-muted-foreground"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Réinitialiser" : "Reset"}</Button>
      <Button type="button" variant="outline" size="sm" disabled={!filtered.length} onClick={() => downloadMembersCsv(filtered, locale)} className="h-10 border-charcoal/12"><Download className="mr-1.5 h-4 w-4" />{isFr ? "Exporter" : "Export"}</Button>
    </div>

    {filtered.length ? <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des identités professionnelles" : "Professional identity register"}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-charcoal/8 bg-[#F8F7F4] px-4 py-3 sm:px-5"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Périmètre visible" : "Visible scope"}</p><h3 className="mt-0.5 text-sm font-black text-charcoal">{filtered.length} {isFr ? `identité${filtered.length === 1 ? "" : "s"}` : `identit${filtered.length === 1 ? "y" : "ies"}`}</h3></div><Badge variant="outline" className="border-charcoal/10 bg-white text-[9px]"><ScrollText className="mr-1 h-3 w-3" />{isFr ? "Actions auditées" : "Audited actions"}</Badge></div>
      <div className="hidden grid-cols-[minmax(13rem,1.15fr)_12rem_minmax(14rem,1fr)_10rem] gap-4 border-b border-border px-5 py-3 text-[9px] font-black uppercase text-muted-foreground md:grid"><span>{isFr ? "Identité" : "Identity"}</span><span>{isFr ? "Rôle et état" : "Role and status"}</span><span>{isFr ? "Périmètre" : "Scope"}</span><span className="text-right">{isFr ? "Gestion" : "Management"}</span></div>
      <div className="divide-y divide-border">{filtered.map((member) => <MemberRow key={member.id} member={member} locale={locale} onManage={() => setSelected(member)} />)}</div>
    </section> : <AdminEmptyState icon={<UsersRound className="h-5 w-5" />} title={isFr ? "Aucune identité dans cette vue" : "No identity in this view"} description={isFr ? "Modifiez la recherche ou réinitialisez les filtres de rôle et d'état." : "Change the search or reset role and status filters."} />}

    {selected ? <MemberAccessDialog key={selected.id} member={selected} roles={roles} locale={locale} onClose={() => setSelected(null)} onUpdated={onUpdated} /> : null}
  </div>;
}

function MemberRow({ member, locale, onManage }: { member: TeamMember; locale: "fr" | "en"; onManage: () => void }) {
  const isFr = locale === "fr";
  const name = `${member.firstName} ${member.lastName}`.trim() || member.email;
  const modules = Object.keys(member.permissions) as AdminModule[];
  const totals = permissionTotals(member.permissions);
  const protectedAccount = member.protected || member.current || member.role === "super_admin";
  return <article className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(13rem,1.15fr)_12rem_minmax(14rem,1fr)_10rem] md:items-center">
    <div className="flex min-w-0 items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md text-sm font-black ${member.status === "suspended" ? "bg-destructive/10 text-destructive" : member.status === "invited" ? "bg-gold/25 text-charcoal" : "bg-burgundy text-white"}`}>{(member.firstName || member.email).slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-black text-charcoal">{name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{member.email}</p><p className="mt-1 truncate text-[9px] text-muted-foreground">{member.lastSignInAt ? `${isFr ? "Vu" : "Seen"} ${formatDateTime(member.lastSignInAt, locale)}` : (isFr ? "Aucune connexion enregistrée" : "No sign-in recorded")}</p></div></div>
    <div><p className="text-xs font-black text-charcoal">{roleLabel(member.role, locale)}</p><StatusBadge status={member.status} locale={locale} />{protectedAccount ? <p className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase text-terre"><ShieldCheck className="h-3 w-3" />{isFr ? "Protégé" : "Protected"}</p> : null}</div>
    <div className="min-w-0"><div className="flex flex-wrap gap-1">{modules.slice(0, 3).map((module) => <Badge key={module} variant="outline" className="border-charcoal/10 text-[8px]">{moduleLabel(module, locale)}</Badge>)}{modules.length > 3 ? <Badge variant="outline" className="border-charcoal/10 text-[8px]">+{modules.length - 3}</Badge> : null}</div><p className="mt-2 text-[9px] text-muted-foreground">{totals.modules} modules · {totals.actions} {isFr ? "actions autorisées" : "allowed actions"}</p></div>
    <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={onManage} className="h-9 w-full justify-center border-charcoal/12 md:w-auto" aria-label={`${isFr ? "Gérer les accès de" : "Manage access for"} ${name}`}><SlidersHorizontal className="mr-1.5 h-4 w-4" />{protectedAccount ? (isFr ? "Consulter" : "Review") : (isFr ? "Gérer" : "Manage")}</Button></div>
  </article>;
}

function StatusBadge({ status, locale }: { status: TeamStatus; locale: "fr" | "en" }) {
  const style = status === "active" ? "border-burgundy/20 bg-burgundy/[0.035] text-burgundy" : status === "invited" ? "border-gold/45 bg-gold/[0.10] text-charcoal" : "border-destructive/25 bg-destructive/[0.04] text-destructive";
  const Icon = status === "active" ? UserCheck : status === "suspended" ? UserRoundX : ScrollText;
  return <Badge variant="outline" className={`mt-1 h-5 text-[8px] ${style}`}><Icon className="mr-1 h-3 w-3" />{statusLabel(status, locale)}</Badge>;
}

function FilterSelect({ label, value, onChange, options, optionLabel }: { label: string; value: string; onChange: (value: string) => void; options: string[]; optionLabel: (value: string) => string }) {
  return <label className="block"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs font-bold text-charcoal shadow-xs">{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>;
}

function downloadMembersCsv(members: TeamMember[], locale: "fr" | "en") {
  const headings = locale === "fr" ? ["Prénom", "Nom", "E-mail", "Rôle", "État", "Dernière connexion", "Création", "Invité par", "Modules", "Actions"] : ["First name", "Last name", "Email", "Role", "Status", "Last sign-in", "Created", "Invited by", "Modules", "Actions"];
  const rows = members.map((member) => { const totals = permissionTotals(member.permissions); return [member.firstName, member.lastName, member.email, roleLabel(member.role, locale), statusLabel(member.status, locale), member.lastSignInAt || "", member.createdAt, member.invitedBy || "", totals.modules, totals.actions]; });
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "je-mange-africain-equipe.csv"; link.click(); URL.revokeObjectURL(url);
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
