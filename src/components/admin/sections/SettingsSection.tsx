"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { IconFunction } from "reicon/createIcon";
import { AlertTriangle } from "reicon/icons/AlertTriangle";
import { Bank } from "reicon/icons/Bank";
import { BellRing } from "reicon/icons/BellRing";
import { Call } from "reicon/icons/Call";
import { Card } from "reicon/icons/Card";
import { ChatRoundCall } from "reicon/icons/ChatRoundCall";
import { CheckCircle } from "reicon/icons/CheckCircle";
import { Clock3 } from "reicon/icons/Clock3";
import { Cloud } from "reicon/icons/Cloud";
import { Database } from "reicon/icons/Database";
import { Envelope } from "reicon/icons/Envelope";
import { Gauge } from "reicon/icons/Gauge";
import { Key } from "reicon/icons/Key";
import { Loader } from "reicon/icons/Loader";
import { Location } from "reicon/icons/Location";
import { Mobile } from "reicon/icons/Mobile";
import { Save } from "reicon/icons/Save";
import { Settings2 } from "reicon/icons/Settings2";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { Wallet } from "reicon/icons/Wallet";
import { AdminErrorState, AdminPageHeader, AdminRefreshNotice, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useFetch } from "@/lib/use-fetch";
import { ADMIN_DATA_TTL_MS } from "@/lib/admin-prefetch";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { EUROPEAN_COUNTRIES } from "@/lib/european-countries";
import { formatDateTime } from "@/lib/format";
import { paymentMethodLabel, recommendedEuropeanPaymentMethods, uniquePaymentMethods } from "@/lib/payment-methods";
import type { CloudflareDeploymentReadiness, DeploymentRequirementGroup } from "@/lib/platform-configuration";
import type { PaymentProviderReadiness, PaymentReadinessMethod } from "@/lib/payment-readiness";

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
  id: "database" | "payments" | "identity" | "cache" | "push" | "hosting";
  state: "ready" | "partial" | "attention";
  provider: string;
  capabilities: Record<string, boolean>;
};

type SettingsPayload = {
  configuration: Configuration;
  metadata: { persisted: boolean; updatedBy: string | null; updatedAt: string | null };
  integrations: Integration[];
  deploymentReadiness?: CloudflareDeploymentReadiness;
  paymentReadiness: PaymentProviderReadiness;
};

const INTEGRATION_PRESENTATION: Record<Integration["id"], { icon: IconFunction; titleFr: string; titleEn: string; purposeFr: string; purposeEn: string; detailFr: string; detailEn: string }> = {
  database: { icon: Database, titleFr: "Données transactionnelles", titleEn: "Transactional data", purposeFr: "Source de vérité", purposeEn: "Source of truth", detailFr: "Catalogue, clients, stocks et commandes", detailEn: "Catalog, customers, stock and orders" },
  payments: { icon: Card, titleFr: "Paiements européens", titleEn: "European payments", purposeFr: "Encaisser sans friction", purposeEn: "Frictionless collection", detailFr: "Carte, PayPal, wallets et confirmation serveur", detailEn: "Card, PayPal, wallets and server confirmation" },
  identity: { icon: Key, titleFr: "Identité et médias", titleEn: "Identity and media", purposeFr: "Séparer client et admin", purposeEn: "Separate client and admin", detailFr: "Sessions, équipe et stockage d'images", detailEn: "Sessions, team and image storage" },
  cache: { icon: Gauge, titleFr: "Protection et cache", titleEn: "Protection and cache", purposeFr: "Charger vite", purposeEn: "Load fast", detailFr: "Limitation de trafic et accélération", detailEn: "Traffic limiting and acceleration" },
  push: { icon: BellRing, titleFr: "Notifications mobiles", titleEn: "Mobile notifications", purposeFr: "Prévenir au bon moment", purposeEn: "Notify at the right time", detailFr: "Abonnements et campagnes ciblées", detailEn: "Subscriptions and targeted campaigns" },
  hosting: { icon: Cloud, titleFr: "Hébergement Cloudflare", titleEn: "Cloudflare hosting", purposeFr: "Publier mondialement", purposeEn: "Publish globally", detailFr: "Workers, domaine et exécution internationale", detailEn: "Workers, domain and global runtime" },
};

const DEPLOYMENT_GROUP_ICONS: Record<DeploymentRequirementGroup, IconFunction> = {
  database: Database,
  identity: Key,
  payments: Card,
  cache: Gauge,
  push: BellRing,
  hosting: Cloud,
};

export default function SettingsSection({ locale, canUpdate }: { locale: "fr" | "en"; canUpdate: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<SettingsPayload>("/api/admin/settings", [], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });
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
  if (error && !draft) return <AdminErrorState locale={locale} message={isFr ? "La configuration de la plateforme est indisponible." : "Platform configuration is unavailable."} onRetry={refetch} />;
  if (!draft) return null;

  return (
    <div data-testid="platform-settings-workspace">
      <AdminPageHeader
        eyebrow={isFr ? "Socle de service" : "Service foundation"}
        title={isFr ? "Configuration de la plateforme" : "Platform configuration"}
        description={isFr ? "Publiez les contacts client et surveillez les services sensibles." : "Publish customer contacts and monitor sensitive services."}
        icon={<ReiconGlyph icon={Settings2} weight="Filled" className="h-5 w-5" />}
        variant="control"
        accent={BRAND_COLORS.burgundy}
        signals={[
          { label: isFr ? "Services prêts" : "Ready services", value: `${readyCount}/${data?.integrations.length || 0}`, icon: <ReiconGlyph icon={ShieldCheck} weight="Filled" className="h-3.5 w-3.5" />, tone: readiness.productionReady ? "burgundy" : "gold" },
          { label: "Cloudflare", value: data?.deploymentReadiness?.ready ? (isFr ? "prêt" : "ready") : (isFr ? "à finaliser" : "pending"), icon: <ReiconGlyph icon={Cloud} weight="Filled" className="h-3.5 w-3.5" />, tone: data?.deploymentReadiness?.ready ? "earth" : "gold" },
          { label: isFr ? "Paiements" : "Payments", value: data?.paymentReadiness.state === "ready" ? "LIVE" : (isFr ? "à vérifier" : "check"), icon: <ReiconGlyph icon={Card} weight="Filled" className="h-3.5 w-3.5" />, tone: data?.paymentReadiness.state === "ready" ? "burgundy" : "gold" },
        ]}
        flow={[
          { label: isFr ? "Publier" : "Publish", detail: isFr ? "Contact client officiel" : "Official customer contact", icon: <ReiconGlyph icon={Envelope} weight="Filled" className="h-3.5 w-3.5" />, tone: "burgundy", active: dirty },
          { label: isFr ? "Connecter" : "Connect", detail: isFr ? "Supabase et médias" : "Supabase and media", icon: <ReiconGlyph icon={Database} weight="Filled" className="h-3.5 w-3.5" />, tone: "earth", active: readyCount > 0 },
          { label: isFr ? "Encaisser" : "Collect", detail: isFr ? "Carte, PayPal, wallets" : "Card, PayPal, wallets", icon: <ReiconGlyph icon={Wallet} weight="Filled" className="h-3.5 w-3.5" />, tone: "gold", active: data?.paymentReadiness.state === "ready" },
          { label: isFr ? "Déployer" : "Deploy", detail: isFr ? "Cloudflare et domaine" : "Cloudflare and domain", icon: <ReiconGlyph icon={Cloud} weight="Filled" className="h-3.5 w-3.5" />, tone: "coral", active: data?.deploymentReadiness?.ready === true },
        ]}
        flowDensity="compact"
        signalsMobile={false}
      />

      {error ? <AdminRefreshNotice locale={locale} message={error} onRetry={refetch} /> : null}

      <ProductionReadiness readiness={readiness} locale={locale} />

      <CloudflareLaunchReadiness readiness={data?.deploymentReadiness} locale={locale} />

      <EuropeanPaymentReadiness readiness={data?.paymentReadiness} locale={locale} />

      <div className="mt-6 grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-9">
        <form onSubmit={submit} className="min-w-0 space-y-6" aria-label={isFr ? "Coordonnées publiques de service" : "Public service contact details"}>
          <section aria-labelledby="settings-contact-title">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><ReiconGlyph icon={Envelope} weight="Filled" className="h-4 w-4" /></span>
              <div><p className="jma-eyebrow">{isFr ? "Assistance client" : "Customer support"}</p><h3 id="settings-contact-title" className="mt-0.5 text-base font-black text-charcoal">{isFr ? "Coordonnées publiées" : "Published contact details"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Ces valeurs apparaissent dans le parcours Contact de la boutique." : "These values appear in the storefront Contact journey."}</p></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SettingsField id="settings-email" label={isFr ? "E-mail d'assistance" : "Support email"} icon={Envelope}>
                <Input id="settings-email" type="email" autoComplete="email" value={draft.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" />
              </SettingsField>
              <SettingsField id="settings-phone" label={isFr ? "Téléphone public" : "Public phone"} icon={Call} hint={isFr ? "Laissez vide si l'assistance téléphonique n'est pas ouverte." : "Leave empty if phone support is not open."}>
                <Input id="settings-phone" type="tel" autoComplete="tel" value={draft.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} disabled={!canUpdate || status === "busy"} className="h-11 pl-9" />
              </SettingsField>
            </div>
          </section>

          <section className="border-t border-charcoal/8 pt-6" aria-labelledby="settings-availability-title">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/16 text-burgundy"><ReiconGlyph icon={Clock3} weight="Filled" className="h-4 w-4" /></span>
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
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><ReiconGlyph icon={Location} weight="Filled" className="h-4 w-4" /></span>
              <div><p className="jma-eyebrow">{isFr ? "Point de rattachement" : "Business location"}</p><h3 id="settings-location-title" className="mt-0.5 text-base font-black text-charcoal">{isFr ? "Localisation affichée" : "Displayed location"}</h3></div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SettingsField id="settings-city" label={isFr ? "Ville" : "City"} icon={Location}><Input id="settings-city" value={draft.businessCity} onChange={(event) => update("businessCity", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" /></SettingsField>
              <SettingsField id="settings-country" label={isFr ? "Pays" : "Country"} icon={Location}><Input id="settings-country" value={draft.businessCountry} onChange={(event) => update("businessCountry", event.target.value)} disabled={!canUpdate || status === "busy"} required className="h-11 pl-9" /></SettingsField>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-charcoal/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-10 text-xs leading-5">
              {message ? <p role={status === "error" ? "alert" : "status"} className={`flex items-start gap-2 ${status === "error" ? "text-destructive" : "text-burgundy"}`}>{status === "error" ? <ReiconGlyph icon={AlertTriangle} weight="Filled" className="mt-0.5 h-4 w-4 shrink-0" /> : <ReiconGlyph icon={CheckCircle} weight="Filled" className="mt-0.5 h-4 w-4 shrink-0" />}{message}</p> : <p className="text-muted-foreground">{canUpdate ? (dirty ? (isFr ? "Des modifications attendent votre validation." : "Changes are waiting for your approval.") : (isFr ? "Les données visibles par les clients sont à jour." : "Customer-facing details are up to date.")) : (isFr ? "Votre rôle dispose d'un accès en lecture seule." : "Your role has read-only access.")}</p>}
            </div>
            {canUpdate ? <Button type="submit" disabled={!dirty || status === "busy"} className="min-h-11 shrink-0 bg-terre text-white hover:bg-terre-dark">{status === "busy" ? <ReiconGlyph icon={Loader} className="mr-2 h-4 w-4 animate-spin" /> : <ReiconGlyph icon={Save} weight="Filled" className="mr-2 h-4 w-4" />}{isFr ? "Publier les coordonnées" : "Publish contact details"}</Button> : null}
          </div>
        </form>

        <aside className="min-w-0 border-t border-charcoal/8 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-labelledby="settings-preview-title">
          <p className="jma-eyebrow">{isFr ? "Aperçu client" : "Customer preview"}</p>
          <h3 id="settings-preview-title" className="mt-1 text-base font-black text-charcoal">{isFr ? "Ce que la boutique affiche" : "What the storefront displays"}</h3>
          <div className="mt-4 rounded-md border border-burgundy/12 bg-[#FFFCFA] p-4 shadow-[0_18px_42px_-36px_rgba(90,38,50,0.6)]">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-burgundy text-white"><ReiconGlyph icon={ChatRoundCall} weight="Filled" className="h-5 w-5" /></span>
            <p className="mt-4 text-xs font-black text-charcoal">{isFr ? "Service client Je mange Africain" : "Je mange Africain customer service"}</p>
            <div className="mt-3 space-y-3 text-[11px] leading-5 text-muted-foreground">
              <p className="flex min-w-0 gap-2"><ReiconGlyph icon={Envelope} className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span className="min-w-0 break-all">{draft.supportEmail}</span></p>
              {draft.supportPhone ? <p className="flex gap-2"><ReiconGlyph icon={Call} className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{draft.supportPhone}</span></p> : null}
              <p className="flex gap-2"><ReiconGlyph icon={Clock3} className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{isFr ? draft.supportHoursFr : draft.supportHoursEn}<br />{isFr ? `Réponse sous ${draft.supportResponseHours} h` : `Reply within ${draft.supportResponseHours} hrs`}</span></p>
              <p className="flex gap-2"><ReiconGlyph icon={Location} className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><span>{draft.businessCity}, {draft.businessCountry}</span></p>
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

function SettingsField({ id, label, icon, hint, children }: { id: string; label: string; icon: IconFunction; hint?: string; children: ReactNode }) {
  return <div className="min-w-0"><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><div className="relative"><ReiconGlyph icon={icon} className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-terre" />{children}</div>{hint ? <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">{hint}</p> : null}</div>;
}

function CloudflareLaunchReadiness({ readiness, locale }: { readiness?: CloudflareDeploymentReadiness; locale: "fr" | "en" }) {
  if (!readiness) return null;
  const isFr = locale === "fr";
  const missing = readiness.requirements.filter((requirement) => requirement.severity === "blocking" && !requirement.satisfied);
  const icon = readiness.ready ? ShieldCheck : AlertTriangle;

  return (
    <section className="mt-5 overflow-hidden border-y border-burgundy/14 bg-[linear-gradient(118deg,#FFFFFF_0%,#FFF8F4_58%,#FFF3E5_100%)]" aria-labelledby="cloudflare-launch-title" data-testid="cloudflare-deployment-readiness">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-white shadow-[0_12px_26px_-18px_rgba(185,71,43,0.85)] ${readiness.ready ? "bg-burgundy" : "bg-terre"}`}><ReiconGlyph icon={icon} weight="Filled" className="h-4.5 w-4.5" /></span>
            <div className="min-w-0">
              <p className="jma-eyebrow">{isFr ? "Mise en ligne Cloudflare" : "Cloudflare launch"}</p>
              <h2 id="cloudflare-launch-title" className="mt-0.5 text-sm font-black text-charcoal">{readiness.ready ? (isFr ? "Déploiement production autorisé" : "Production deployment cleared") : (isFr ? "Déploiement production bloqué" : "Production deployment blocked")}</h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-muted-foreground">{readiness.ready ? (isFr ? "Les prérequis critiques sont prêts pour une publication Cloudflare contrôlée. Le domaine officiel reste rattachable ensuite." : "Critical prerequisites are ready for a controlled Cloudflare publication. The official domain can still be attached afterward.") : (isFr ? `${missing.length} prérequis bloquant(s) restent à compléter avant de relancer la production.` : `${missing.length} blocking prerequisite(s) remain before production can be retried.`)}</p>
            </div>
          </div>
          <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[8px] font-black uppercase ${readiness.ready ? "bg-burgundy text-white" : "bg-gold/20 text-burgundy"}`}><ReiconGlyph icon={icon} weight="Filled" className="h-3 w-3" />{readiness.ready ? (isFr ? "Prêt" : "Ready") : (isFr ? "À finaliser" : "To complete")}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-burgundy/10 border-y border-burgundy/10 bg-white/70 text-center sm:grid-cols-4 sm:divide-y-0">
          <LaunchFact label={isFr ? "Base" : "Database"} value="JMA" />
          <LaunchFact label={isFr ? "Cible" : "Target"} value="Workers" />
          <LaunchFact label={isFr ? "Validés" : "Cleared"} value={`${readiness.completed}/${readiness.total}`} />
          <LaunchFact label={isFr ? "Blocages" : "Blockers"} value={String(readiness.blockers.length)} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-white" role="progressbar" aria-label={isFr ? "Progression du déploiement Cloudflare" : "Cloudflare deployment progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.percentage}>
          <span className={`block h-full ${readiness.ready ? "bg-burgundy" : "bg-terre"}`} style={{ width: `${readiness.percentage}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-burgundy/10 bg-white/70 px-3 py-2">
          <span className="min-w-0 text-[9px] font-bold leading-4 text-muted-foreground">{isFr ? "Commande de mise en production contrôlée" : "Controlled production deploy command"}</span>
          <code className="max-w-full overflow-x-auto whitespace-nowrap rounded bg-burgundy/[0.06] px-2 py-1 text-[10px] font-black text-burgundy">{readiness.deployCommand}</code>
        </div>

        <div className="mt-4 divide-y divide-charcoal/8 border-y border-charcoal/8" aria-label={isFr ? "Prérequis de déploiement" : "Deployment prerequisites"}>
          {readiness.requirements.map((requirement) => <DeploymentRequirementRow key={requirement.id} requirement={requirement} locale={locale} />)}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[8px] font-bold text-muted-foreground">
          <span>{isFr ? "Aucune valeur sensible n'est affichée." : "No sensitive value is displayed."}</span>
          <span className="tabular-nums">{isFr ? "Contrôlé" : "Checked"} {formatDateTime(readiness.checkedAt, locale)}</span>
        </div>
      </div>
    </section>
  );
}

function LaunchFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-2 py-3"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div>;
}

function DeploymentRequirementRow({ requirement, locale }: { requirement: CloudflareDeploymentReadiness["requirements"][number]; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const statusIcon = requirement.satisfied ? CheckCircle : AlertTriangle;
  const groupIcon = DEPLOYMENT_GROUP_ICONS[requirement.group];
  const missingLabel = requirement.severity === "recommended" ? (isFr ? "Plus tard" : "Later") : (isFr ? "Manquant" : "Missing");

  return (
    <article className="grid min-w-0 gap-3 px-3 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(10rem,auto)] sm:items-center">
      <span className={`grid h-9 w-9 place-items-center rounded-md ${requirement.satisfied ? "bg-burgundy/[0.07] text-burgundy" : "bg-terre/[0.08] text-terre"}`}><ReiconGlyph icon={groupIcon} weight={requirement.satisfied ? "Filled" : "Outline"} className="h-4 w-4" /></span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black text-charcoal">{isFr ? requirement.labelFr : requirement.labelEn}</p>
          <span className={`inline-flex min-h-5 items-center gap-1 rounded px-1.5 text-[8px] font-black uppercase ${requirement.satisfied ? "bg-burgundy/[0.07] text-burgundy" : requirement.severity === "recommended" ? "bg-white text-muted-foreground ring-1 ring-charcoal/10" : "bg-gold/20 text-burgundy"}`}><ReiconGlyph icon={statusIcon} weight="Filled" className="h-3 w-3" />{requirement.satisfied ? (isFr ? "Validé" : "Cleared") : missingLabel}</span>
        </div>
        <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{isFr ? requirement.detailFr : requirement.detailEn}</p>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
        {requirement.envKeys.map((key) => <code key={key} className={`max-w-full break-all rounded px-1.5 py-1 text-[8px] font-black ${requirement.satisfied ? "bg-burgundy/[0.055] text-burgundy" : "bg-white text-terre ring-1 ring-terre/15"}`}>{key}</code>)}
      </div>
    </article>
  );
}

function EuropeanPaymentReadiness({ readiness, locale }: { readiness?: PaymentProviderReadiness; locale: "fr" | "en" }) {
  if (!readiness) return null;
  const isFr = locale === "fr";
  const availableMethods = readiness.methods.filter((method) => method.available);
  const localMethods = availableMethods.filter((method) => method.role === "local");
  const expressMethods = availableMethods.filter((method) => method.role === "express");
  const baselineMethods = uniquePaymentMethods(EUROPEAN_COUNTRIES.flatMap((country) => recommendedEuropeanPaymentMethods(country.code)));
  const availableMethodSet = new Set<string>(availableMethods.map((method) => method.method));
  const readyBaselineMethods = baselineMethods.filter((method) => availableMethodSet.has(method));
  const state = readiness.state === "ready"
    ? { label: isFr ? "Carte + PayPal actifs" : "Card + PayPal active", className: "bg-burgundy text-white", icon: CheckCircle }
    : readiness.state === "unconfigured"
      ? { label: isFr ? "Stripe non configuré" : "Stripe not configured", className: "bg-terre text-white", icon: AlertTriangle }
      : readiness.state === "unavailable"
        ? { label: isFr ? "Contrôle indisponible" : "Check unavailable", className: "bg-gold/20 text-burgundy", icon: AlertTriangle }
        : { label: isFr ? "Activation à compléter" : "Activation incomplete", className: "bg-gold/20 text-burgundy", icon: AlertTriangle };
  const stateIcon = state.icon;

  return (
    <section className="mt-5 overflow-hidden border-y border-burgundy/14 bg-[linear-gradient(118deg,#FFFFFF_0%,#FFF8F4_55%,#FFF9ED_100%)]" aria-labelledby="payment-readiness-title" data-testid="payment-readiness">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-burgundy text-white shadow-[0_12px_26px_-18px_rgba(138,48,66,0.85)]"><ReiconGlyph icon={Wallet} weight="Filled" className="h-4.5 w-4.5" /></span>
            <div className="min-w-0"><p className="jma-eyebrow">{isFr ? "Encaissement international" : "International payments"}</p><h2 id="payment-readiness-title" className="mt-0.5 text-sm font-black text-charcoal">{isFr ? "Couverture de paiement européenne" : "European payment coverage"}</h2><p className="mt-1 max-w-2xl text-[10px] leading-4 text-muted-foreground">{isFr ? "Lecture en temps réel de la configuration Stripe active. L’éligibilité finale reste calculée pour chaque pays, appareil et montant." : "Live reading of the active Stripe configuration. Final eligibility is still calculated for each country, device and amount."}</p></div>
          </div>
          <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[8px] font-black uppercase ${state.className}`}><ReiconGlyph icon={stateIcon} weight="Filled" className="h-3 w-3" />{state.label}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-burgundy/10 border-y border-burgundy/10 bg-white/70 text-center sm:grid-cols-4 sm:divide-y-0">
          <PaymentReadinessFact label={isFr ? "Mode" : "Mode"} value={readiness.liveMode === true ? "LIVE" : readiness.liveMode === false ? "TEST" : isFr ? "Non vérifié" : "Unchecked"} />
          <PaymentReadinessFact label={isFr ? "Socle client" : "Client baseline"} value={`${readyBaselineMethods.length}/${baselineMethods.length}`} />
          <PaymentReadinessFact label={isFr ? "Express" : "Express"} value={String(expressMethods.length)} />
          <PaymentReadinessFact label={isFr ? "Banques locales" : "Local banks"} value={String(localMethods.length)} />
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-burgundy/10 bg-burgundy/10 sm:grid-cols-2">
          <PaymentMethodReadiness method={readiness.methods.find((method) => method.method === "card")} locale={locale} />
          <PaymentMethodReadiness method={readiness.methods.find((method) => method.method === "paypal")} locale={locale} />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" aria-label={isFr ? "Autres moyens activés" : "Other enabled methods"}>
          {availableMethods.filter((method) => method.role !== "essential").map((method) => <span key={method.method} className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-burgundy/10 bg-white px-2 text-[8px] font-black text-charcoal"><PaymentMethodIcon method={method} className="h-3 w-3 text-terre" />{paymentMethodLabel(method.method, locale)}</span>)}
          {!availableMethods.some((method) => method.role !== "essential") ? <p className="text-[9px] leading-4 text-muted-foreground">{isFr ? "Aucun wallet ou moyen local supplémentaire n’est actuellement activé dans cette configuration." : "No additional wallet or local method is currently enabled in this configuration."}</p> : null}
        </div>
        <div className="mt-3 border-t border-burgundy/10 pt-3" data-testid="payment-client-baseline">
          <p className="mb-2 text-[8px] font-black uppercase text-muted-foreground">{isFr ? "Méthodes attendues dans le checkout Europe" : "Expected methods in European checkout"}</p>
          <div className="flex flex-wrap gap-1.5">
            {baselineMethods.map((method) => <span key={method} className={`inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 text-[8px] font-black ${availableMethodSet.has(method) ? "border-burgundy/15 bg-burgundy/[0.055] text-burgundy" : "border-charcoal/10 bg-white text-muted-foreground"}`}><span className={`h-1.5 w-1.5 rounded-full ${availableMethodSet.has(method) ? "bg-burgundy" : "bg-terre/45"}`} />{paymentMethodLabel(method, locale)}</span>)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-burgundy/10 pt-3 text-[8px] font-bold text-muted-foreground"><span className="truncate">{readiness.configurationName || (isFr ? "Configuration non identifiée" : "Unidentified configuration")}{readiness.isDefault ? (isFr ? " · configuration par défaut" : " · default configuration") : ""}</span><span className="shrink-0 tabular-nums">{isFr ? "Contrôlé" : "Checked"} {formatDateTime(readiness.checkedAt, locale)}</span></div>
      </div>
    </section>
  );
}

function PaymentReadinessFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-2 py-3"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div>;
}

function PaymentMethodReadiness({ method, locale }: { method?: PaymentReadinessMethod; locale: "fr" | "en" }) {
  if (!method) return null;
  const isFr = locale === "fr";
  return <div className="flex min-w-0 items-center gap-3 bg-white px-3 py-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${method.available ? "bg-burgundy/[0.08] text-burgundy" : "bg-terre/[0.08] text-terre"}`}><PaymentMethodIcon method={method} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-charcoal">{paymentMethodLabel(method.method, locale)}</p><p className="mt-0.5 truncate text-[8px] text-muted-foreground">{method.markets.map((market) => paymentMarketLabel(market, locale)).join(" · ")}</p></div><span className={`shrink-0 text-[8px] font-black uppercase ${method.available ? "text-burgundy" : "text-terre"}`}>{method.available ? (isFr ? "Actif" : "Active") : (isFr ? "À activer" : "Enable")}</span></div>;
}

function PaymentMethodIcon({ method, className }: { method: PaymentReadinessMethod; className?: string }) {
  const icon = method.family === "card" ? Card : method.family === "bank" ? Bank : method.family === "wallet" ? Mobile : Wallet;
  return <ReiconGlyph icon={icon} weight={method.family === "wallet" || method.family === "card" ? "Filled" : "Outline"} className={className} />;
}

function paymentMarketLabel(market: string, locale: "fr" | "en") {
  if (market === "EU") return locale === "fr" ? "Europe" : "Europe";
  if (market === "DEVICE") return locale === "fr" ? "Appareil compatible" : "Compatible device";
  if (market === "ELIGIBLE") return locale === "fr" ? "Marchés éligibles" : "Eligible markets";
  return market;
}

function IntegrationStatus({ integration, locale }: { integration: Integration; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const presentation = INTEGRATION_PRESENTATION[integration.id];
  const Icon = presentation.icon;
  const state = integration.state === "ready"
    ? { label: isFr ? "Prêt" : "Ready", className: "bg-burgundy/[0.07] text-burgundy", icon: CheckCircle }
    : integration.state === "partial"
      ? { label: isFr ? "Partiel" : "Partial", className: "bg-gold/16 text-burgundy", icon: AlertTriangle }
      : { label: isFr ? "À configurer" : "Set up", className: "bg-terre/[0.08] text-terre", icon: AlertTriangle };
  const stateIcon = state.icon;
  const completed = Object.values(integration.capabilities).filter(Boolean).length;
  const total = Object.keys(integration.capabilities).length;
  const capabilities = Object.entries(integration.capabilities);

  return (
    <div className="min-w-0 rounded-md border border-charcoal/8 bg-white p-3" data-testid={`integration-${integration.id}`}>
      <div className="flex items-start justify-between gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/[0.07] text-terre"><ReiconGlyph icon={Icon} weight="Filled" className="h-4 w-4" /></span><span className={`inline-flex min-h-6 items-center gap-1 rounded px-1.5 text-[8px] font-black uppercase ${state.className}`}><ReiconGlyph icon={stateIcon} weight="Filled" className="h-3 w-3" />{state.label}</span></div>
      <p className="mt-3 truncate text-[11px] font-black text-charcoal">{isFr ? presentation.titleFr : presentation.titleEn}</p>
      <p className="mt-1 inline-flex min-h-5 max-w-full items-center truncate rounded bg-burgundy/[0.055] px-1.5 text-[8px] font-black uppercase text-burgundy">{isFr ? presentation.purposeFr : presentation.purposeEn}</p>
      <p className="mt-0.5 line-clamp-2 min-h-7 text-[9px] leading-3.5 text-muted-foreground">{isFr ? presentation.detailFr : presentation.detailEn}</p>
      <div className="mt-3 space-y-1.5 border-t border-charcoal/6 pt-2">{capabilities.map(([capability, available]) => <div key={capability} className="flex items-center justify-between gap-2 text-[8px] font-bold"><span className="truncate text-muted-foreground">{capabilityLabel(integration.id, capability, locale)}</span><span className={`inline-flex items-center gap-1 ${available ? "text-burgundy" : "text-terre"}`}><ReiconGlyph icon={available ? CheckCircle : AlertTriangle} weight="Filled" className="h-3 w-3" />{available ? (isFr ? "Oui" : "Yes") : (isFr ? "Non" : "No")}</span></div>)}</div>
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
  const icon = readiness.productionReady ? ShieldCheck : AlertTriangle;
  return (
    <section className={`mt-5 border-y px-4 py-4 sm:px-5 ${readiness.productionReady ? "border-burgundy/18 bg-burgundy/[0.035]" : "border-gold/35 bg-gold/[0.075]"}`} aria-labelledby="production-readiness-title" data-testid="production-readiness">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${readiness.productionReady ? "bg-burgundy text-white" : "bg-terre text-white"}`}><ReiconGlyph icon={icon} weight="Filled" className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Préparation opérationnelle" : "Operational readiness"}</p><h2 id="production-readiness-title" className="mt-0.5 text-sm font-black text-charcoal">{readiness.productionReady ? (isFr ? "Socle prêt pour la production" : "Production foundation ready") : (isFr ? "Mise en production à finaliser" : "Production setup to complete")}</h2></div><strong className="text-xl font-black tabular-nums text-charcoal">{readiness.percentage} %</strong></div>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{readiness.productionReady ? (isFr ? "Tous les services critiques répondent aux capacités contrôlées." : "All critical services satisfy every checked capability.") : (isFr ? `${readiness.attention} service(s) à configurer et ${readiness.partial} connexion(s) partielle(s). Les cartes ci-dessous indiquent précisément les capacités manquantes.` : `${readiness.attention} service(s) need setup and ${readiness.partial} connection(s) are partial. The cards below identify each missing capability.`)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-white/80" role="progressbar" aria-label={isFr ? "Progression de la préparation opérationnelle" : "Operational readiness progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.percentage}><span className={`block h-full ${readiness.productionReady ? "bg-burgundy" : "bg-terre"}`} style={{ width: `${readiness.percentage}%` }} /></div>
        </div>
      </div>
    </section>
  );
}

function capabilityLabel(integrationId: Integration["id"], capability: string, locale: "fr" | "en") {
  const labels: Record<Integration["id"], Record<string, [string, string]>> = {
    database: { connection: ["Connexion", "Connection"], persistence: ["Persistance", "Persistence"], production: ["Base de production", "Production database"] },
    payments: { connection: ["Encaissement", "Payment collection"], webhook: ["Confirmation serveur", "Server confirmation"], configuration: ["Configuration Stripe", "Stripe configuration"], card: ["Carte bancaire", "Payment card"], paypal: ["PayPal", "PayPal"] },
    identity: { connection: ["API publique", "Public API"], project: ["Projet cible", "Target project"], serverAccess: ["Accès serveur", "Server access"] },
    cache: { connection: ["Protection active", "Protection active"] },
    push: { connection: ["Diffusion active", "Delivery active"] },
    hosting: { account: ["Compte Cloudflare", "Cloudflare account"], workers: ["Cible Workers", "Workers target"], runtime: ["Runtime edge", "Edge runtime"], domainConfigured: ["Domaine préparé", "Prepared domain"], domainDeferred: ["Domaine plus tard", "Domain later"], domain: ["Domaine public", "Public domain"] },
  };
  return labels[integrationId][capability]?.[locale === "fr" ? 0 : 1] || capability;
}
