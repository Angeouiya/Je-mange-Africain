"use client";

import { useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { BadgePercent, CalendarClock, CheckCircle2, Clock3, Gauge, LoaderCircle, PauseCircle, Pencil, PlayCircle, Save, ShieldCheck, Target, TicketPercent, Trash2, Truck } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { europeanCountryLabel, europeanCountryOptions } from "@/lib/european-countries";
import { formatDateTime, formatPrice, normalize } from "@/lib/format";
import { promotionLifecycle, type PromotionLifecycle, type PromotionTarget, type PromotionType } from "@/lib/promotion-policy";
import { useFetch } from "@/lib/use-fetch";

type Promotion = {
  id: string;
  code: string;
  type: PromotionType;
  value: number;
  minOrder: number;
  appliesTo: PromotionTarget;
  targetId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string;
};

type ProductOption = { id: string; name: string; nameFr?: string; nameEn?: string };
type CategoryOption = { id: string; name: string };
type PromotionFilter = "all" | "active" | "scheduled" | "attention";

export default function PromotionsSection({ locale, canCreate, canUpdate, canDelete }: { locale: "fr" | "en"; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const isFr = locale === "fr";
  const request = useFetch<{ promotions: Promotion[] }>("/api/admin/promotions", [locale]);
  const productRequest = useFetch<{ products: ProductOption[] }>("/api/admin/products", [locale]);
  const categoryRequest = useFetch<{ categories: CategoryOption[] }>("/api/categories", [locale]);
  const [filter, setFilter] = useState<PromotionFilter>("all");
  const [query, setQuery] = useState("");
  const promotions = request.data?.promotions || [];
  const products = productRequest.data?.products || [];
  const categories = categoryRequest.data?.categories || [];
  const lifecycles = useMemo(() => new Map(promotions.map((promotion) => [promotion.id, promotionLifecycle(promotion)])), [promotions]);
  const metrics = useMemo(() => ({
    active: promotions.filter((promotion) => lifecycles.get(promotion.id) === "active").length,
    scheduled: promotions.filter((promotion) => lifecycles.get(promotion.id) === "scheduled").length,
    attention: promotions.filter((promotion) => ["paused", "expired", "exhausted"].includes(lifecycles.get(promotion.id) || "")).length,
    uses: promotions.reduce((sum, promotion) => sum + promotion.usedCount, 0),
  }), [lifecycles, promotions]);
  const filtered = useMemo(() => promotions.filter((promotion) => {
    const lifecycle = lifecycles.get(promotion.id) || "paused";
    const matchesFilter = filter === "all" || lifecycle === filter || (filter === "attention" && ["paused", "expired", "exhausted"].includes(lifecycle));
    const matchesQuery = normalize(`${promotion.code} ${promotionRuleLabel(promotion, locale)} ${targetLabel(promotion, products, categories, locale)}`).includes(normalize(query));
    return matchesFilter && matchesQuery;
  }), [categories, filter, lifecycles, locale, products, promotions, query]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Ouverture des promotions" : "Opening promotions"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        variant="workspace"
        accent="#B9472B"
        icon={<TicketPercent className="h-5 w-5" />}
        eyebrow={isFr ? "Activation commerciale" : "Commercial activation"}
        title={isFr ? "Piloter les promotions" : "Promotion control"}
        description={isFr ? "Planifiez les codes, protégez les marges par des seuils et vérifiez leur consommation dans l'application client." : "Schedule codes, protect margin with thresholds and monitor redemption in the customer app."}
        action={canCreate ? <PromotionEditor locale={locale} products={products} categories={categories} onSaved={request.refetch} /> : null}
      />

      <section className="grid grid-cols-4 divide-x divide-charcoal/8 border-y border-charcoal/8 bg-white py-3 sm:py-4" aria-label={isFr ? "Santé des promotions" : "Promotion health"} data-testid="promotion-metrics">
        <PromotionMetric icon={CheckCircle2} value={metrics.active} label={isFr ? "actives" : "active"} tone="terre" />
        <PromotionMetric icon={Clock3} value={metrics.scheduled} label={isFr ? "planifiées" : "scheduled"} tone="gold" />
        <PromotionMetric icon={Gauge} value={metrics.uses} label={isFr ? "utilisations" : "redemptions"} tone="burgundy" />
        <PromotionMetric icon={PauseCircle} value={metrics.attention} label={isFr ? "à revoir" : "to review"} tone="soft" />
      </section>

      <div className="flex items-start gap-3 border-y border-burgundy/15 bg-burgundy/[0.04] px-4 py-3 text-xs leading-5 text-burgundy"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Règle unique" : "One source of truth"}</strong> · {isFr ? "Le panier, le paiement et la commande appliquent le même calendrier, la même cible et le même quota." : "Basket, payment and order use the same schedule, target and usage limit."}</p></div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Cycle des promotions" : "Promotion lifecycle"} items={[
          { value: "all", label: isFr ? "Toutes" : "All", count: promotions.length },
          { value: "active", label: isFr ? "Actives" : "Active", count: metrics.active },
          { value: "scheduled", label: isFr ? "Planifiées" : "Scheduled", count: metrics.scheduled },
          { value: "attention", label: isFr ? "À revoir" : "Review", count: metrics.attention },
        ]} />
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher une promotion" : "Search promotions"} placeholder={isFr ? "Code, avantage ou cible" : "Code, benefit or target"} resultCount={filtered.length} totalCount={promotions.length} locale={locale} className="w-full xl:w-80" />
      </div>

      {filtered.length ? (
        <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des promotions" : "Promotion register"} data-testid="promotion-register">
          {filtered.map((promotion) => <PromotionRow key={promotion.id} promotion={promotion} lifecycle={lifecycles.get(promotion.id) || "paused"} products={products} categories={categories} locale={locale} canUpdate={canUpdate} canDelete={canDelete} onChanged={request.refetch} />)}
        </section>
      ) : <AdminEmptyState icon={<TicketPercent className="h-5 w-5" />} title={promotions.length ? (isFr ? "Aucune promotion dans cette vue" : "No promotion in this view") : (isFr ? "Aucun code promotionnel" : "No promotion code")} description={promotions.length ? (isFr ? "Modifiez le filtre ou la recherche." : "Change the filter or search.") : (isFr ? "Créez un premier avantage avec son seuil, sa cible et son quota." : "Create a first benefit with its threshold, target and usage limit.")} />}
    </div>
  );
}

function PromotionMetric({ icon: Icon, value, label, tone }: { icon: typeof Gauge; value: number; label: string; tone: "terre" | "gold" | "burgundy" | "soft" }) {
  const styles = { terre: "bg-terre/10 text-terre", gold: "bg-gold/20 text-charcoal", burgundy: "bg-burgundy/10 text-burgundy", soft: "bg-charcoal/5 text-charcoal" };
  return <div className="min-w-0 px-2 sm:flex sm:items-center sm:gap-3 sm:px-4"><span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-md sm:grid ${styles[tone]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-lg font-black tabular-nums text-charcoal sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[8px] font-bold text-muted-foreground sm:text-[9px]">{label}</p></div></div>;
}

function PromotionRow({ promotion, lifecycle, products, categories, locale, canUpdate, canDelete, onChanged }: { promotion: Promotion; lifecycle: PromotionLifecycle; products: ProductOption[]; categories: CategoryOption[]; locale: "fr" | "en"; canUpdate: boolean; canDelete: boolean; onChanged: () => void }) {
  const isFr = locale === "fr";
  const usagePercent = promotion.usageLimit ? Math.min(100, promotion.usedCount / promotion.usageLimit * 100) : 0;
  const Icon = promotion.type === "free_shipping" ? Truck : BadgePercent;
  return (
    <article className="border-b border-charcoal/8 p-3 last:border-b-0 sm:p-4" data-testid="promotion-row">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><Icon className="h-[1.1rem] w-[1.1rem]" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black tracking-normal text-charcoal">{promotion.code}</h2><PromotionLifecycleBadge lifecycle={lifecycle} locale={locale} /></div><p className="mt-1 text-xs font-bold text-terre">{promotionRuleLabel(promotion, locale)}</p></div>
            <div className="flex shrink-0 gap-1">{canUpdate ? <PromotionEditor locale={locale} promotion={promotion} products={products} categories={categories} onSaved={onChanged} compact /> : null}{canUpdate ? <PromotionStateAction promotion={promotion} locale={locale} onChanged={onChanged} /> : null}{canDelete && promotion.usedCount === 0 ? <DeletePromotion promotion={promotion} locale={locale} onDeleted={onChanged} /> : null}</div>
          </div>
          <div className="mt-3 grid gap-3 border-t border-charcoal/8 pt-3 sm:grid-cols-[1.15fr_1fr_1fr]">
            <PromotionFact icon={Target} label={isFr ? "Cible" : "Target"} value={targetLabel(promotion, products, categories, locale)} />
            <PromotionFact icon={CalendarClock} label={isFr ? "Fenêtre" : "Window"} value={scheduleLabel(promotion, locale)} />
            <div className="min-w-0"><div className="flex items-center justify-between gap-2 text-[9px]"><span className="font-bold text-muted-foreground">{isFr ? "Consommation" : "Redemption"}</span><strong className="tabular-nums text-charcoal">{promotion.usedCount}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ` · ${isFr ? "sans quota" : "unlimited"}`}</strong></div>{promotion.usageLimit ? <span className="mt-2 block h-1.5 overflow-hidden rounded-sm bg-terre/[0.07]" aria-hidden="true"><span className="block h-full bg-burgundy" style={{ width: `${usagePercent}%` }} /></span> : <span className="mt-2 block h-1.5 rounded-sm bg-gold/25" aria-hidden="true" />}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function PromotionFact({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" /><span className="min-w-0"><span className="block text-[8px] font-black uppercase text-muted-foreground">{label}</span><strong className="mt-0.5 block truncate text-[10px] text-charcoal">{value}</strong></span></div>;
}

function PromotionLifecycleBadge({ lifecycle, locale }: { lifecycle: PromotionLifecycle; locale: "fr" | "en" }) {
  const styles: Record<PromotionLifecycle, string> = { active: "border-burgundy/25 bg-burgundy/[0.05] text-burgundy", scheduled: "border-gold/45 bg-gold/10 text-charcoal", paused: "border-charcoal/15 bg-white text-muted-foreground", expired: "border-destructive/20 bg-destructive/[0.04] text-destructive", exhausted: "border-terre/25 bg-terre/[0.05] text-terre" };
  const labels = { fr: { active: "Active", scheduled: "Planifiée", paused: "Suspendue", expired: "Terminée", exhausted: "Quota atteint" }, en: { active: "Active", scheduled: "Scheduled", paused: "Paused", expired: "Ended", exhausted: "Limit reached" } };
  return <Badge variant="outline" className={`h-5 px-1.5 text-[8px] ${styles[lifecycle]}`}>{labels[locale][lifecycle]}</Badge>;
}

type PromotionDraft = { code: string; type: PromotionType; value: string; minOrder: string; appliesTo: PromotionTarget; targetId: string; startsAt: string; endsAt: string; usageLimit: string; active: boolean };
const BLANK_PROMOTION: PromotionDraft = { code: "", type: "percent", value: "10", minOrder: "30", appliesTo: "all", targetId: "", startsAt: "", endsAt: "", usageLimit: "", active: true };

function PromotionEditor({ locale, promotion, products, categories, onSaved, compact = false }: { locale: "fr" | "en"; promotion?: Promotion; products: ProductOption[]; categories: CategoryOption[]; onSaved: () => void; compact?: boolean }) {
  const isFr = locale === "fr";
  const pristine = promotion ? promotionDraft(promotion) : BLANK_PROMOTION;
  const [open, setOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [draft, setDraft] = useState<PromotionDraft>(pristine);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(pristine);
  const dateValid = !draft.startsAt || !draft.endsAt || new Date(draft.endsAt).getTime() > new Date(draft.startsAt).getTime();
  const value = Number(draft.value);
  const valueValid = draft.type === "free_shipping" ? value === 0 : draft.type === "percent" ? value > 0 && value <= 80 : value > 0;
  const targetValid = draft.appliesTo === "all" || Boolean(draft.targetId);
  const ready = draft.code.trim().length >= 3 && valueValid && Number(draft.minOrder) >= 0 && targetValid && dateValid;
  const sampleSubtotal = Math.max(60, Number(draft.minOrder) || 0);
  const sampleBenefit = draft.type === "percent" ? sampleSubtotal * value / 100 : draft.type === "fixed" ? Math.min(sampleSubtotal, value) : 0;

  const update = <K extends keyof PromotionDraft>(key: K, next: PromotionDraft[K]) => setDraft((current) => ({ ...current, [key]: next }));
  const changeType = (type: PromotionType) => setDraft((current) => ({ ...current, type, value: type === "free_shipping" ? "0" : current.value === "0" ? "10" : current.value }));
  const changeScope = (appliesTo: PromotionTarget) => setDraft((current) => ({ ...current, appliesTo, targetId: "" }));
  const close = (nextOpen: boolean) => {
    if (saving) return;
    if (nextOpen) { setDraft(promotion ? promotionDraft(promotion) : { ...BLANK_PROMOTION }); setError(""); setOpen(true); return; }
    if (dirty) { setDiscardOpen(true); return; }
    setOpen(false);
  };
  const discard = () => { setDraft(promotion ? promotionDraft(promotion) : { ...BLANK_PROMOTION }); setError(""); setDiscardOpen(false); setOpen(false); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSaving(true); setError("");
    try {
      const payload = promotionPayload(draft);
      const response = await fetch(promotion ? `/api/admin/promotions/${promotion.id}` : "/api/admin/promotions", { method: promotion ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || (isFr ? "Enregistrement impossible." : "Unable to save."));
      setOpen(false); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isFr ? "Enregistrement impossible." : "Unable to save.")); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogTrigger asChild>{promotion ? <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label={`${isFr ? "Modifier" : "Edit"} ${promotion.code}`}><Pencil className="h-3.5 w-3.5" /></Button> : <Button type="button" size="sm" className="bg-terre text-white hover:bg-terre-dark"><TicketPercent className="mr-1.5 h-4 w-4" />{isFr ? "Nouvelle promotion" : "New promotion"}</Button>}</DialogTrigger>
        <DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-3xl" data-testid="promotion-editor">
          <form onSubmit={submit}>
            <DialogHeader className="border-b border-burgundy/10 bg-[#FFF9F5] px-5 py-5 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-md bg-terre text-white"><TicketPercent className="h-4 w-4" /></span><DialogTitle>{promotion ? (isFr ? "Modifier la promotion" : "Edit promotion") : (isFr ? "Composer une promotion" : "Compose a promotion")}</DialogTitle><DialogDescription>{isFr ? "Le code, l'avantage, la cible, le calendrier et le quota seront appliqués au panier client." : "Code, benefit, target, schedule and usage limit will apply to the customer basket."}</DialogDescription></DialogHeader>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><div><Label htmlFor="promotion-code" className="mb-1.5 block text-xs font-bold">{isFr ? "Code promotionnel" : "Promotion code"}</Label><Input id="promotion-code" value={draft.code} onChange={(event) => update("code", event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={32} placeholder="SAVEURS10" className="h-11 font-black uppercase" required /></div><label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-burgundy/15 bg-burgundy/[0.035] px-3 sm:mt-[1.55rem]"><span className="text-xs font-bold text-charcoal">{isFr ? "Disponible" : "Available"}</span><Switch checked={draft.active} onCheckedChange={(checked) => update("active", checked)} aria-label={isFr ? "Rendre la promotion disponible" : "Make promotion available"} /></label></div>

              <div><p className="mb-2 text-xs font-bold text-charcoal">{isFr ? "Avantage accordé" : "Customer benefit"}</p><div className="grid grid-cols-3 overflow-hidden rounded-md border border-burgundy/15" role="group" aria-label={isFr ? "Type de promotion" : "Promotion type"}>{(["percent", "fixed", "free_shipping"] as const).map((type, index) => <button key={type} type="button" onClick={() => changeType(type)} aria-pressed={draft.type === type} className={`min-h-12 px-2 text-[10px] font-black transition ${index ? "border-l border-burgundy/15" : ""} ${draft.type === type ? "bg-burgundy text-white" : "bg-white text-charcoal hover:bg-burgundy/[0.04]"}`}>{type === "percent" ? (isFr ? "Pourcentage" : "Percentage") : type === "fixed" ? (isFr ? "Montant fixe" : "Fixed amount") : (isFr ? "Livraison offerte" : "Free shipping")}</button>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><PromotionField label={draft.type === "percent" ? (isFr ? "Pourcentage (%)" : "Percentage (%)") : (isFr ? "Valeur (€)" : "Value (€)")}><Input type="number" inputMode="decimal" min={draft.type === "free_shipping" ? 0 : 0.01} max={draft.type === "percent" ? 80 : 10000} step="0.01" value={draft.value} onChange={(event) => update("value", event.target.value)} disabled={draft.type === "free_shipping"} /></PromotionField><PromotionField label={isFr ? "Panier minimum (€)" : "Minimum basket (€)"}><Input type="number" inputMode="decimal" min="0" max="1000000" step="0.01" value={draft.minOrder} onChange={(event) => update("minOrder", event.target.value)} /></PromotionField></div></div>

              <div className="grid gap-4 sm:grid-cols-2"><PromotionField label={isFr ? "Périmètre" : "Scope"}><select value={draft.appliesTo} onChange={(event) => changeScope(event.target.value as PromotionTarget)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">{isFr ? "Tout le panier" : "Whole basket"}</option><option value="country">{isFr ? "Pays de livraison" : "Delivery country"}</option><option value="category">{isFr ? "Famille de produits" : "Product family"}</option><option value="product">{isFr ? "Produit précis" : "Specific product"}</option></select></PromotionField><PromotionField label={isFr ? "Cible" : "Target"}><PromotionTargetSelect draft={draft} locale={locale} products={products} categories={categories} onChange={(targetId) => update("targetId", targetId)} /></PromotionField></div>

              <div className="grid gap-4 border-y border-charcoal/8 py-4 sm:grid-cols-3"><PromotionField label={isFr ? "Début" : "Starts"}><Input type="datetime-local" value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></PromotionField><PromotionField label={isFr ? "Fin" : "Ends"}><Input type="datetime-local" value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></PromotionField><PromotionField label={isFr ? "Quota d'utilisations" : "Usage limit"}><Input type="number" min="1" max="1000000" value={draft.usageLimit} onChange={(event) => update("usageLimit", event.target.value)} placeholder={isFr ? "Sans limite" : "Unlimited"} /></PromotionField></div>
              {!dateValid ? <p role="alert" className="border-y border-destructive/20 bg-destructive/[0.05] px-3 py-2 text-xs font-semibold text-destructive">{isFr ? "La date de fin doit être postérieure à la date de début." : "The end date must be later than the start date."}</p> : null}

              <section className="overflow-hidden rounded-lg border border-terre/15 bg-[#FFF9F5]" aria-label={isFr ? "Aperçu de la promotion" : "Promotion preview"}><div className="flex items-start gap-3 px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre text-white">{draft.type === "free_shipping" ? <Truck className="h-4 w-4" /> : <BadgePercent className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Reflet du panier client" : "Customer basket preview"}</p><p className="mt-0.5 text-sm font-black text-charcoal">{draft.code || (isFr ? "Votre code" : "Your code")}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{draft.type === "free_shipping" ? (isFr ? `Livraison offerte dès ${formatPrice(Number(draft.minOrder) || 0, locale)}.` : `Free shipping from ${formatPrice(Number(draft.minOrder) || 0, locale)}.`) : (isFr ? `${formatPrice(sampleBenefit, locale)} de remise sur un exemple admissible de ${formatPrice(sampleSubtotal, locale)}.` : `${formatPrice(sampleBenefit, locale)} off an eligible ${formatPrice(sampleSubtotal, locale)} example.`)}</p></div></div></section>
              {error ? <p role="alert" className="border-y border-destructive/20 bg-destructive/[0.05] px-3 py-2 text-xs text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="border-t border-burgundy/10 px-5 py-4 sm:px-6"><Button type="button" variant="outline" onClick={() => close(false)}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={!ready || saving} className="bg-terre text-white hover:bg-terre-dark">{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer" : "Save"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isFr ? "Abandonner cette promotion ?" : "Discard this promotion?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "Le code, l'avantage, la cible, le calendrier et le quota non enregistrés seront perdus. La promotion actuellement publiée restera inchangée." : "Unsaved code, benefit, target, schedule and limit will be lost. The published promotion will remain unchanged."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isFr ? "Continuer l'édition" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={discard} className="bg-destructive text-white hover:bg-destructive/90">{isFr ? "Oui, abandonner" : "Yes, discard"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

function PromotionTargetSelect({ draft, locale, products, categories, onChange }: { draft: PromotionDraft; locale: "fr" | "en"; products: ProductOption[]; categories: CategoryOption[]; onChange: (targetId: string) => void }) {
  const isFr = locale === "fr";
  if (draft.appliesTo === "all") return <div className="flex h-10 items-center rounded-md border border-charcoal/8 bg-charcoal/[0.025] px-3 text-xs text-muted-foreground">{isFr ? "Aucune restriction" : "No restriction"}</div>;
  if (draft.appliesTo === "country") return <select value={draft.targetId} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" aria-label={isFr ? "Pays ciblé" : "Target country"}><option value="">{isFr ? "Choisir un pays" : "Choose a country"}</option>{europeanCountryOptions(locale).map((country) => <option key={country.code} value={country.value}>{country.label}</option>)}</select>;
  if (draft.appliesTo === "category") return <select value={draft.targetId} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" aria-label={isFr ? "Famille ciblée" : "Target family"}><option value="">{isFr ? "Choisir une famille" : "Choose a family"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>;
  return <select value={draft.targetId} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" aria-label={isFr ? "Produit ciblé" : "Target product"}><option value="">{isFr ? "Choisir un produit" : "Choose a product"}</option>{products.map((product) => <option key={product.id} value={product.id}>{locale === "fr" ? product.nameFr || product.name : product.nameEn || product.name}</option>)}</select>;
}

function PromotionField({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-1.5"><span className="block text-xs font-bold text-charcoal">{label}</span>{children}</Label>;
}

function PromotionStateAction({ promotion, locale, onChanged }: { promotion: Promotion; locale: "fr" | "en"; onChanged: () => void }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nextActive = !promotion.active;
  const submit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(promotionPayload({ ...promotionDraft(promotion), active: nextActive })) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || (isFr ? "Action impossible." : "Action failed."));
      setOpen(false); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isFr ? "Action impossible." : "Action failed.")); }
    finally { setBusy(false); }
  };
  const Icon = nextActive ? PlayCircle : PauseCircle;
  return <div><AlertDialog open={open} onOpenChange={(nextOpen) => { if (!busy) { setOpen(nextOpen); if (nextOpen) setError(""); } }}><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-burgundy" aria-label={`${nextActive ? (isFr ? "Activer" : "Activate") : (isFr ? "Suspendre" : "Pause")} ${promotion.code}`}><Icon className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-burgundy/10 text-burgundy"><Icon className="h-5 w-5" /></span><AlertDialogTitle>{nextActive ? (isFr ? "Activer cette promotion ?" : "Activate this promotion?") : (isFr ? "Suspendre immédiatement cette promotion ?" : "Pause this promotion now?")}</AlertDialogTitle><AlertDialogDescription>{nextActive ? (isFr ? `Le code ${promotion.code} redeviendra utilisable si son calendrier, sa cible et son quota le permettent.` : `${promotion.code} will become usable again when its schedule, target and usage limit allow it.`) : (isFr ? `Le code ${promotion.code} sera refusé dans le panier et au paiement. Les utilisations passées resteront conservées.` : `${promotion.code} will be rejected in basket and payment. Past redemptions will remain recorded.`)}</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver l'état" : "Keep current state"}</AlertDialogCancel><AlertDialogAction onClick={(event) => void submit(event)} disabled={busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}{nextActive ? (isFr ? "Oui, activer" : "Yes, activate") : (isFr ? "Oui, suspendre" : "Yes, pause")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}

function DeletePromotion({ promotion, locale, onDeleted }: { promotion: Promotion; locale: "fr" | "en"; onDeleted: () => void }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || (isFr ? "Suppression impossible." : "Unable to delete."));
      setOpen(false); onDeleted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isFr ? "Suppression impossible." : "Unable to delete.")); }
    finally { setBusy(false); }
  };
  return <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!busy) { setOpen(nextOpen); if (nextOpen) setError(""); } }}><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={`${isFr ? "Supprimer" : "Delete"} ${promotion.code}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isFr ? "Supprimer définitivement ce code ?" : "Delete this code permanently?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? `${promotion.code} n'a jamais été utilisé. Il disparaîtra du registre et cette suppression sera consignée dans l'audit.` : `${promotion.code} has never been used. It will leave the register and the deletion will be recorded in the audit log.`}</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={(event) => void remove(event)} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isFr ? "Oui, supprimer" : "Yes, delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function promotionDraft(promotion: Promotion): PromotionDraft {
  return { code: promotion.code, type: promotion.type, value: String(promotion.value), minOrder: String(promotion.minOrder), appliesTo: promotion.appliesTo, targetId: promotion.targetId || "", startsAt: localDate(promotion.startsAt), endsAt: localDate(promotion.endsAt), usageLimit: promotion.usageLimit ? String(promotion.usageLimit) : "", active: promotion.active };
}

function promotionPayload(draft: PromotionDraft) {
  return { code: draft.code, type: draft.type, value: draft.type === "free_shipping" ? 0 : Number(draft.value), minOrder: Number(draft.minOrder), appliesTo: draft.appliesTo, targetId: draft.appliesTo === "all" ? null : draft.targetId, startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null, endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null, usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null, active: draft.active };
}

function promotionRuleLabel(promotion: Pick<Promotion, "type" | "value" | "minOrder">, locale: "fr" | "en") {
  const benefit = promotion.type === "percent" ? `-${Number(promotion.value).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} %` : promotion.type === "fixed" ? `-${formatPrice(Number(promotion.value), locale)}` : (locale === "fr" ? "Livraison offerte" : "Free shipping");
  return `${benefit} · ${locale === "fr" ? "dès" : "from"} ${formatPrice(Number(promotion.minOrder), locale)}`;
}

function targetLabel(promotion: Pick<Promotion, "appliesTo" | "targetId">, products: ProductOption[], categories: CategoryOption[], locale: "fr" | "en") {
  if (promotion.appliesTo === "all") return locale === "fr" ? "Tout le panier" : "Whole basket";
  if (promotion.appliesTo === "country") return europeanCountryLabel(promotion.targetId, locale);
  if (promotion.appliesTo === "category") return categories.find((category) => category.id === promotion.targetId)?.name || promotion.targetId || "-";
  const product = products.find((item) => item.id === promotion.targetId);
  return (locale === "fr" ? product?.nameFr : product?.nameEn) || product?.name || promotion.targetId || "-";
}

function scheduleLabel(promotion: Promotion, locale: "fr" | "en") {
  if (!promotion.startsAt && !promotion.endsAt) return locale === "fr" ? "Sans limite de date" : "No date limit";
  const start = promotion.startsAt ? formatDateTime(promotion.startsAt, locale) : (locale === "fr" ? "Maintenant" : "Now");
  const end = promotion.endsAt ? formatDateTime(promotion.endsAt, locale) : (locale === "fr" ? "Sans fin" : "No end");
  return `${start} → ${end}`;
}

function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : "";
}
