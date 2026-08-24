"use client";

import { useState } from "react";
import Image from "next/image";
import { BellRing, LoaderCircle, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";

type PushDashboard = {
  activeSubscriptions: number;
  recent: Array<{ id: string; titleFr: string; bodyFr: string; sent: boolean; createdAt: string; type: string }>;
};

const initialCampaign = {
  titleFr: "",
  titleEn: "",
  bodyFr: "",
  bodyEn: "",
  type: "system",
  url: "/",
};

export function PushCampaignAdmin({ locale }: { locale: string }) {
  const { data, loading, refetch } = useFetch<PushDashboard>("/api/admin/push");
  const [campaign, setCampaign] = useState(initialCampaign);
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
      setResult({ type: "success", message: locale === "fr" ? `${payload.delivery.sent} appareil(s) notifié(s).` : `${payload.delivery.sent} device(s) notified.` });
      setCampaign(initialCampaign);
      refetch();
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "Envoi impossible" });
    } finally {
      setSending(false);
    }
  };

  const valid = campaign.titleFr.trim().length >= 3 && campaign.titleEn.trim().length >= 3 && campaign.bodyFr.trim().length >= 8 && campaign.bodyEn.trim().length >= 8;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{locale === "fr" ? "Diffusion mobile" : "Mobile delivery"}</p>
          <h2 className="mt-1 text-xl font-extrabold text-charcoal">{locale === "fr" ? "Campagnes push" : "Push campaigns"}</h2>
        </div>
        <Badge variant="outline" className="h-8 border-forest/30 bg-forest/5 px-3 text-forest">
          <Smartphone className="mr-1.5 h-3.5 w-3.5" /> {loading ? "…" : data?.activeSubscriptions || 0} {locale === "fr" ? "appareils actifs" : "active devices"}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card className="p-4 md:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampaignField label="Titre français" value={campaign.titleFr} maxLength={80} onChange={(titleFr) => setCampaign({ ...campaign, titleFr })} />
            <CampaignField label="English title" value={campaign.titleEn} maxLength={80} onChange={(titleEn) => setCampaign({ ...campaign, titleEn })} />
            <CampaignField label="Message français" value={campaign.bodyFr} maxLength={220} multiline onChange={(bodyFr) => setCampaign({ ...campaign, bodyFr })} />
            <CampaignField label="English message" value={campaign.bodyEn} maxLength={220} multiline onChange={(bodyEn) => setCampaign({ ...campaign, bodyEn })} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="push-type">Type</Label>
              <select id="push-type" value={campaign.type} onChange={(event) => setCampaign({ ...campaign, type: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="system">Information</option>
                <option value="promotion">Promotion</option>
                <option value="recipe">Recette</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="push-url">Destination</Label>
              <select id="push-url" value={campaign.url} onChange={(event) => setCampaign({ ...campaign, url: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="/">Accueil client</option>
                <option value="/?view=catalog">Catalogue</option>
                <option value="/?view=recipes">Recettes</option>
                <option value="/?view=orders">Suivi des commandes</option>
              </select>
            </div>
          </div>
          <Button onClick={sendCampaign} disabled={!valid || sending} className="mt-5 h-11 w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">
            {sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? (locale === "fr" ? "Envoi…" : "Sending…") : (locale === "fr" ? "Envoyer la campagne" : "Send campaign")}
          </Button>
          {result ? <p role={result.type === "error" ? "alert" : "status"} className={`mt-3 rounded-lg border p-3 text-xs ${result.type === "success" ? "border-forest/25 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{result.message}</p> : null}
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border bg-charcoal px-4 py-3 text-xs font-bold text-cream">{locale === "fr" ? "Aperçu mobile" : "Mobile preview"}</div>
            <div className="bg-[#ECECEC] p-4">
              <div className="flex gap-3 rounded-lg bg-white p-3 shadow-lg">
                <Image src="/brand/notification-icon.png" alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2"><p className="flex-1 truncate text-xs font-extrabold text-charcoal">{campaign.titleFr || "Je mange Africain"}</p><span className="text-[9px] text-muted-foreground">maintenant</span></div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{campaign.bodyFr || "Votre message apparaîtra ici."}</p>
                </div>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="mb-2 text-sm font-extrabold text-charcoal">{locale === "fr" ? "Derniers envois" : "Recent sends"}</h3>
            <div className="divide-y divide-border border-y border-border bg-white">
              {data?.recent?.length ? data.recent.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-3 py-3">
                  <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-terre" />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{item.titleFr}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.bodyFr}</p></div>
                  <Badge variant="outline" className={item.sent ? "border-forest/30 text-forest" : "text-muted-foreground"}>{item.sent ? "Envoyé" : "Sans destinataire"}</Badge>
                </div>
              )) : <p className="px-3 py-5 text-center text-xs text-muted-foreground">{locale === "fr" ? "Aucun envoi" : "No campaigns yet"}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignField({ label, value, onChange, maxLength, multiline = false }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label>{label}</Label><span className="text-[10px] text-muted-foreground">{value.length}/{maxLength}</span></div>
      {multiline ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} className="min-h-24 resize-none" /> : <Input value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} />}
    </div>
  );
}
