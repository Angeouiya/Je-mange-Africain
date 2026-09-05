"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, LoaderCircle, LockKeyhole, MailPlus, PauseCircle, PlayCircle, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
import { TeamPermissionList } from "@/components/admin/TeamPermissionList";
import { permissionTotals, roleDescription, roleLabel, statusLabel } from "@/components/admin/team-labels";
import type { TeamMember, TeamRole, TeamStatus } from "@/components/admin/team-types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

type MemberDraft = { email: string; firstName: string; lastName: string; role: string };

export function InviteMemberDialog({ locale, roles, onInvited }: { locale: "fr" | "en"; roles: TeamRole[]; onInvited: () => void }) {
  const isFr = locale === "fr";
  const emptyDraft = (): MemberDraft => ({ email: "", firstName: "", lastName: "", role: roles[0]?.id || "support" });
  const [open, setOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<MemberDraft>(emptyDraft);
  const selected = roles.find((role) => role.id === draft.role) || roles[0];
  const totals = permissionTotals(selected?.permissions || {});
  const complete = draft.firstName.trim().length >= 2 && draft.lastName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) && Boolean(selected);
  const draftDirty = Boolean(draft.email.trim() || draft.firstName.trim() || draft.lastName.trim() || draft.role !== (roles[0]?.id || "support"));

  const handleOpen = (next: boolean) => {
    if (busy) return;
    if (next) {
      setDraft(emptyDraft());
      setError("");
      setConfirmationOpen(false);
      setDiscardOpen(false);
      setOpen(true);
      return;
    }
    if (draftDirty) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  };

  const discardDraft = () => {
    setDraft(emptyDraft());
    setError("");
    setConfirmationOpen(false);
    setDiscardOpen(false);
    setOpen(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete || busy) return;
    setConfirmationOpen(true);
  };

  const sendInvitation = async () => {
    if (!complete || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Invitation impossible." : "Unable to send invitation."));
      setConfirmationOpen(false);
      setOpen(false);
      onInvited();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Invitation impossible." : "Unable to send invitation."));
      setConfirmationOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild><Button size="sm" className="h-10 bg-burgundy text-white hover:bg-burgundy-dark"><MailPlus className="mr-1.5 h-4 w-4" />{isFr ? "Inviter un membre" : "Invite member"}</Button></DialogTrigger>
      <DialogContent closeLabel={isFr ? "Fermer" : "Close"} className="max-h-[calc(100svh-1rem)] overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={submit} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left sm:px-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-burgundy text-white"><MailPlus className="h-4 w-4" /></span><div><DialogTitle>{isFr ? "Créer un accès professionnel" : "Create professional access"}</DialogTitle><DialogDescription className="mt-1">{isFr ? "L'invitation attribue un rôle précis, vérifié à chaque action par le serveur." : "The invitation assigns a precise role, verified by the server on every action."}</DialogDescription></div></div></DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="grid content-start gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <TeamField label={isFr ? "Prénom" : "First name"} required><Input required autoComplete="given-name" value={draft.firstName} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} /></TeamField>
                <TeamField label={isFr ? "Nom" : "Last name"} required><Input required autoComplete="family-name" value={draft.lastName} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} /></TeamField>
                <div className="sm:col-span-2"><TeamField label="E-mail" required><Input required type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="prenom@entreprise.com" /></TeamField></div>
                <div className="sm:col-span-2"><TeamField label={isFr ? "Rôle attribué" : "Assigned role"} required><select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.id, locale)}</option>)}</select></TeamField></div>
                <div className="sm:col-span-2 border-y border-gold/35 bg-gold/[0.07] px-3 py-3 text-xs leading-5 text-charcoal"><div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><p>{isFr ? "Le lien est envoyé par e-mail. Le membre ne peut ni élargir son rôle ni accéder aux espaces absents de ce périmètre." : "The link is sent by email. The member cannot expand their role or access workspaces outside this scope."}</p></div></div>
              </div>
              <aside className="border-t border-border bg-[#F8F7F4] px-5 py-5 lg:border-l lg:border-t-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Périmètre accordé" : "Granted scope"}</p><h3 className="mt-1 text-sm font-black text-charcoal">{selected ? roleLabel(selected.id, locale) : "—"}</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{selected ? roleDescription(selected.id, locale) : ""}</p><div className="mt-3 flex gap-2"><Badge variant="outline" className="bg-white text-[9px]">{totals.modules} {isFr ? "modules" : "modules"}</Badge><Badge variant="outline" className="bg-white text-[9px]">{totals.actions} {isFr ? "actions" : "actions"}</Badge></div>{selected ? <div className="mt-4"><TeamPermissionList permissions={selected.permissions} locale={locale} /></div> : null}</aside>
            </div>
            {error ? <p role="alert" className="mx-5 mb-4 border-l-2 border-destructive bg-destructive/[0.04] px-3 py-2 text-xs text-destructive sm:mx-6">{error}</p> : null}
          </div>
          <DialogFooter className="shrink-0 border-t border-border bg-white px-5 py-4 sm:px-6"><Button type="button" variant="outline" onClick={() => handleOpen(false)} disabled={busy}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={!complete || busy} className="bg-burgundy text-white hover:bg-burgundy-dark"><MailPlus className="mr-1.5 h-4 w-4" />{isFr ? "Envoyer l'invitation" : "Send invitation"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmationOpen} onOpenChange={(next) => { if (!busy) setConfirmationOpen(next); }}>
      <AlertDialogContent>
        <AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-burgundy/[0.08] text-burgundy"><MailPlus className="h-5 w-5" /></span><AlertDialogTitle>{isFr ? "Confirmer cette invitation ?" : "Confirm this invitation?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? `Un e-mail sera envoyé à ${draft.firstName.trim()} ${draft.lastName.trim()} (${draft.email.trim()}). Après activation, cette personne disposera du rôle ${selected ? roleLabel(selected.id, locale) : "—"}, couvrant ${totals.modules} module(s) et ${totals.actions} action(s).` : `An email will be sent to ${draft.firstName.trim()} ${draft.lastName.trim()} (${draft.email.trim()}). Once activated, this person will have the ${selected ? roleLabel(selected.id, locale) : "—"} role, covering ${totals.modules} module(s) and ${totals.actions} action(s).`}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>{isFr ? "Vérifier le rôle" : "Review role"}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void sendInvitation(); }} disabled={busy} className="bg-burgundy text-white hover:bg-burgundy-dark">{busy ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <MailPlus className="mr-1.5 h-4 w-4" />}{isFr ? "Confirmer l'invitation" : "Confirm invitation"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><Trash2 className="h-5 w-5" /></span><AlertDialogTitle>{isFr ? "Abandonner cette invitation ?" : "Discard this invitation?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "L'identité, l'adresse e-mail et le rôle saisis seront effacés. Aucun accès professionnel ne sera créé et aucun e-mail ne sera envoyé." : "The entered identity, email address and role will be cleared. No professional access will be created and no email will be sent."}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{isFr ? "Continuer l'invitation" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={discardDraft} className="bg-destructive text-white hover:bg-destructive/90"><Trash2 className="mr-1.5 h-4 w-4" />{isFr ? "Oui, abandonner" : "Yes, discard"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function MemberAccessDialog({ member, roles, locale, onClose, onUpdated }: { member: TeamMember; roles: TeamRole[]; locale: "fr" | "en"; onClose: () => void; onUpdated: () => void }) {
  const isFr = locale === "fr";
  const [role, setRole] = useState(member.role);
  const [changeReason, setChangeReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roles.find((option) => option.id === role);
  const currentTotals = permissionTotals(member.permissions);
  const nextTotals = permissionTotals(selectedRole?.permissions || member.permissions);
  const name = `${member.firstName} ${member.lastName}`.trim() || member.email;
  const protectedAccount = member.protected || member.current || member.role === "super_admin";

  const mutate = async (nextRole: string, status: TeamStatus, reason: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole, status, reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Mise à jour impossible." : "Unable to update access."));
      onUpdated();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Mise à jour impossible." : "Unable to update access."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: deleteReason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Suppression impossible." : "Unable to delete access."));
      onUpdated();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Suppression impossible." : "Unable to delete access."));
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
    <DialogContent closeLabel={isFr ? "Fermer" : "Close"} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left sm:px-6"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${protectedAccount ? "bg-charcoal text-white" : "bg-burgundy text-white"}`}><UserRoundCog className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Identité professionnelle" : "Professional identity"}</p><DialogTitle className="mt-1 truncate">{name}</DialogTitle><DialogDescription className="mt-1 break-all">{member.email}</DialogDescription></div></div></DialogHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 sm:grid-cols-4" aria-label={isFr ? "Synthèse de l'accès" : "Access summary"}><AccessFact label={isFr ? "État" : "Status"} value={statusLabel(member.status, locale)} /><AccessFact label={isFr ? "Rôle" : "Role"} value={roleLabel(member.role, locale)} /><AccessFact label={isFr ? "Modules" : "Modules"} value={String(currentTotals.modules)} /><AccessFact label={isFr ? "Actions" : "Actions"} value={String(currentTotals.actions)} /></section>
        <section><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Traçabilité de l'identité" : "Identity traceability"}</p><div className="mt-3 grid gap-3 border-y border-border py-3 text-xs sm:grid-cols-2"><IdentityFact label={isFr ? "Dernière connexion" : "Last sign-in"} value={member.lastSignInAt ? formatDateTime(member.lastSignInAt, locale) : (isFr ? "Jamais connecté" : "Never signed in")} /><IdentityFact label={isFr ? "Accès créé" : "Access created"} value={formatDateTime(member.createdAt, locale)} /><IdentityFact label={isFr ? "Invité par" : "Invited by"} value={member.invitedBy || (isFr ? "Identité non documentée" : "Identity not recorded")} /><IdentityFact label={isFr ? "Protection" : "Protection"} value={protectedAccount ? (isFr ? "Compte non modifiable" : "Protected account") : (isFr ? "Gestion autorisée" : "Management allowed")} /></div></section>
        {protectedAccount ? <section className="border-y border-gold/40 bg-gold/[0.08] px-4 py-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-terre" /><div><h3 className="text-sm font-black text-charcoal">{isFr ? "Compte de gouvernance protégé" : "Protected governance account"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Ce compte conserve la continuité de direction. Son rôle, sa suspension et sa suppression sont bloqués dans cet espace." : "This account preserves governance continuity. Its role, suspension and deletion are blocked in this workspace."}</p></div></div></section> : <>
          <section><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Rôle et périmètre" : "Role and scope"}</p><h3 className="mt-1 text-sm font-black text-charcoal">{isFr ? "Ajuster au strict nécessaire" : "Keep access to the minimum required"}</h3></div>{role !== member.role ? <Badge variant="outline" className="border-gold/45 bg-gold/[0.08] text-[9px] text-charcoal">{isFr ? "Changement prêt" : "Change ready"}</Badge> : null}</div><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]"><TeamField label={isFr ? "Nouveau rôle" : "New role"}><select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{roles.map((option) => <option key={option.id} value={option.id}>{roleLabel(option.id, locale)}</option>)}</select></TeamField><TeamField label={isFr ? "Motif obligatoire" : "Required reason"}><Input value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder={isFr ? "Mission, mobilité ou changement d'équipe" : "Assignment, move or team change"} /></TeamField></div>{role !== member.role ? <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#F8F7F4] px-3 py-3 text-xs"><div><p className="font-black text-charcoal">{roleLabel(member.role, locale)}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{currentTotals.modules} modules · {currentTotals.actions} actions</p></div><ArrowRight className="h-4 w-4 text-terre" /><div className="text-right"><p className="font-black text-charcoal">{roleLabel(role, locale)}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{nextTotals.modules} modules · {nextTotals.actions} actions</p></div></div> : null}<Button type="button" disabled={role === member.role || changeReason.trim().length < 5 || busy} onClick={() => void mutate(role, member.status, changeReason)} className="mt-3 bg-burgundy text-white hover:bg-burgundy-dark"><ShieldCheck className="mr-1.5 h-4 w-4" />{isFr ? "Enregistrer le nouveau rôle" : "Save new role"}</Button></section>
          <section><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Autorisations du rôle sélectionné" : "Selected role permissions"}</p><div className="mt-3"><TeamPermissionList permissions={selectedRole?.permissions || member.permissions} locale={locale} /></div></section>
          <section className="border-t border-destructive/15 pt-4"><p className="text-[9px] font-black uppercase text-destructive">{isFr ? "Actions sensibles" : "Sensitive actions"}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><StatusAction member={member} locale={locale} role={member.role} reason={statusReason} onReasonChange={setStatusReason} busy={busy} onConfirm={(status) => void mutate(member.role, status, statusReason)} /><DeleteAction locale={locale} reason={deleteReason} onReasonChange={setDeleteReason} busy={busy} onConfirm={() => void remove()} /></div></section>
        </>}
        {error ? <p role="alert" className="border-l-2 border-destructive bg-destructive/[0.04] px-3 py-2 text-xs text-destructive">{error}</p> : null}
      </div>
      <DialogFooter className="shrink-0 border-t border-border bg-white px-5 py-4 sm:px-6"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>{isFr ? "Fermer" : "Close"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function StatusAction({ member, locale, role, reason, onReasonChange, busy, onConfirm }: { member: TeamMember; locale: "fr" | "en"; role: string; reason: string; onReasonChange: (value: string) => void; busy: boolean; onConfirm: (status: TeamStatus) => void }) {
  const isFr = locale === "fr";
  const reactivate = member.status === "suspended";
  const nextStatus: TeamStatus = reactivate ? "active" : "suspended";
  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" className="justify-start">{reactivate ? <PlayCircle className="mr-1.5 h-4 w-4 text-burgundy" /> : <PauseCircle className="mr-1.5 h-4 w-4 text-terre" />}{reactivate ? (isFr ? "Réactiver le compte" : "Reactivate account") : (isFr ? "Suspendre le compte" : "Suspend account")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{reactivate ? (isFr ? "Réactiver cet accès ?" : "Reactivate this access?") : (isFr ? "Suspendre immédiatement cet accès ?" : "Suspend this access now?")}</AlertDialogTitle><AlertDialogDescription>{reactivate ? (isFr ? `Le membre retrouvera les autorisations du rôle ${roleLabel(role, locale)}.` : `The member will regain the ${roleLabel(role, locale)} role permissions.`) : (isFr ? "Toutes les sessions seront rendues inexploitables et les nouvelles connexions bloquées jusqu'à réactivation." : "All sessions become unusable and new sign-ins are blocked until reactivation.")}</AlertDialogDescription></AlertDialogHeader><Label className="block space-y-1.5"><span>{isFr ? "Motif obligatoire" : "Required reason"}</span><Input value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder={isFr ? "Contexte de la décision" : "Decision context"} /></Label><AlertDialogFooter><AlertDialogCancel>{isFr ? "Annuler" : "Cancel"}</AlertDialogCancel><AlertDialogAction disabled={reason.trim().length < 5 || busy} onClick={() => onConfirm(nextStatus)} className="bg-charcoal text-white hover:bg-charcoal/90">{isFr ? "Confirmer la décision" : "Confirm decision"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function DeleteAction({ locale, reason, onReasonChange, busy, onConfirm }: { locale: "fr" | "en"; reason: string; onReasonChange: (value: string) => void; busy: boolean; onConfirm: () => void }) {
  const isFr = locale === "fr";
  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" className="justify-start text-destructive hover:bg-destructive/[0.05] hover:text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />{isFr ? "Supprimer l'accès" : "Delete access"}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><div className="mb-1 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" /></span><AlertDialogTitle>{isFr ? "Supprimer ce compte professionnel ?" : "Delete this professional account?"}</AlertDialogTitle></div><AlertDialogDescription>{isFr ? "L'identité Supabase sera supprimée. Cet accès ne pourra être recréé que par une nouvelle invitation." : "The Supabase identity will be deleted. Access can only be recreated through a new invitation."}</AlertDialogDescription></AlertDialogHeader><Label className="block space-y-1.5"><span>{isFr ? "Motif obligatoire" : "Required reason"}</span><Input value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder={isFr ? "Départ, doublon ou fin de mission" : "Departure, duplicate or assignment end"} /></Label><AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver le compte" : "Keep account"}</AlertDialogCancel><AlertDialogAction disabled={reason.trim().length < 5 || busy} onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">{isFr ? "Supprimer définitivement" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function TeamField({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <Label className="block space-y-1.5"><span className="block">{label}{required ? <span className="ml-1 text-terre" aria-hidden="true">*</span> : null}</span>{children}</Label>;
}

function AccessFact({ label, value }: { label: string; value: string }) { return <div className="min-w-0 border-b border-r border-charcoal/8 p-3 last:border-r-0 sm:border-b-0"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div>; }
function IdentityFact({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[9px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words font-bold text-charcoal">{value}</p></div>; }
