"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  Gauge,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetch } from "@/lib/use-fetch";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { formatDateTime } from "@/lib/format";

type Configuration = {
  supportEmail: string;
  supportPhone: string;
  supportHoursFr: string;
  supportHoursEn: string;
  supportResponseHours: number;
  businessCity: string;
  businessCountry: string;
};

type Integration = {
  id: "database" | "payments" | "identity" | "cache" | "push";
  state: "ready" | "partial" | "attention";
  provider: string;
  capabilities: Record<string, boolean>;
};

type SettingsPayload = {
  configuration: Configuration;
  metadata: { persisted: boolean; updatedBy: string | null; updatedAt: string | null };
  integrations: Integration[];
};

const INTEGRATION_PRESENTATION: Record<Integration["id"], { icon: LucideIcon; titleFr: string; titleEn: string; detailFr: string; detailEn: string }> = {
  database: { icon: Database, titleFr: "Données transactionnelles", titleEn: "Transactional data", detailFr: "Catalogue, clients, stocks et commandes", detailEn: "Catalog, customers, stock and orders" },
  payments: { icon: CreditCard, titleFr: "Paiements européens", titleEn: "European payments", detailFr: "Encaissement et confirmation serveur", detailEn: "Collection and server confirmation" },
  identity: { icon: KeyRound, titleFr: "Identité et médias", titleEn: "Identity and media", detailFr: "Sessions, équipe et stockage d'images", detailEn: "Sessions, team and image storage" },
  cache: { icon: Gauge, titleFr: "Protection et cache", titleEn: "Protection and cache", detailFr: "Limitation de trafic et accélération", detailEn: "Traffic limiting and acceleration" },
  push: { icon: BellRing, titleFr: "Notifications mobiles", titleEn: "Mobile notifications", detailFr: "Abonnements et campagnes ciblées", detailEn: "Subscriptions and targeted campaigns" },
};

export default function SettingsSection({ locale, canUpdate }: { locale: "fr" | "en"; canUpdate: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<SettingsPayload>("/api/admin/settings", []);
  const [draft, setDraft] = useState<Configuration | null>(null);
  const [saved, setSaved] = useState<Configuration | null>(null);
  const [metadata, setMetadata] = useState<SettingsPayload["metadata"] | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data) return;
    setDraft(data.configuration);
    setSaved(data.configuration);
    setMetadata(data.metadata);
  }, [data]);

  const dirty = useMemo(() => Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved)), [draft, saved]);
  const readyCount = data?.integrations.filter((integration) => integration.state === "ready").length || 0;
  const readiness = useMemo(() => platformReadiness(data?.integrations || []), [data?.integrations]);

  const update = <K extends keyof Configuration>(field: K, value: Configuration[K]) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setStatus("idle");
    setMessage("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !dirty || !canUpdate) return;
    setStatus("busy");
    setMessage("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as Partial<SettingsPayload> & { error?: string } : {};
    if (!response?.ok || !payload.configuration) {
      setStatus("error");
      setMessage(payload.error || (isFr ? "La configuration n'a pas pu être enregistrée." : "The configuration could not be saved."));
      return;
    }
    setDraft(payload.configuration);
    setSaved(payload.configuration);
    if (payload.metadata) setMetadata(payload.metadata);
    setStatus("success");
    setMessage(isFr ? "Configuration enregistrée et publiée dans l'espace client." : "Configuration saved and published to the customer experience.");
    refetch();
  };

  if (loading && !draft) return <AdminSectionLoading label={isFr ? "Chargement de la configuration" : "Loading configuration"} />;
  if (error && !draft) return <AdminErrorState message={isFr ? "La configuration de la plateforme est indisponible." : "Platform configuration is unavailable."} onRetry={refetch} />;
  if (!draft) return null;

  return (
    <div data-testid="platform-settings-workspace">
      <AdminPageHeader
        eyebrow={isFr ? "Socle de service" : "Service foundation"}
        title={isFr ? "Configuration de la plateforme" : "Platform configuration"}
        description={isFr ? "Pilotez les informations publiques utiles aux clients et contrôlez la disponibilité des services sensibles sans exposer leurs secrets." : "Manage useful public customer information and monitor sensitive services without exposing their secrets."}
        icon={<Settings2 className="h-5 w-5" />}
        variant="control"
        accent={BRAND_COLORS.burgundy}
      />

      <ProductionReadiness readiness={readiness} locale={locale} />

      <div className="mt-6 grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-9">
        <form onSubmit={submit} className="min-w-0 space-y-6" aria-label={isFr ? "Coordonnées publiques de service" : "Public service contact details"}>
          <section aria-labelledby="settings-contact-title">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><Mail className="h-4 w-4" /></span>
              <div><p className="jma-eyebrow">{isFr ? "Assistance client" : "Customer support"}</p><h3 id="settings-contact-title" className="mt-0.5 text-base font-black text-charcoal">{isFr ? "Coordonnées publiées" : "Published contact details"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Ces valeurs apparaissent dans le parcours Contact de la boutique." : "These values appear in the storefront Contact journey."}</p></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SettingsField id="settings-email" label={isFr ? "E-mail d'assistance" : "Support email"} icon={Mail}>
                <Input id="settings-email" type="email" autoComplete="email" value={draft.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" />
              </SettingsField>
              <SettingsField id="settings-phone" label={isFr ? "Téléphone public" : "Public phone"} icon={Phone} hint={isFr ? "Laissez vide si l'assistance téléphonique n'est pas ouverte." : "Leave empty if phone support is not open."}>
                <Input id="settings-phone" type="tel" autoComplete="tel" value={draft.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} disabled={!canUpdate || status === "busy"} className="h-11 pl-9" />
              </SettingsField>
            </div>
          </section>

          <section className="border-t border-charcoal/8 pt-6" aria-labelledby="settings-availability-title">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/16 text-burgundy"><Clock3 className="h-4 w-4" /></span>
              <div><p className="jma-eyebrow">{isFr ? "Engagement de réponse" : "Response commitment"}</p><h3 id="settings-availability-title" className="mt-0.5 text-base font-black text-charcoal">{isFr ? "Horaires et délai annoncé" : "Hours and stated response time"}</h3></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SettingsField id="settings-hours-fr" label="Horaires en français" icon={Clock3}>
                <Input id="settings-hours-fr" value={draft.supportHoursFr} onChange={(event) => update("supportHoursFr", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" />
              </SettingsField>
              <SettingsField id="settings-hours-en" label="Hours in English" icon={Clock3}>
                <Input id="settings-hours-en" value={draft.supportHoursEn} onChange={(event) => update("supportHoursEn", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" />
              </SettingsField>
              <SettingsField id="settings-response" label={isFr ? "Délai indicatif (heures)" : "Typical response (hours)"} icon={Gauge} hint={isFr ? "Entre 1 et 168 heures." : "Between 1 and 168 hours."}>
                <Input id="settings-response" type="number" min={1} max={168} inputMode="numeric" value={draft.supportResponseHours} onChange={(event) => update("supportResponseHours", Number(event.target.value))} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" />
              </SettingsField>
            </div>
          </section>

          <section className="border-t border-charcoal/8 pt-6" aria-labelledby="settings-location-title">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><MapPin className="h-4 w-4" /></span>
              <div><p className="jma-eyebrow">{isFr ? "Point de rattachement" : "Business location"}</p><h3 id="settings-location-title" className="mt-0.5 text-base font-black text-charcoal">{isFr ? "Localisation affichée" : "Displayed location"}</h3></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SettingsField id="settings-city" label={isFr ? "Ville" : "City"} icon={MapPin}><Input id="settings-city" value={draft.businessCity} onChange={(event) => update("businessCity", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" /></SettingsField>
              <SettingsField id="settings-country" label={isFr ? "Pays" : "Country"} icon={MapPin}><Input id="settings-country" value={draft.businessCountry} onChange={(event) => update("businessCountry", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" /></SettingsField>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-charcoal/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-10 text-xs leading-5">
              {message ? <p role={status === "error" ? "alert" : "status"} className={`flex items-start gap-2 ${status === "error" ? "text-destructive" : "text-burgundy"}`}>{status === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{message}</p> : <p className="text-muted-foreground">{canUpdate ? (dirty ? (isFr ? "Des modifications attendent votre validation." : "Changes are waiting for your approval.") : (isFr ? "Les données visibles par les clients sont à jour." : "Customer-facing details are up to date.")) : (isFr ? "Votre rôle dispose d'un accès en lecture seule." : "Your role has read-only access.")}</p>}
            </div>
            {canUpdate ? <Button type="submit" disabled={!dirty || status === "busy"} className="min-h-11 shrink-0 bg-terre text-white hover:bg-terre-dark">{status === "busy" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Publier les coordonnées" : "Publish contact details"}</Button> : null}
          </div>
        </form>

        <aside className="min-w-0 border-t border-charcoal/8 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-labelledby="settings-preview-title">
          <p className="jma-eyebrow">{isFr ? "Aperçu client" : "Customer preview"}</p>
          <h3 id="settings-preview-title" className="mt-1 text-base font-black text-charcoal">{isFr ? "Ce que la boutique affiche" : "What the storefront displays"}</h3>
          <div className="mt-4 rounded-md border border-burgundy/12 bg-[#FFFCFA] p-4 shadow-[0_18px_42px_-36px_rgba(90,38,50,0.6)]">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-burgundy text-white"><ShieldCheck className="h-5 w-5" /></span>
            <p className="mt-4 text-xs font-black text-charcoal">{isFr ? "Service client Je mange Africain" : "Je mange Africain customer service"}</p>
            <div className="mt-3 space-y-3 text-[11px] leading-5 text-muted-foreground">
              <p className="flex min-w-0 gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span className="min-w-0 break-all">{draft.supportEmail}</span></p>
              {draft.supportPhone ? <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{draft.supportPhone}</span></p> : null}
              <p className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{isFr ? draft.supportHoursFr : draft.supportHoursEn}<br />{isFr ? `Réponse sous ${draft.supportResponseHours} h` : `Reply within ${draft.supportResponseHours} hrs`}</span></p>
              <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{draft.businessCity}, {draft.businessCountry}</span></p>
            </div>
          </div>
          <div className="mt-4 border-l-2 border-gold pl-3 text-[10px] leading-4 text-muted-foreground">
            <p className="font-black text-charcoal">{isFr ? "Dernière publication" : "Last publication"}</p>
            <p className="mt-1">{metadata?.updatedAt ? formatDateTime(metadata.updatedAt, locale) : (isFr ? "Configuration initiale" : "Initial configuration")}</p>
            {metadata?.updatedBy ? <p className="mt-0.5 break-all">{metadata.updatedBy}</p> : null}
          </div>
        </aside>
      </div>

      <section className="mt-8 border-t border-charcoal/8 pt-6" aria-labelledby="integration-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="jma-eyebrow">{isFr ? "Infrastructure" : "Infrastructure"}</p><h3 id="integration-title" className="mt-1 text-lg font-black text-charcoal">{isFr ? "Services connectés" : "Connected services"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Seul l'état de préparation est visible ici. Les identifiants restent exclusivement côté serveur." : "Only readiness is shown here. Credentials remain server-side only."}</p></div>
          <span className="rounded-md bg-burgundy/[0.07] px-2.5 py-1.5 text-[10px] font-black text-burgundy">{readyCount}/{data?.integrations.length || 0} {isFr ? "prêts" : "ready"}</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {data?.integrations.map((integration) => <IntegrationStatus key={integration.id} integration={integration} locale={locale} />)}
        </div>
      </section>
    </div>
  );
}

function SettingsField({ id, label, icon: Icon, hint, children }: { id: string; label: string; icon: LucideIcon; hint?: string; children: React.ReactNode }) {
  return <div className="min-w-0"><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-terre" />{children}</div>{hint ? <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">{hint}</p> : null}</div>;
}

function IntegrationStatus({ integration, locale }: { integration: Integration; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const presentation = INTEGRATION_PRESENTATION[integration.id];
  const Icon = presentation.icon;
  const state = integration.state === "ready"
    ? { label: isFr ? "Prêt" : "Ready", className: "bg-burgundy/[0.07] text-burgundy", icon: CheckCircle2 }
    : integration.state === "partial"
      ? { label: isFr ? "Partiel" : "Partial", className: "bg-gold/16 text-burgundy", icon: AlertTriangle }
      : { label: isFr ? "À configurer" : "Set up", className: "bg-terre/[0.08] text-terre", icon: AlertTriangle };
  const StateIcon = state.icon;
  const completed = Object.values(integration.capabilities).filter(Boolean).length;
  const total = Object.keys(integration.capabilities).length;
  const capabilities = Object.entries(integration.capabilities);

  return (
    <div className="min-w-0 rounded-md border border-charcoal/8 bg-white p-3" data-testid={`integration-${integration.id}`}>
      <div className="flex items-start justify-between gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/[0.07] text-terre"><Icon className="h-4 w-4" /></span><span className={`inline-flex min-h-6 items-center gap-1 rounded px-1.5 text-[8px] font-black uppercase ${state.className}`}><StateIcon className="h-3 w-3" />{state.label}</span></div>
      <p className="mt-3 truncate text-[11px] font-black text-charcoal">{isFr ? presentation.titleFr : presentation.titleEn}</p>
      <p className="mt-0.5 line-clamp-2 min-h-7 text-[9px] leading-3.5 text-muted-foreground">{isFr ? presentation.detailFr : presentation.detailEn}</p>
      <div className="mt-3 space-y-1.5 border-t border-charcoal/6 pt-2">{capabilities.map(([capability, available]) => <div key={capability} className="flex items-center justify-between gap-2 text-[8px] font-bold"><span className="truncate text-muted-foreground">{capabilityLabel(integration.id, capability, locale)}</span><span className={`inline-flex items-center gap-1 ${available ? "text-burgundy" : "text-terre"}`}>{available ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{available ? (isFr ? "Oui" : "Yes") : (isFr ? "Non" : "No")}</span></div>)}</div>
      <div className="mt-2 flex items-center justify-between border-t border-charcoal/6 pt-2 text-[8px] font-bold text-muted-foreground"><span className="truncate">{integration.provider}</span><span className="tabular-nums">{completed}/{total}</span></div>
    </div>
  );
}

type PlatformReadiness = ReturnType<typeof platformReadiness>;

function platformReadiness(integrations: Integration[]) {
  const totalCapabilities = integrations.reduce((sum, integration) => sum + Object.keys(integration.capabilities).length, 0);
  const completedCapabilities = integrations.reduce((sum, integration) => sum + Object.values(integration.capabilities).filter(Boolean).length, 0);
  const attention = integrations.filter((integration) => integration.state === "attention").length;
  const partial = integrations.filter((integration) => integration.state === "partial").length;
  const percentage = totalCapabilities ? Math.round(completedCapabilities / totalCapabilities * 100) : 0;
  return { total: integrations.length, ready: integrations.filter((integration) => integration.state === "ready").length, attention, partial, percentage, productionReady: integrations.length > 0 && attention === 0 && partial === 0 };
}

function ProductionReadiness({ readiness, locale }: { readiness: PlatformReadiness; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const Icon = readiness.productionReady ? ShieldCheck : AlertTriangle;
  return (
    <section className={`mt-5 border-y px-4 py-4 sm:px-5 ${readiness.productionReady ? "border-burgundy/18 bg-burgundy/[0.035]" : "border-gold/35 bg-gold/[0.075]"}`} aria-labelledby="production-readiness-title" data-testid="production-readiness">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${readiness.productionReady ? "bg-burgundy text-white" : "bg-terre text-white"}`}><Icon className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Préparation opérationnelle" : "Operational readiness"}</p><h2 id="production-readiness-title" className="mt-0.5 text-sm font-black text-charcoal">{readiness.productionReady ? (isFr ? "Socle prêt pour la production" : "Production foundation ready") : (isFr ? "Mise en production à finaliser" : "Production setup to complete")}</h2></div><strong className="text-xl font-black tabular-nums text-charcoal">{readiness.percentage} %</strong></div>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{readiness.productionReady ? (isFr ? "Les cinq services critiques répondent à toutes les capacités contrôlées." : "All five critical services satisfy every checked capability.") : (isFr ? `${readiness.attention} service(s) à configurer et ${readiness.partial} connexion(s) partielle(s). Les cartes ci-dessous indiquent précisément les capacités manquantes.` : `${readiness.attention} service(s) need setup and ${readiness.partial} connection(s) are partial. The cards below identify each missing capability.`)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-white/80" role="progressbar" aria-label={isFr ? "Progression de la préparation opérationnelle" : "Operational readiness progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.percentage}><span className={`block h-full ${readiness.productionReady ? "bg-burgundy" : "bg-terre"}`} style={{ width: `${readiness.percentage}%` }} /></div>
        </div>
      </div>
    </section>
  );
}

function capabilityLabel(integrationId: Integration["id"], capability: string, locale: "fr" | "en") {
  const labels: Record<Integration["id"], Record<string, [string, string]>> = {
    database: { connection: ["Connexion", "Connection"], persistence: ["Persistance", "Persistence"], production: ["Base de production", "Production database"] },
    payments: { connection: ["Encaissement", "Payment collection"], webhook: ["Confirmation serveur", "Server confirmation"] },
    identity: { connection: ["API publique", "Public API"], serverAccess: ["Accès serveur", "Server access"] },
    cache: { connection: ["Protection active", "Protection active"] },
    push: { connection: ["Diffusion active", "Delivery active"] },
  };
  return labels[integrationId][capability]?.[locale === "fr" ? 0 : 1] || capability;
}
