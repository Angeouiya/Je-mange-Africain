"use client";

import { useState } from "react";
import { AlertTriangle, KeyRound, MailCheck, ShieldCheck, UserCheck, UserRoundCog, UsersRound } from "lucide-react";
import { AdminPageHeader, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { InviteMemberDialog } from "@/components/admin/TeamDialogs";
import { TeamMemberWorkspace } from "@/components/admin/TeamMemberWorkspace";
import { TeamRoleWorkspace } from "@/components/admin/TeamRoleWorkspace";
import type { TeamPayload, TeamRole, TeamSummary } from "@/components/admin/team-types";
import { useFetch } from "@/lib/use-fetch";

type TeamTab = "members" | "roles";

export default function TeamSection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [tab, setTab] = useState<TeamTab>("members");
  const request = useFetch<TeamPayload>("/api/admin/team", [locale]);
  const data = request.data;
  const roleCatalog = data ? completeRoleCatalog(data) : [];
  const summary = data ? data.summary || fallbackSummary(data) : null;

  if (request.loading && !data) return <AdminSectionLoading label={isFr ? "Qualification des identités et des autorisations" : "Qualifying identities and permissions"} />;

  return <div className="space-y-6">
    <AdminPageHeader variant="control" accent="#C92A3E" icon={<UserRoundCog className="h-5 w-5" />} eyebrow={isFr ? "Identités et autorisations" : "Identity and authorisation"} title={isFr ? "Équipe professionnelle" : "Professional team"} description={isFr ? "Mesurez la couverture opérationnelle, attribuez le rôle strictement nécessaire et documentez chaque changement d'accès." : "Measure operational coverage, grant only the required role and document every access change."} action={data ? <InviteMemberDialog locale={locale} roles={data.roles} onInvited={request.refetch} /> : undefined} />

    {request.error && !data ? <section className="border-y border-gold/45 bg-gold/[0.09] px-4 py-4" role="alert"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-terre" /><div><h3 className="text-sm font-black text-charcoal">{isFr ? "Service d'équipe à raccorder" : "Team service needs configuration"}</h3><p className="mt-1 text-xs leading-5 text-charcoal">{request.error}</p><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{isFr ? "La clé serveur reste exclusivement dans l'environnement sécurisé et n'est jamais transmise au navigateur." : "The server key remains exclusively in the secured environment and is never sent to the browser."}</p></div></div></section> : null}

    {data && summary ? <>
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé des habilitations" : "Access health"}>
        <TeamMetric position={0} icon={<UsersRound className="h-4 w-4" />} label={isFr ? "Identités suivies" : "Tracked identities"} value={String(summary.total)} detail={isFr ? `${summary.protected} ${summary.protected === 1 ? "compte de gouvernance" : "comptes de gouvernance"}` : `${summary.protected} governance ${summary.protected === 1 ? "account" : "accounts"}`} tone="earth" />
        <TeamMetric position={1} icon={<UserCheck className="h-4 w-4" />} label={isFr ? "Comptes actifs" : "Active accounts"} value={String(summary.active)} detail={`${summary.recentlyActive} ${isFr ? "actifs ces 30 derniers jours" : "active in the last 30 days"}`} tone="burgundy" />
        <TeamMetric position={2} icon={<MailCheck className="h-4 w-4" />} label={isFr ? "Invitations en attente" : "Pending invitations"} value={String(summary.invited)} detail={isFr ? "accès non encore activés" : "access not yet activated"} tone={summary.invited ? "gold" : "burgundy"} />
        <TeamMetric position={3} icon={<ShieldCheck className="h-4 w-4" />} label={isFr ? "Couverture déléguée" : "Delegated coverage"} value={`${summary.coveredModules}/${summary.totalModules}`} detail={isFr ? `${summary.delegatedRoles} ${summary.delegatedRoles === 1 ? "rôle actif" : "rôles actifs"} hors direction` : `${summary.delegatedRoles} active ${summary.delegatedRoles === 1 ? "role" : "roles"} beyond governance`} tone="gold" />
      </section>

      <TeamAttention summary={summary} locale={locale} />

      <SectionTabs variant="workspace" value={tab} onChange={setTab} label={isFr ? "Espaces de gestion de l'équipe" : "Team management workspaces"} items={[
        { value: "members", label: isFr ? "Identités" : "Identities", description: isFr ? "Inviter, suspendre et suivre" : "Invite, suspend and monitor", count: data.members.length, icon: UsersRound, accent: "#C92A3E" },
        { value: "roles", label: isFr ? "Matrice des rôles" : "Role matrix", description: isFr ? "Comparer chaque autorisation" : "Compare every permission", count: roleCatalog.length, icon: ShieldCheck, accent: "#8A3042" },
      ]} />
      {tab === "members" ? <TeamMemberWorkspace members={data.members} roles={data.roles} locale={locale} onUpdated={request.refetch} /> : <TeamRoleWorkspace roles={roleCatalog} members={data.members} locale={locale} />}
    </> : null}
  </div>;
}

function TeamMetric({ position, icon, label, value, detail, tone }: { position: number; icon: React.ReactNode; label: string; value: string; detail: string; tone: "earth" | "burgundy" | "gold" }) {
  const style = tone === "earth" ? "bg-terre text-white" : tone === "burgundy" ? "bg-burgundy/10 text-burgundy" : "bg-gold/25 text-charcoal";
  return <div className={`min-w-0 p-3 sm:p-5 ${position < 2 ? "border-b" : ""} ${position % 2 === 0 ? "border-r" : ""} border-charcoal/8 xl:border-b-0 ${position < 3 ? "xl:border-r" : "xl:border-r-0"}`}><span className={`grid h-9 w-9 place-items-center rounded-md ${style}`}>{icon}</span><p className="mt-3 text-xl font-black tabular-nums text-charcoal sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{detail}</p></div>;
}

function TeamAttention({ summary, locale }: { summary: TeamSummary; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const needsReview = summary.invited > 0 || summary.suspended > 0 || summary.dormant > 0;
  if (!needsReview) return <div className="flex items-start gap-3 border-y border-burgundy/15 bg-burgundy/[0.035] px-4 py-3 text-xs leading-5 text-burgundy"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Accès sous contrôle" : "Access under control"}</strong> · {isFr ? "Aucune invitation, suspension ou inactivité prolongée ne demande de revue." : "No invitation, suspension or prolonged inactivity currently requires review."}</p></div>;
  const facts = [
    summary.invited ? (isFr ? `${summary.invited} invitation${summary.invited === 1 ? "" : "s"} en attente` : `${summary.invited} pending invitation${summary.invited === 1 ? "" : "s"}`) : null,
    summary.suspended ? (isFr ? `${summary.suspended} compte${summary.suspended === 1 ? "" : "s"} suspendu${summary.suspended === 1 ? "" : "s"}` : `${summary.suspended} suspended account${summary.suspended === 1 ? "" : "s"}`) : null,
    summary.dormant ? (isFr ? `${summary.dormant} accès sans activité depuis 90 jours` : `${summary.dormant} access record${summary.dormant === 1 ? "" : "s"} inactive for 90 days`) : null,
  ].filter(Boolean).join(" · ");
  return <div className="flex items-start gap-3 border-y border-gold/40 bg-gold/[0.07] px-4 py-3 text-xs leading-5 text-charcoal"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><p><strong>{isFr ? "Revue recommandée" : "Review recommended"}</strong> · {facts}.</p></div>;
}

function completeRoleCatalog(data: TeamPayload) {
  if (data.roleCatalog?.length) return data.roleCatalog;
  const roles = new Map<string, TeamRole>(data.roles.map((role) => [role.id, role]));
  for (const member of data.members) if (!roles.has(member.role)) roles.set(member.role, { id: member.role, permissions: member.permissions, assignable: member.role !== "super_admin" });
  return [...roles.values()];
}

function fallbackSummary(data: TeamPayload): TeamSummary {
  const delegated = data.members.filter((member) => member.status === "active" && !member.current && member.role !== "super_admin");
  return { total: data.members.length, active: data.members.filter((member) => member.status === "active").length, invited: data.members.filter((member) => member.status === "invited").length, suspended: data.members.filter((member) => member.status === "suspended").length, protected: data.members.filter((member) => member.role === "super_admin").length, delegatedRoles: new Set(delegated.map((member) => member.role)).size, coveredModules: new Set(delegated.flatMap((member) => Object.keys(member.permissions))).size, totalModules: data.modules?.length || 10, recentlyActive: delegated.filter((member) => member.lastSignInAt && Date.now() - new Date(member.lastSignInAt).getTime() <= 30 * 86_400_000).length, dormant: delegated.filter((member) => !member.lastSignInAt || Date.now() - new Date(member.lastSignInAt).getTime() > 90 * 86_400_000).length };
}
