"use client";

import { useState } from "react";
import Image from "next/image";
import { BellRing, Check, CheckCircle2, CircleDashed, Globe2, History, Languages, LoaderCircle, Send, Smartphone, Target, TrendingUp, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import { aggregatePushDelivery, pushCampaignReadiness, pushDeliveryPerformance, type PushAudience, type PushAudienceCounts } from "@/lib/push-audience";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RecentPushCampaign = {
  id: string;
  titleFr: string;
  bodyFr: string;
  sent: boolean;
  createdAt: string;
  type: string;
  url: string;
  audience: PushAudience;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
};

type PushDashboard = {
  activeSubscriptions: number;
  configured: boolean;
  audiences: PushAudienceCounts;
  recent: RecentPushCampaign[];
};

type CampaignDraft = {
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  type: "system" | "promotion" | "recipe";
  url: "/" | "/?view=catalog" | "/?view=recipes" | "/?view=orders";
  audience: PushAudience;
};

const initialCampaign: CampaignDraft = {
  titleFr: "",
  titleEn: "",
  bodyFr: "",
  bodyEn: "",
  type: "system",
  url: "/",
  audience: "all",
};

export function PushCampaignAdmin({ locale }: { locale: "fr" | "en" }) {
  const { data, loading, refetch } = useFetch<PushDashboard>("/api/admin/push");
  const [campaign, setCampaign] = useState(initialCampaign);
  const [editorLocale, setEditorLocale] = useState<"fr" | "en">(locale);
  const [previewLocale, setPreviewLocale] = useState<"fr" | "en">(locale);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const sendCampaign = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Envoi impossible");
      const deliveryMessage = payload.delivery.failed > 0
        ? (locale === "fr" ? `${payload.delivery.sent} envoyé(s), ${payload.delivery.failed} en échec.` : `${payload.delivery.sent} sent, ${payload.delivery.failed} failed.`)
        : (locale === "fr" ? `${payload.delivery.sent} appareil(s) notifié(s).` : `${payload.delivery.sent} device(s) notified.`);
      setResult({ type: "success", message: deliveryMessage });
      setCampaign(initialCampaign);
      setEditorLocale(locale);
      setPreviewLocale(locale);
      refetch();
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "Envoi impossible" });
    } finally {
      setSending(false);
    }
  };

  const destinations = [
    { value: "/", label: locale === "fr" ? "Accueil client" : "Customer home" },
    { value: "/?view=catalog", label: locale === "fr" ? "Catalogue" : "Catalog" },
    { value: "/?view=recipes", label: locale === "fr" ? "Recettes" : "Recipes" },
    { value: "/?view=orders", label: locale === "fr" ? "Suivi des commandes" : "Order tracking" },
  ];
  const destinationLabel = (url: string) => destinations.find((destination) => destination.value === url)?.label || (locale === "fr" ? "Lien personnalisé" : "Custom link");
  const audienceOptions: Array<{ value: PushAudience; label: string; description: string }> = [
    { value: "all", label: locale === "fr" ? "Tous les appareils" : "All devices", description: locale === "fr" ? "Clients et visiteurs" : "Customers and visitors" },
    { value: "signed_in", label: locale === "fr" ? "Clients connectés" : "Signed-in customers", description: locale === "fr" ? "Compte identifié" : "Identified account" },
    { value: "guests", label: locale === "fr" ? "Visiteurs" : "Visitors", description: locale === "fr" ? "Sans compte associé" : "No linked account" },
    { value: "ambassador", label: locale === "fr" ? "Ambassadeurs" : "Ambassadors", description: locale === "fr" ? "Forte valeur ou fidélité" : "High value or loyalty" },
    { value: "active", label: locale === "fr" ? "Clients actifs" : "Active customers", description: locale === "fr" ? "Achat récent" : "Recent purchase" },
    { value: "at_risk", label: locale === "fr" ? "À relancer" : "Re-engage", description: locale === "fr" ? "Inactifs depuis 60 jours" : "Inactive for 60 days" },
    { value: "new", label: locale === "fr" ? "À activer" : "To activate", description: locale === "fr" ? "Aucun achat" : "No purchase yet" },
  ];
  const selectedAudience = audienceOptions.find((audience) => audience.value === campaign.audience) || audienceOptions[0];
  const audienceCount = data?.audiences?.[campaign.audience] ?? (campaign.audience === "all" ? data?.activeSubscriptions : 0) ?? 0;
  const previewTitle = previewLocale === "fr" ? campaign.titleFr : campaign.titleEn;
  const previewBody = previewLocale === "fr" ? campaign.bodyFr : campaign.bodyEn;
  const localeReady = {
    fr: campaign.titleFr.trim().length >= 3 && campaign.bodyFr.trim().length >= 8,
    en: campaign.titleEn.trim().length >= 3 && campaign.bodyEn.trim().length >= 8,
  };
  const readiness = pushCampaignReadiness(campaign, audienceCount, data?.configured === true);
  const recentPerformance = aggregatePushDelivery(data?.recent || []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="flow"
        accent="#F2A900"
        icon={<BellRing className="h-5 w-5" />}
        eyebrow={locale === "fr" ? "Engagement mobile" : "Mobile engagement"}
        title={locale === "fr" ? "Composer, vérifier, diffuser" : "Compose, verify, deliver"}
        description={locale === "fr" ? "Préparez un message bilingue, contrôlez son rendu mobile et confirmez explicitement la diffusion vers les appareils abonnés." : "Prepare a bilingual message, review its mobile rendering and explicitly confirm delivery to subscribed devices."}
        action={<Badge variant="outline" className="h-9 border-burgundy/30 bg-burgundy/5 px-3 text-burgundy"><Smartphone className="mr-1.5 h-3.5 w-3.5" /> {loading ? "…" : data?.activeSubscriptions || 0} {locale === "fr" ? "appareils joignables" : "reachable devices"}</Badge>}
      />

      <CampaignReadiness readiness={readiness} locale={locale} />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0">
          <section className="border-y border-charcoal/8 bg-white px-4 py-5 sm:px-5" aria-labelledby="campaign-message-title">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-terre text-white"><Globe2 className="h-4 w-4" /></span><div><h3 id="campaign-message-title" className="text-sm font-black text-charcoal">{locale === "fr" ? "Message bilingue" : "Bilingual message"}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Les deux versions sont obligatoires avant diffusion." : "Both versions are required before delivery."}</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/45 p-1 sm:hidden" role="tablist" aria-label={locale === "fr" ? "Langue du message" : "Message language"}>
              {(["fr", "en"] as const).map((language) => (
                <button key={language} type="button" role="tab" aria-selected={editorLocale === language} aria-controls={`campaign-language-${language}`} onClick={() => setEditorLocale(language)} className={`flex h-10 items-center justify-center gap-2 rounded-md text-xs font-black transition ${editorLocale === language ? "bg-terre text-white shadow-sm" : "text-muted-foreground"}`}>
                  <span>{language.toUpperCase()}</span>
                  <span className="font-semibold">{language === "fr" ? "Français" : "English"}</span>
                  {localeReady[language] ? <span title={locale === "fr" ? "Version complète" : "Version complete"} className={`grid h-4 w-4 place-items-center rounded-full ${editorLocale === language ? "bg-gold text-charcoal" : "bg-burgundy text-white"}`}><Check className="h-2.5 w-2.5" /></span> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-terre/55" />}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-0">
              <div id="campaign-language-fr" role="tabpanel" aria-label={locale === "fr" ? "Version française" : "French version"} className={`${editorLocale === "fr" ? "space-y-4" : "hidden"} sm:block sm:space-y-4 sm:pr-5`}>
                <p className="hidden items-center gap-2 text-[10px] font-black uppercase text-terre sm:flex"><span className="grid h-5 min-w-6 place-items-center rounded bg-terre/10 px-1">FR</span> Français</p>
                <CampaignField id="push-title-fr" label="Titre français" value={campaign.titleFr} maxLength={80} onChange={(titleFr) => setCampaign({ ...campaign, titleFr })} />
                <CampaignField id="push-body-fr" label="Message français" value={campaign.bodyFr} maxLength={220} multiline onChange={(bodyFr) => setCampaign({ ...campaign, bodyFr })} />
              </div>
              <div id="campaign-language-en" role="tabpanel" aria-label={locale === "fr" ? "Version anglaise" : "English version"} className={`${editorLocale === "en" ? "space-y-4" : "hidden"} sm:block sm:space-y-4 sm:border-l sm:border-border sm:pl-5`}>
                <p className="hidden items-center gap-2 text-[10px] font-black uppercase text-burgundy sm:flex"><span className="grid h-5 min-w-6 place-items-center rounded bg-burgundy/10 px-1">EN</span> English</p>
                <CampaignField id="push-title-en" label="English title" value={campaign.titleEn} maxLength={80} onChange={(titleEn) => setCampaign({ ...campaign, titleEn })} />
                <CampaignField id="push-body-en" label="English message" value={campaign.bodyEn} maxLength={220} multiline onChange={(bodyEn) => setCampaign({ ...campaign, bodyEn })} />
              </div>
            </div>
          </section>

          <section className="mt-5 border-y border-charcoal/8 bg-white px-4 py-5 sm:px-5" aria-labelledby="campaign-routing-title">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-burgundy text-white"><Target className="h-4 w-4" /></span><div><h3 id="campaign-routing-title" className="text-sm font-black text-charcoal">{locale === "fr" ? "Audience et destination" : "Audience and destination"}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Chaque appareil reçoit la bonne langue et ouvre directement l’espace choisi." : "Each device receives the right language and opens the selected destination."}</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="push-audience">{locale === "fr" ? "Audience" : "Audience"}</Label><select id="push-audience" value={campaign.audience} onChange={(event) => setCampaign({ ...campaign, audience: event.target.value as PushAudience })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{audienceOptions.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}</select><p className="text-[9px] leading-4 text-muted-foreground">{selectedAudience.description}</p></div>
              <div className="space-y-2"><Label htmlFor="push-type">Type</Label><select id="push-type" value={campaign.type} onChange={(event) => setCampaign({ ...campaign, type: event.target.value as CampaignDraft["type"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="system">Information</option><option value="promotion">Promotion</option><option value="recipe">{locale === "fr" ? "Recette" : "Recipe"}</option></select></div>
              <div className="space-y-2"><Label htmlFor="push-url">Destination</Label><select id="push-url" value={campaign.url} onChange={(event) => setCampaign({ ...campaign, url: event.target.value as CampaignDraft["url"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{destinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select></div>
            </div>

            <div className="mt-4 flex items-center gap-3 border-y border-charcoal/8 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-charcoal/5 text-charcoal"><UsersRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black text-charcoal">{audienceCount.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} {locale === "fr" ? "appareil(s) ciblé(s)" : "targeted device(s)"}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{selectedAudience.label} · {destinationLabel(campaign.url)}</p></div></div>

            <AlertDialog>
              <AlertDialogTrigger asChild><Button disabled={!readiness.ready || sending} className="mt-5 h-11 w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">{sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{sending ? (locale === "fr" ? "Diffusion..." : "Delivering...") : (locale === "fr" ? "Vérifier puis diffuser" : "Review and deliver")}</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{locale === "fr" ? "Diffuser cette campagne maintenant ?" : "Deliver this campaign now?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? `Le message sera envoyé aux ${audienceCount} appareil(s) de l’audience « ${selectedAudience.label} ». Chaque appareil recevra automatiquement la version française ou anglaise.` : `The message will be sent to ${audienceCount} device(s) in “${selectedAudience.label}”. Each device automatically receives the French or English version.`}</AlertDialogDescription></AlertDialogHeader>
                <div className="border-y border-border bg-muted/45 px-3 py-3 text-xs"><p className="font-black text-charcoal">{campaign.titleFr}</p><p className="mt-1 leading-5 text-muted-foreground">{campaign.bodyFr}</p></div>
                <AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Revenir à l'édition" : "Return to editing"}</AlertDialogCancel><AlertDialogAction onClick={sendCampaign} className="bg-terre text-white hover:bg-terre-dark"><Send className="mr-2 h-4 w-4" /> {locale === "fr" ? "Confirmer la diffusion" : "Confirm delivery"}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {result ? <p role={result.type === "error" ? "alert" : "status"} className={`mt-3 border-y px-3 py-3 text-xs ${result.type === "success" ? "border-burgundy/25 bg-burgundy/5 text-burgundy" : "border-destructive/25 bg-destructive/[0.06] text-destructive"}`}>{result.message}</p> : null}
          </section>
        </div>

        <aside className="h-fit border-y border-charcoal/8 bg-white px-4 py-5 sm:px-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-terre">{locale === "fr" ? "Aperçu appareil" : "Device preview"}</p><h3 className="mt-1 text-sm font-black text-charcoal">Notification mobile</h3></div><div className="inline-flex rounded-md border border-burgundy/15 bg-burgundy/5 p-1" aria-label={locale === "fr" ? "Langue de l’aperçu" : "Preview language"}>{(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => setPreviewLocale(language)} aria-pressed={previewLocale === language} className={`h-7 rounded px-2 text-[9px] font-black uppercase transition ${previewLocale === language ? "bg-burgundy text-white shadow-sm" : "text-burgundy"}`}>{language}</button>)}</div></div>
          <div className="mx-auto mt-4 max-w-[19rem] rounded-[1.75rem] border-[5px] border-burgundy/30 bg-[#F7F1EE] px-3 pb-12 pt-6 shadow-[0_18px_40px_rgba(90,38,50,0.12)]">
            <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-burgundy/65" />
            <div className="flex gap-3 rounded-lg border border-burgundy/10 bg-white p-3 text-charcoal shadow-[0_10px_24px_rgba(90,38,50,0.10)]">
              <Image src="/brand/notification-icon-burgundy.png" alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><div className="flex items-start gap-2"><p className="flex-1 truncate text-xs font-extrabold">{previewTitle || "Je mange Africain"}</p><span className="text-[9px] text-muted-foreground">{previewLocale === "fr" ? "maintenant" : "now"}</span></div><p className="mt-1 break-words text-[11px] leading-5 text-muted-foreground">{previewBody || (previewLocale === "fr" ? "Votre message apparaîtra ici avant toute diffusion." : "Your message will appear here before delivery.")}</p></div>
            </div>
          </div>
          <CampaignHistory campaigns={data?.recent || []} performance={recentPerformance} destinationLabel={destinationLabel} locale={locale} />
        </aside>
      </div>
    </div>
  );
}

function CampaignReadiness({ readiness, locale }: { readiness: ReturnType<typeof pushCampaignReadiness>; locale: "fr" | "en" }) {
  const items: Array<{ key: keyof typeof readiness.checks; label: string }> = [
    { key: "french", label: locale === "fr" ? "Message français" : "French message" },
    { key: "english", label: locale === "fr" ? "Message anglais" : "English message" },
    { key: "audience", label: locale === "fr" ? "Audience joignable" : "Reachable audience" },
    { key: "channel", label: locale === "fr" ? "Canal push actif" : "Push channel active" },
  ];

  return (
    <section className="border-y border-burgundy/15 bg-white px-4 py-4 sm:px-5" aria-labelledby="campaign-readiness-title" data-testid="campaign-readiness">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${readiness.ready ? "bg-burgundy text-white" : "bg-gold/20 text-terre"}`}>
            {readiness.ready ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
          </span>
          <div>
            <h2 id="campaign-readiness-title" className="text-sm font-black text-charcoal">{locale === "fr" ? "Préparation de la diffusion" : "Delivery readiness"}</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{readiness.ready ? (locale === "fr" ? "La campagne peut être vérifiée avant envoi." : "The campaign can be reviewed before delivery.") : (locale === "fr" ? "Complétez les contrôles manquants avant l’envoi." : "Complete the missing checks before delivery.")}</p>
          </div>
        </div>
        <p className="text-xs font-black text-burgundy">{readiness.completed} {locale === "fr" ? "contrôles sur" : "checks out of"} {readiness.total}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 items-center gap-2 text-[10px] font-bold">
            {readiness.checks[item.key] ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-burgundy" /> : <CircleDashed className="h-3.5 w-3.5 shrink-0 text-terre/55" />}
            <span className={readiness.checks[item.key] ? "text-charcoal" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-burgundy/10" role="progressbar" aria-label={locale === "fr" ? "Progression de la préparation" : "Readiness progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.percentage}>
        <span className="block h-full rounded-full bg-terre transition-[width] duration-300" style={{ width: `${readiness.percentage}%` }} />
      </div>
    </section>
  );
}

function CampaignHistory({ campaigns, performance, destinationLabel, locale }: { campaigns: RecentPushCampaign[]; performance: ReturnType<typeof aggregatePushDelivery>; destinationLabel: (url: string) => string; locale: "fr" | "en" }) {
  const numberLocale = locale === "fr" ? "fr-FR" : "en-GB";

  return (
    <section className="mt-5 border-t border-burgundy/15 pt-4" aria-labelledby="campaign-history-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><History className="h-4 w-4 text-terre" /><h3 id="campaign-history-title" className="text-xs font-black text-charcoal">{locale === "fr" ? "Résultats récents" : "Recent results"}</h3></div>
        <span className="text-[9px] font-black uppercase text-burgundy">{campaigns.length} {locale === "fr" ? "campagne(s)" : "campaign(s)"}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-burgundy/10 border-y border-burgundy/10 py-3 text-center">
        <CampaignMetric value={`${performance.deliveryRate.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} %`} label={locale === "fr" ? "Délivrance" : "Delivery"} />
        <CampaignMetric value={performance.delivered.toLocaleString(numberLocale)} label={locale === "fr" ? "Remis" : "Delivered"} />
        <CampaignMetric value={performance.failed.toLocaleString(numberLocale)} label={locale === "fr" ? "Échecs" : "Failed"} />
      </div>

      <div className="divide-y divide-burgundy/10">
        {campaigns.length ? campaigns.slice(0, 5).map((item) => {
          const itemPerformance = pushDeliveryPerformance(item);
          const stateLabel = {
            delivered: locale === "fr" ? "Remise complète" : "Fully delivered",
            partial: locale === "fr" ? "Remise partielle" : "Partially delivered",
            failed: locale === "fr" ? "Échec" : "Failed",
            not_sent: locale === "fr" ? "Non diffusée" : "Not delivered",
            empty: locale === "fr" ? "Sans destinataire" : "No recipients",
          }[itemPerformance.state];
          const stateClass = itemPerformance.state === "delivered"
            ? "border-burgundy/20 bg-burgundy/5 text-burgundy"
            : itemPerformance.state === "partial"
              ? "border-gold/35 bg-gold/10 text-terre-dark"
              : "border-destructive/20 bg-destructive/[0.05] text-destructive";

          return (
            <article key={item.id} className="py-3" data-testid="push-history-row">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gold/15 text-terre"><BellRing className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 truncate text-[11px] font-black text-charcoal">{item.titleFr}</p>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase ${stateClass}`}>{stateLabel}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.bodyFr}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold text-burgundy">
                    <span className="inline-flex items-center gap-1"><Target className="h-2.5 w-2.5" />{destinationLabel(item.url)}</span>
                    <span className="inline-flex items-center gap-1"><Languages className="h-2.5 w-2.5" />FR/EN</span>
                    <span className="inline-flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />{itemPerformance.deliveryRate.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} %</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-burgundy/10" aria-hidden="true"><span className="block h-full rounded-full bg-terre" style={{ width: `${itemPerformance.deliveryRate}%` }} /></div>
                    <span className="shrink-0 text-[9px] text-muted-foreground">{itemPerformance.delivered.toLocaleString(numberLocale)}/{itemPerformance.recipients.toLocaleString(numberLocale)}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : <p className="py-5 text-center text-[10px] text-muted-foreground">{locale === "fr" ? "Aucune campagne diffusée" : "No campaigns delivered yet"}</p>}
      </div>
    </section>
  );
}

function CampaignMetric({ value, label }: { value: string; label: string }) {
  return <div className="px-2"><p className="text-sm font-black text-charcoal">{value}</p><p className="mt-0.5 text-[8px] font-bold uppercase text-muted-foreground">{label}</p></div>;
}

function CampaignField({ id, label, value, onChange, maxLength, multiline = false }: { id: string; label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><span className="text-[10px] text-muted-foreground">{value.length}/{maxLength}</span></div>
      {multiline ? <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} className="min-h-24 resize-none" /> : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} />}
    </div>
  );
}
