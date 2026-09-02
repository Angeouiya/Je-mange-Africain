"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { CalendarClock, Eye, ImagePlus, LoaderCircle, Megaphone, Pencil, Save, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/lib/use-fetch";
import { formatDateTime } from "@/lib/format";

type Advertisement = {
  id: string;
  placement: "home" | "catalog" | "recipes" | "checkout";
  titleFr: string;
  titleEn: string;
  bodyFr?: string | null;
  bodyEn?: string | null;
  imageUrl: string;
  imageAltFr: string;
  imageAltEn: string;
  linkUrl: string;
  status: "draft" | "published" | "archived";
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

const statusStyle: Record<string, string> = { published: "border-forest/25 bg-forest/5 text-forest", draft: "border-amber-300 bg-amber-50 text-amber-800", archived: "border-charcoal/15 bg-charcoal/5 text-charcoal" };

export default function AdvertisingSection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const request = useFetch<{ advertisements: Advertisement[] }>("/api/admin/advertisements", [locale]);
  const advertisements = request.data?.advertisements || [];
  const published = advertisements.filter((item) => item.status === "published").length;

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Ouverture de la régie" : "Opening advertising desk"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return <div className="space-y-6">
    <AdminPageHeader variant="workspace" accent="#C54F36" icon={<Megaphone className="h-5 w-5" />} eyebrow={isFr ? "Visibilité commerciale" : "Commercial visibility"} title={isFr ? "Régie publicitaire" : "Advertising desk"} description={isFr ? "Créez des affiches bilingues, choisissez leur emplacement et leur calendrier, puis contrôlez exactement ce qui est visible dans l'application client." : "Create bilingual artwork, choose its placement and schedule, then control exactly what appears in the customer app."} action={<AdvertisementEditor locale={locale} onSaved={request.refetch} />} />

    <div data-testid="advertising-metrics" className="grid grid-cols-3 border-y border-black/8 bg-charcoal px-2 py-3 text-white sm:px-5 sm:py-4 [&>*+*]:border-l [&>*+*]:border-white/10"><Metric value={advertisements.length} label={isFr ? "affiches enregistrées" : "saved ads"} /><Metric value={published} label={isFr ? "actives ou planifiées" : "active or scheduled"} /><Metric value={new Set(advertisements.map((item) => item.placement)).size} label={isFr ? "emplacements utilisés" : "placements used"} /></div>

    {advertisements.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{advertisements.map((advertisement) => <article key={advertisement.id} className="overflow-hidden rounded-lg border border-black/8 bg-white [contain-intrinsic-size:360px] [content-visibility:auto]"><div className="relative aspect-[16/8] overflow-hidden bg-muted"><Image src={advertisement.imageUrl} alt={isFr ? advertisement.imageAltFr : advertisement.imageAltEn} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-charcoal/80 px-3 py-2 text-white backdrop-blur-sm"><p className="truncate text-xs font-black">{isFr ? advertisement.titleFr : advertisement.titleEn}</p></div><Badge variant="outline" className={`absolute left-3 top-3 ${statusStyle[advertisement.status]}`}>{advertisement.status === "published" ? (isFr ? "Publiée" : "Published") : advertisement.status === "draft" ? (isFr ? "Brouillon" : "Draft") : (isFr ? "Désactivée" : "Disabled")}</Badge></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-terre">{advertisement.placement} · P{advertisement.priority}</p><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{(isFr ? advertisement.bodyFr : advertisement.bodyEn) || (isFr ? "Aucun texte secondaire" : "No secondary copy")}</p></div><Eye className="h-4 w-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 border-y border-border py-2 text-[10px] text-muted-foreground"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{scheduleLabel(advertisement, locale)}</div><div className="mt-3 flex justify-between gap-2"><AdvertisementEditor locale={locale} advertisement={advertisement} onSaved={request.refetch} /><DeleteAdvertisement locale={locale} advertisement={advertisement} onDeleted={request.refetch} /></div></div></article>)}</div> : <AdminEmptyState icon={<Megaphone className="h-5 w-5" />} title={isFr ? "Aucune campagne visuelle" : "No visual campaign"} description={isFr ? "Créez la première affiche pour l'accueil, le catalogue, les recettes ou le paiement." : "Create the first artwork for home, catalogue, recipes or checkout."} />}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="min-w-0 px-2 sm:px-4"><p className="text-xl font-black tabular-nums text-gold sm:text-2xl">{value}</p><p className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-white/70 sm:text-[10px]">{label}</p></div>; }

function scheduleLabel(advertisement: Advertisement, locale: "fr" | "en") {
  if (!advertisement.startsAt && !advertisement.endsAt) return locale === "fr" ? "Sans limite de date" : "No date limit";
  return `${advertisement.startsAt ? formatDateTime(advertisement.startsAt, locale) : (locale === "fr" ? "Dès publication" : "Upon publication")} → ${advertisement.endsAt ? formatDateTime(advertisement.endsAt, locale) : (locale === "fr" ? "Sans fin" : "No end")}`;
}

const toLocalDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const blank = { placement: "home", titleFr: "", titleEn: "", bodyFr: "", bodyEn: "", imageUrl: "", imageAltFr: "", imageAltEn: "", linkUrl: "/", status: "draft", priority: "50", startsAt: "", endsAt: "" };

function AdvertisementEditor({ locale, advertisement, onSaved }: { locale: "fr" | "en"; advertisement?: Advertisement; onSaved: () => void }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => advertisement ? { ...advertisement, bodyFr: advertisement.bodyFr || "", bodyEn: advertisement.bodyEn || "", priority: String(advertisement.priority), startsAt: toLocalDate(advertisement.startsAt), endsAt: toLocalDate(advertisement.endsAt) } : blank);
  const update = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const reset = () => setDraft(advertisement ? { ...advertisement, bodyFr: advertisement.bodyFr || "", bodyEn: advertisement.bodyEn || "", priority: String(advertisement.priority), startsAt: toLocalDate(advertisement.startsAt), endsAt: toLocalDate(advertisement.endsAt) } : blank);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const payload = { ...draft, priority: Number(draft.priority), startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null, endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null };
      const response = await fetch(advertisement ? `/api/admin/advertisements/${advertisement.id}` : "/api/admin/advertisements", { method: advertisement ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || (isFr ? "Enregistrement impossible." : "Unable to save."));
      setOpen(false); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isFr ? "Enregistrement impossible." : "Unable to save.")); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (saving) return; setOpen(nextOpen); if (nextOpen) { reset(); setError(""); } }}><DialogTrigger asChild>{advertisement ? <Button variant="outline" size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Modifier" : "Edit"}</Button> : <Button size="sm" className="bg-terre text-white hover:bg-terre-dark"><ImagePlus className="mr-1.5 h-4 w-4" />{isFr ? "Nouvelle affiche" : "New artwork"}</Button>}</DialogTrigger><DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-5xl"><form onSubmit={submit}><DialogHeader className="border-b border-border px-5 py-5 sm:px-6"><DialogTitle>{advertisement ? (isFr ? "Modifier l'affiche" : "Edit artwork") : (isFr ? "Composer une affiche publicitaire" : "Compose advertising artwork")}</DialogTitle><DialogDescription>{isFr ? "Le visuel, les deux langues, la destination et le calendrier sont contrôlés avant diffusion." : "Artwork, both languages, destination and schedule are checked before publishing."}</DialogDescription></DialogHeader><div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]"><MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => update("imageUrl", imageUrl)} kind="advertisement" locale={locale} label={isFr ? "Affiche publicitaire" : "Advertising artwork"} aspect="landscape" required /><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><AdField label="Titre français"><Input value={draft.titleFr} onChange={(event) => update("titleFr", event.target.value)} /></AdField><AdField label="English title"><Input value={draft.titleEn} onChange={(event) => update("titleEn", event.target.value)} /></AdField><AdField label="Texte français"><Textarea value={draft.bodyFr} onChange={(event) => update("bodyFr", event.target.value)} rows={3} /></AdField><AdField label="English copy"><Textarea value={draft.bodyEn} onChange={(event) => update("bodyEn", event.target.value)} rows={3} /></AdField><AdField label="Texte alternatif français"><Input value={draft.imageAltFr} onChange={(event) => update("imageAltFr", event.target.value)} /></AdField><AdField label="English alternative text"><Input value={draft.imageAltEn} onChange={(event) => update("imageAltEn", event.target.value)} /></AdField></div><div className="grid gap-4 sm:grid-cols-3"><AdField label={isFr ? "Emplacement" : "Placement"}><select value={draft.placement} onChange={(event) => update("placement", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="home">Accueil</option><option value="catalog">Catalogue</option><option value="recipes">Recettes</option><option value="checkout">Paiement</option></select></AdField><AdField label={isFr ? "État" : "Status"}><select value={draft.status} onChange={(event) => update("status", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="draft">Brouillon</option><option value="published">Publier</option><option value="archived">Désactiver</option></select></AdField><AdField label={isFr ? "Priorité" : "Priority"}><Input type="number" min="0" max="100" value={draft.priority} onChange={(event) => update("priority", event.target.value)} /></AdField></div><AdField label={isFr ? "Destination au clic" : "Click destination"}><Input value={draft.linkUrl} onChange={(event) => update("linkUrl", event.target.value)} placeholder="/?view=recipes" /></AdField><div className="grid gap-4 sm:grid-cols-2"><AdField label={isFr ? "Début" : "Starts"}><Input type="datetime-local" value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></AdField><AdField label={isFr ? "Fin" : "Ends"}><Input type="datetime-local" value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></AdField></div></div></div>{error ? <p role="alert" className="mx-5 border-y border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 sm:mx-6">{error}</p> : null}<DialogFooter className="border-t border-border px-5 py-4 sm:px-6"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={saving || !draft.imageUrl} className="bg-terre text-white hover:bg-terre-dark">{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer" : "Save"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function AdField({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="block space-y-1.5"><span className="block">{label}</span>{children}</Label>; }

function DeleteAdvertisement({ locale, advertisement, onDeleted }: { locale: "fr" | "en"; advertisement: Advertisement; onDeleted: () => void }) {
  const isFr = locale === "fr"; const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const remove = async () => { setBusy(true); setError(""); try { const response = await fetch(`/api/admin/advertisements/${advertisement.id}`, { method: "DELETE" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); onDeleted(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erreur"); } finally { setBusy(false); } };
  return <div><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={isFr ? "Supprimer l'affiche" : "Delete artwork"}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isFr ? "Supprimer cette affiche ?" : "Delete this artwork?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "Elle disparaîtra de la régie et ne pourra plus être diffusée. Désactiver reste préférable si vous souhaitez conserver son historique." : "It will disappear from the desk and can no longer be published. Disabling is preferable when you need to preserve its history."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isFr ? "Supprimer" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>{error ? <p role="alert" className="mt-1 text-[9px] text-destructive">{error}</p> : null}</div>;
}
