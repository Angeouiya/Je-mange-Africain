"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { CalendarClock, CalendarRange, FilePenLine, ImagePlus, LayoutTemplate, LoaderCircle, Megaphone, MousePointerClick, Pencil, Radio, Save, Trash2 } from "lucide-react";
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
import { advertisementLifecycle, type AdvertisementLifecycle } from "@/lib/advertising";

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

const placementLabels = {
  fr: { home: "Accueil", catalog: "Catalogue", recipes: "Recettes", checkout: "Paiement" },
  en: { home: "Home", catalog: "Catalogue", recipes: "Recipes", checkout: "Checkout" },
} as const;

export default function AdvertisingSection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | AdvertisementLifecycle>("all");
  const [placementFilter, setPlacementFilter] = useState<"all" | Advertisement["placement"]>("all");
  const request = useFetch<{ advertisements: Advertisement[] }>("/api/admin/advertisements", [locale]);
  const advertisements = request.data?.advertisements || [];
  const lifecycles = useMemo(() => new Map(advertisements.map((advertisement) => [advertisement.id, advertisementLifecycle(advertisement)])), [advertisements]);
  const metrics = useMemo(() => ({
    active: advertisements.filter((advertisement) => lifecycles.get(advertisement.id) === "active").length,
    scheduled: advertisements.filter((advertisement) => lifecycles.get(advertisement.id) === "scheduled").length,
    draft: advertisements.filter((advertisement) => lifecycles.get(advertisement.id) === "draft").length,
    placements: new Set(advertisements.map((advertisement) => advertisement.placement)).size,
  }), [advertisements, lifecycles]);
  const filteredAdvertisements = useMemo(() => advertisements.filter((advertisement) => {
    const matchesLifecycle = lifecycleFilter === "all" || lifecycles.get(advertisement.id) === lifecycleFilter;
    const matchesPlacement = placementFilter === "all" || advertisement.placement === placementFilter;
    return matchesLifecycle && matchesPlacement;
  }), [advertisements, lifecycleFilter, lifecycles, placementFilter]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Ouverture de la régie" : "Opening advertising desk"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return <div className="space-y-6">
    <AdminPageHeader variant="workspace" accent="#D65A32" icon={<Megaphone className="h-5 w-5" />} eyebrow={isFr ? "Visibilité commerciale" : "Commercial visibility"} title={isFr ? "Régie publicitaire" : "Advertising desk"} description={isFr ? "Créez des affiches bilingues, choisissez leur emplacement et leur calendrier, puis contrôlez exactement ce qui est visible dans l'application client." : "Create bilingual artwork, choose its placement and schedule, then control exactly what appears in the customer app."} action={<AdvertisementEditor locale={locale} onSaved={request.refetch} />} />

    <div data-testid="advertising-metrics" className="grid grid-cols-4 divide-x divide-charcoal/8 border-y border-charcoal/8 bg-white py-3 sm:py-4"><Metric icon={Radio} value={metrics.active} label={isFr ? "en cours" : "live now"} tone="terre" /><Metric icon={CalendarRange} value={metrics.scheduled} label={isFr ? "planifiées" : "scheduled"} tone="gold" /><Metric icon={FilePenLine} value={metrics.draft} label={isFr ? "brouillons" : "drafts"} tone="burgundy" /><Metric icon={LayoutTemplate} value={metrics.placements} label={isFr ? "emplacements" : "placements"} tone="soft" /></div>

    {advertisements.length ? <div className="flex flex-col gap-3 border-y border-charcoal/8 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="advertising-filters"><div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={isFr ? "Filtrer par cycle de diffusion" : "Filter by delivery lifecycle"}><FilterButton active={lifecycleFilter === "all"} onClick={() => setLifecycleFilter("all")}>{isFr ? "Toutes" : "All"} · {advertisements.length}</FilterButton><FilterButton active={lifecycleFilter === "active"} onClick={() => setLifecycleFilter("active")}>{isFr ? "En cours" : "Live"} · {metrics.active}</FilterButton><FilterButton active={lifecycleFilter === "scheduled"} onClick={() => setLifecycleFilter("scheduled")}>{isFr ? "Planifiées" : "Scheduled"} · {metrics.scheduled}</FilterButton><FilterButton active={lifecycleFilter === "draft"} onClick={() => setLifecycleFilter("draft")}>{isFr ? "Brouillons" : "Drafts"} · {metrics.draft}</FilterButton></div><label className="flex shrink-0 items-center gap-2 text-[10px] font-black text-muted-foreground"><span>{isFr ? "Emplacement" : "Placement"}</span><select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value as typeof placementFilter)} className="h-9 rounded-md border border-border bg-white px-2 text-[10px] font-bold text-charcoal" aria-label={isFr ? "Filtrer par emplacement" : "Filter by placement"}><option value="all">{isFr ? "Tous" : "All"}</option>{(Object.keys(placementLabels[locale]) as Advertisement["placement"][]).map((placement) => <option key={placement} value={placement}>{placementLabels[locale][placement]}</option>)}</select></label></div> : null}

    {filteredAdvertisements.length ? <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" data-testid="advertising-register">{filteredAdvertisements.map((advertisement, index) => <AdvertisementRow key={advertisement.id} advertisement={advertisement} lifecycle={lifecycles.get(advertisement.id) || "draft"} locale={locale} onSaved={request.refetch} priority={index < 2} />)}</div> : <AdminEmptyState icon={<Megaphone className="h-5 w-5" />} title={advertisements.length ? (isFr ? "Aucune affiche dans cette sélection" : "No artwork in this selection") : (isFr ? "Aucune campagne visuelle" : "No visual campaign")} description={advertisements.length ? (isFr ? "Modifiez le cycle ou l'emplacement pour retrouver une affiche." : "Change the lifecycle or placement to find artwork.") : (isFr ? "Créez la première affiche pour l'accueil, le catalogue, les recettes ou le paiement." : "Create the first artwork for home, catalogue, recipes or checkout.")} />}
  </div>;
}

function Metric({ icon: Icon, value, label, tone }: { icon: typeof Radio; value: number; label: string; tone: "terre" | "gold" | "burgundy" | "soft" }) {
  const styles = { terre: "bg-terre/10 text-terre", gold: "bg-gold/15 text-charcoal", burgundy: "bg-burgundy/10 text-burgundy", soft: "bg-charcoal/5 text-charcoal" };
  return <div className="min-w-0 px-2 sm:flex sm:items-center sm:gap-3 sm:px-4"><span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-md sm:grid ${styles[tone]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-lg font-black tabular-nums text-charcoal sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[8px] font-bold text-muted-foreground sm:text-[9px]">{label}</p></div></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-black transition ${active ? "border-burgundy bg-burgundy text-white" : "border-border bg-white text-charcoal hover:border-burgundy/30"}`}>{children}</button>;
}

function AdvertisementRow({ advertisement, lifecycle, locale, onSaved, priority }: { advertisement: Advertisement; lifecycle: AdvertisementLifecycle; locale: "fr" | "en"; onSaved: () => void; priority: boolean }) {
  const isFr = locale === "fr";
  return <article className="flex gap-3 border-b border-charcoal/8 p-3 last:border-b-0 sm:p-4" data-testid="advertising-row">
    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:h-[4.5rem] sm:w-28"><Image src={advertisement.imageUrl} alt={isFr ? advertisement.imageAltFr : advertisement.imageAltEn} fill sizes="112px" className="object-cover" priority={priority} /></div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-black uppercase text-terre">{placementLabels[locale][advertisement.placement]} · P{advertisement.priority}</p><h3 className="mt-0.5 truncate text-xs font-black text-charcoal sm:text-sm">{isFr ? advertisement.titleFr : advertisement.titleEn}</h3><p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{(isFr ? advertisement.bodyFr : advertisement.bodyEn) || (isFr ? "Aucun texte secondaire" : "No secondary copy")}</p></div><div className="flex shrink-0 gap-1"><AdvertisementEditor locale={locale} advertisement={advertisement} onSaved={onSaved} compact /><DeleteAdvertisement locale={locale} advertisement={advertisement} onDeleted={onSaved} /></div></div>
      <div className="mt-2 grid gap-2 border-t border-charcoal/8 pt-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]"><div className="flex min-w-0 items-center gap-2"><LifecycleBadge lifecycle={lifecycle} locale={locale} /><span className="min-w-0 truncate text-[9px] text-muted-foreground"><CalendarClock className="mr-1 inline h-3 w-3" />{scheduleLabel(advertisement, locale)}</span></div><div className="flex min-w-0 items-center gap-1 text-[9px] font-bold text-burgundy"><MousePointerClick className="h-3 w-3 shrink-0" /><span className="truncate">{destinationLabel(advertisement.linkUrl, locale)}</span></div></div>
    </div>
  </article>;
}

function LifecycleBadge({ lifecycle, locale }: { lifecycle: AdvertisementLifecycle; locale: "fr" | "en" }) {
  const styles: Record<AdvertisementLifecycle, string> = { active: "border-burgundy/25 bg-burgundy/[0.05] text-burgundy", scheduled: "border-gold/50 bg-gold/[0.1] text-charcoal", draft: "border-terre/25 bg-terre/[0.05] text-terre", expired: "border-destructive/25 bg-destructive/[0.05] text-destructive", archived: "border-charcoal/15 bg-white text-muted-foreground" };
  const labels = { fr: { active: "En cours", scheduled: "Planifiée", draft: "Brouillon", expired: "Expirée", archived: "Désactivée" }, en: { active: "Live", scheduled: "Scheduled", draft: "Draft", expired: "Expired", archived: "Disabled" } };
  return <Badge variant="outline" className={`h-5 shrink-0 px-1.5 text-[8px] ${styles[lifecycle]}`}>{labels[locale][lifecycle]}</Badge>;
}

function destinationLabel(linkUrl: string, locale: "fr" | "en") {
  try {
    const url = new URL(linkUrl, "https://je-mange-africain.com");
    if (url.origin !== "https://je-mange-africain.com") return url.hostname;
    const view = url.searchParams.get("view") || (url.pathname === "/" ? "home" : url.pathname.slice(1));
    const labels = { fr: { home: "Accueil client", catalog: "Catalogue client", recipes: "Recettes client", checkout: "Paiement client" }, en: { home: "Customer home", catalog: "Customer catalogue", recipes: "Customer recipes", checkout: "Customer checkout" } };
    return labels[locale][view as keyof typeof labels.fr] || linkUrl;
  } catch {
    return linkUrl;
  }
}

function scheduleLabel(advertisement: Advertisement, locale: "fr" | "en") {
  if (!advertisement.startsAt && !advertisement.endsAt) return locale === "fr" ? "Sans limite de date" : "No date limit";
  return `${advertisement.startsAt ? formatDateTime(advertisement.startsAt, locale) : (locale === "fr" ? "Dès publication" : "Upon publication")} → ${advertisement.endsAt ? formatDateTime(advertisement.endsAt, locale) : (locale === "fr" ? "Sans fin" : "No end")}`;
}

const toLocalDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const blank = { placement: "home", titleFr: "", titleEn: "", bodyFr: "", bodyEn: "", imageUrl: "", imageAltFr: "", imageAltEn: "", linkUrl: "/", status: "draft", priority: "50", startsAt: "", endsAt: "" };

function AdvertisementEditor({ locale, advertisement, onSaved, compact = false }: { locale: "fr" | "en"; advertisement?: Advertisement; onSaved: () => void; compact?: boolean }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => advertisement ? { ...advertisement, bodyFr: advertisement.bodyFr || "", bodyEn: advertisement.bodyEn || "", priority: String(advertisement.priority), startsAt: toLocalDate(advertisement.startsAt), endsAt: toLocalDate(advertisement.endsAt) } : blank);
  const update = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const reset = () => setDraft(advertisement ? { ...advertisement, bodyFr: advertisement.bodyFr || "", bodyEn: advertisement.bodyEn || "", priority: String(advertisement.priority), startsAt: toLocalDate(advertisement.startsAt), endsAt: toLocalDate(advertisement.endsAt) } : blank);
  const dateRangeValid = !draft.startsAt || !draft.endsAt || new Date(draft.endsAt).getTime() > new Date(draft.startsAt).getTime();
  const complete = Boolean(
    draft.imageUrl
    && draft.titleFr.trim()
    && draft.titleEn.trim()
    && draft.imageAltFr.trim()
    && draft.imageAltEn.trim()
    && draft.linkUrl.trim()
    && dateRangeValid
  );

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (saving) return; setOpen(nextOpen); if (nextOpen) { reset(); setError(""); } }}>
      <DialogTrigger asChild>
        {advertisement ? (compact ? <Button variant="outline" size="icon" className="h-9 w-9" aria-label={isFr ? `Modifier ${advertisement.titleFr}` : `Edit ${advertisement.titleEn}`}><Pencil className="h-3.5 w-3.5" /></Button> : <Button variant="outline" size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Modifier" : "Edit"}</Button>) : <Button size="sm" className="bg-terre text-white hover:bg-terre-dark"><ImagePlus className="mr-1.5 h-4 w-4" />{isFr ? "Nouvelle affiche" : "New artwork"}</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-5xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
            <DialogTitle>{advertisement ? (isFr ? "Modifier l'affiche" : "Edit artwork") : (isFr ? "Composer une affiche publicitaire" : "Compose advertising artwork")}</DialogTitle>
            <DialogDescription>{isFr ? "Le visuel, les deux langues, la destination et le calendrier sont contrôlés avant diffusion." : "Artwork, both languages, destination and schedule are checked before publishing."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => update("imageUrl", imageUrl)} kind="advertisement" locale={locale} label={isFr ? "Affiche publicitaire" : "Advertising artwork"} aspect="landscape" required />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdField label={isFr ? "Titre français" : "French title"} required><Input required value={draft.titleFr} onChange={(event) => update("titleFr", event.target.value)} /></AdField>
                <AdField label={isFr ? "Titre anglais" : "English title"} required><Input required value={draft.titleEn} onChange={(event) => update("titleEn", event.target.value)} /></AdField>
                <AdField label={isFr ? "Texte français" : "French copy"}><Textarea value={draft.bodyFr} onChange={(event) => update("bodyFr", event.target.value)} rows={3} /></AdField>
                <AdField label={isFr ? "Texte anglais" : "English copy"}><Textarea value={draft.bodyEn} onChange={(event) => update("bodyEn", event.target.value)} rows={3} /></AdField>
                <AdField label={isFr ? "Texte alternatif français" : "French alternative text"} required><Input required value={draft.imageAltFr} onChange={(event) => update("imageAltFr", event.target.value)} /></AdField>
                <AdField label={isFr ? "Texte alternatif anglais" : "English alternative text"} required><Input required value={draft.imageAltEn} onChange={(event) => update("imageAltEn", event.target.value)} /></AdField>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <AdField label={isFr ? "Emplacement" : "Placement"}>
                  <select value={draft.placement} onChange={(event) => update("placement", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {(Object.keys(placementLabels[locale]) as Advertisement["placement"][]).map((placement) => <option key={placement} value={placement}>{placementLabels[locale][placement]}</option>)}
                  </select>
                </AdField>
                <AdField label={isFr ? "État" : "Status"}>
                  <select value={draft.status} onChange={(event) => update("status", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="draft">{isFr ? "Brouillon" : "Draft"}</option><option value="published">{isFr ? "Publier" : "Publish"}</option><option value="archived">{isFr ? "Désactiver" : "Disable"}</option>
                  </select>
                </AdField>
                <AdField label={isFr ? "Priorité" : "Priority"}><Input type="number" min="0" max="100" value={draft.priority} onChange={(event) => update("priority", event.target.value)} /></AdField>
              </div>
              <AdField label={isFr ? "Destination au clic" : "Click destination"} required><Input required value={draft.linkUrl} onChange={(event) => update("linkUrl", event.target.value)} placeholder="/?view=recipes" /></AdField>
              <div className="grid gap-4 sm:grid-cols-2">
                <AdField label={isFr ? "Début" : "Starts"}><Input type="datetime-local" value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></AdField>
                <AdField label={isFr ? "Fin" : "Ends"}><Input type="datetime-local" value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></AdField>
              </div>
              {!dateRangeValid ? <p role="alert" className="border-y border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-semibold text-destructive">{isFr ? "La date de fin doit être postérieure à la date de début." : "The end date must be later than the start date."}</p> : null}
            </div>
          </div>
          {error ? <p role="alert" className="mx-5 border-y border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive sm:mx-6">{error}</p> : null}
          <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
            <p className="mr-auto hidden self-center text-[10px] text-muted-foreground sm:block">{complete ? (isFr ? "Prête à enregistrer" : "Ready to save") : (isFr ? "Complétez les champs obligatoires" : "Complete the required fields")}</p>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isFr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={saving || !complete} className="bg-terre text-white hover:bg-terre-dark">{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdField({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <Label className="block space-y-1.5"><span className="block">{label}{required ? <span className="ml-1 text-terre">*</span> : null}</span>{children}</Label>; }

function DeleteAdvertisement({ locale, advertisement, onDeleted }: { locale: "fr" | "en"; advertisement: Advertisement; onDeleted: () => void }) {
  const isFr = locale === "fr"; const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const remove = async () => { setBusy(true); setError(""); try { const response = await fetch(`/api/admin/advertisements/${advertisement.id}`, { method: "DELETE" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); onDeleted(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erreur"); } finally { setBusy(false); } };
  return <div><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={isFr ? `Supprimer l'affiche ${advertisement.titleFr}` : `Delete artwork ${advertisement.titleEn}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isFr ? "Supprimer cette affiche ?" : "Delete this artwork?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "Elle disparaîtra de la régie et ne pourra plus être diffusée. Désactiver reste préférable si vous souhaitez conserver son historique." : "It will disappear from the desk and can no longer be published. Disabling is preferable when you need to preserve its history."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isFr ? "Supprimer" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>{error ? <p role="alert" className="mt-1 text-[9px] text-destructive">{error}</p> : null}</div>;
}
