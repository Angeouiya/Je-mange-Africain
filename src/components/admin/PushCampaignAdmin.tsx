"use client";

import { useState } from "react";
import Image from "next/image";
import { BellRing, Globe2, History, Languages, LoaderCircle, Send, Smartphone, Target, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import type { PushAudience, PushAudienceCounts } from "@/lib/push-audience";
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

type PushDashboard = {
  activeSubscriptions: number;
  audiences: PushAudienceCounts;
  recent: Array<{ id: string; titleFr: string; bodyFr: string; sent: boolean; createdAt: string; type: string; url: string; audience: PushAudience; recipientCount: number; deliveredCount: number; failedCount: number }>;
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
      refetch();
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "Envoi impossible" });
    } finally {
      setSending(false);
    }
  };

  const valid = campaign.titleFr.trim().length >= 3 && campaign.titleEn.trim().length >= 3 && campaign.bodyFr.trim().length >= 8 && campaign.bodyEn.trim().length >= 8;
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="flow"
        accent="#925018"
        icon={<BellRing className="h-5 w-5" />}
        eyebrow={locale === "fr" ? "Engagement mobile" : "Mobile engagement"}
        title={locale === "fr" ? "Composer, vérifier, diffuser" : "Compose, verify, deliver"}
        description={locale === "fr" ? "Préparez un message bilingue, contrôlez son rendu mobile et confirmez explicitement la diffusion vers les appareils abonnés." : "Prepare a bilingual message, review its mobile rendering and explicitly confirm delivery to subscribed devices."}
        action={<Badge variant="outline" className="h-9 border-forest/30 bg-forest/5 px-3 text-forest"><Smartphone className="mr-1.5 h-3.5 w-3.5" /> {loading ? "…" : data?.activeSubscriptions || 0} {locale === "fr" ? "appareils joignables" : "reachable devices"}</Badge>}
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0">
          <section className="border-y border-black/8 bg-white px-4 py-5 sm:px-5" aria-labelledby="campaign-message-title">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-terre text-white"><Globe2 className="h-4 w-4" /></span><div><h3 id="campaign-message-title" className="text-sm font-black text-charcoal">{locale === "fr" ? "Message bilingue" : "Bilingual message"}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Les deux versions sont obligatoires avant diffusion." : "Both versions are required before delivery."}</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <CampaignField id="push-title-fr" label="Titre français" value={campaign.titleFr} maxLength={80} onChange={(titleFr) => setCampaign({ ...campaign, titleFr })} />
              <CampaignField id="push-title-en" label="English title" value={campaign.titleEn} maxLength={80} onChange={(titleEn) => setCampaign({ ...campaign, titleEn })} />
              <CampaignField id="push-body-fr" label="Message français" value={campaign.bodyFr} maxLength={220} multiline onChange={(bodyFr) => setCampaign({ ...campaign, bodyFr })} />
              <CampaignField id="push-body-en" label="English message" value={campaign.bodyEn} maxLength={220} multiline onChange={(bodyEn) => setCampaign({ ...campaign, bodyEn })} />
            </div>
          </section>

          <section className="mt-5 border-y border-black/8 bg-white px-4 py-5 sm:px-5" aria-labelledby="campaign-routing-title">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-forest text-white"><Target className="h-4 w-4" /></span><div><h3 id="campaign-routing-title" className="text-sm font-black text-charcoal">{locale === "fr" ? "Audience et destination" : "Audience and destination"}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Chaque appareil reçoit la bonne langue et ouvre directement l’espace choisi." : "Each device receives the right language and opens the selected destination."}</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="push-audience">{locale === "fr" ? "Audience" : "Audience"}</Label><select id="push-audience" value={campaign.audience} onChange={(event) => setCampaign({ ...campaign, audience: event.target.value as PushAudience })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{audienceOptions.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}</select><p className="text-[9px] leading-4 text-muted-foreground">{selectedAudience.description}</p></div>
              <div className="space-y-2"><Label htmlFor="push-type">Type</Label><select id="push-type" value={campaign.type} onChange={(event) => setCampaign({ ...campaign, type: event.target.value as CampaignDraft["type"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="system">Information</option><option value="promotion">Promotion</option><option value="recipe">{locale === "fr" ? "Recette" : "Recipe"}</option></select></div>
              <div className="space-y-2"><Label htmlFor="push-url">Destination</Label><select id="push-url" value={campaign.url} onChange={(event) => setCampaign({ ...campaign, url: event.target.value as CampaignDraft["url"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{destinations.map((destination) => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select></div>
            </div>

            <div className="mt-4 flex items-center gap-3 border-y border-black/8 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-charcoal/5 text-charcoal"><UsersRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black text-charcoal">{audienceCount.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} {locale === "fr" ? "appareil(s) ciblé(s)" : "targeted device(s)"}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{selectedAudience.label} · {destinationLabel(campaign.url)}</p></div></div>

            <AlertDialog>
              <AlertDialogTrigger asChild><Button disabled={!valid || sending} className="mt-5 h-11 w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">{sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{sending ? (locale === "fr" ? "Diffusion..." : "Delivering...") : (locale === "fr" ? "Vérifier puis diffuser" : "Review and deliver")}</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{locale === "fr" ? "Diffuser cette campagne maintenant ?" : "Deliver this campaign now?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? `Le message sera envoyé aux ${audienceCount} appareil(s) de l’audience « ${selectedAudience.label} ». Chaque appareil recevra automatiquement la version française ou anglaise.` : `The message will be sent to ${audienceCount} device(s) in “${selectedAudience.label}”. Each device automatically receives the French or English version.`}</AlertDialogDescription></AlertDialogHeader>
                <div className="border-y border-border bg-muted/45 px-3 py-3 text-xs"><p className="font-black text-charcoal">{campaign.titleFr}</p><p className="mt-1 leading-5 text-muted-foreground">{campaign.bodyFr}</p></div>
                <AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Revenir à l'édition" : "Return to editing"}</AlertDialogCancel><AlertDialogAction onClick={sendCampaign} className="bg-terre text-white hover:bg-terre-dark"><Send className="mr-2 h-4 w-4" /> {locale === "fr" ? "Confirmer la diffusion" : "Confirm delivery"}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {result ? <p role={result.type === "error" ? "alert" : "status"} className={`mt-3 border-y px-3 py-3 text-xs ${result.type === "success" ? "border-forest/25 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{result.message}</p> : null}
          </section>
        </div>

        <aside className="h-fit bg-charcoal p-5 text-white xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-gold">{locale === "fr" ? "Aperçu appareil" : "Device preview"}</p><h3 className="mt-1 text-sm font-black">Notification mobile</h3></div><div className="inline-flex rounded-md bg-white/8 p-1" aria-label={locale === "fr" ? "Langue de l’aperçu" : "Preview language"}>{(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => setPreviewLocale(language)} aria-pressed={previewLocale === language} className={`h-7 rounded px-2 text-[9px] font-black uppercase ${previewLocale === language ? "bg-white text-charcoal" : "text-white/75"}`}>{language}</button>)}</div></div>
          <div className="mx-auto mt-5 max-w-[19rem] rounded-[1.75rem] border-[5px] border-forest-dark bg-[#E9E9E9] px-3 pb-16 pt-7 shadow-2xl">
            <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-forest-dark/80" />
            <div className="flex gap-3 rounded-lg bg-white p-3 text-charcoal shadow-xl">
              <Image src="/brand/notification-icon.png" alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><div className="flex items-start gap-2"><p className="flex-1 truncate text-xs font-extrabold">{previewTitle || "Je mange Africain"}</p><span className="text-[9px] text-muted-foreground">{previewLocale === "fr" ? "maintenant" : "now"}</span></div><p className="mt-1 break-words text-[11px] leading-5 text-muted-foreground">{previewBody || (previewLocale === "fr" ? "Votre message apparaîtra ici avant toute diffusion." : "Your message will appear here before delivery.")}</p></div>
            </div>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-gold" /><h3 className="text-xs font-black">{locale === "fr" ? "Derniers envois" : "Recent sends"}</h3></div><div className="mt-2 divide-y divide-white/10">{data?.recent?.length ? data.recent.slice(0, 5).map((item) => <div key={item.id} className="flex items-start gap-2 py-3"><BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{item.titleFr}</p><p className="mt-0.5 truncate text-[9px] text-white/65">{item.bodyFr}</p><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold text-gold/80"><span className="inline-flex items-center gap-1"><Target className="h-2.5 w-2.5" />{destinationLabel(item.url)}</span><span className="inline-flex items-center gap-1"><Languages className="h-2.5 w-2.5" />FR/EN</span></p><p className="mt-1 text-[9px] text-white/65">{item.deliveredCount || 0}/{item.recipientCount || 0} {locale === "fr" ? "livrées" : "delivered"}</p></div><span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.sent ? "bg-forest" : "bg-white/25"}`} /></div>) : <p className="py-5 text-center text-[10px] text-white/65">{locale === "fr" ? "Aucun envoi" : "No campaigns yet"}</p>}</div></div>
        </aside>
      </div>
    </div>
  );
}

function CampaignField({ id, label, value, onChange, maxLength, multiline = false }: { id: string; label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><span className="text-[10px] text-muted-foreground">{value.length}/{maxLength}</span></div>
      {multiline ? <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} className="min-h-24 resize-none" /> : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} />}
    </div>
  );
}
