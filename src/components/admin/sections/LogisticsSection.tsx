"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  ExternalLink,
  Gauge,
  LoaderCircle,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Route,
  Save,
  Search,
  Snowflake,
  Star,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFetch } from "@/lib/use-fetch";
import { europeanCountryLabel, europeanCountryOptions } from "@/lib/european-countries";
import { formatPrice } from "@/lib/format";
import { BRAND_COLORS } from "@/lib/brand-colors";
import type { DeliveryService, ShippingQuote } from "@/lib/shipping";

type Carrier = {
  id: string;
  name: string;
  logo?: string | null;
  trackingUrl?: string | null;
  rating: number;
  shipmentCount: number;
  zoneCount: number;
};

type DeliveryZone = {
  id: string;
  carrierId?: string | null;
  carrier?: string | null;
  country: string;
  postalPattern?: string | null;
  service: DeliveryService;
  baseFee: number;
  perKgFee: number;
  frozenSurcharge: number;
  minDelayHours: number;
};

type LogisticsPayload = {
  carriers: Carrier[];
  zones: DeliveryZone[];
  summary: {
    carriers: number;
    routes: number;
    countries: number;
    coldChainRoutes: number;
    serviceCounts: Record<DeliveryService, number>;
  };
};

type LogisticsTab = "routes" | "carriers" | "simulator";
type MutationMethod = "POST" | "PATCH" | "DELETE";
type Mutate = (url: string, method: MutationMethod, body?: Record<string, unknown>) => Promise<boolean>;

const SERVICE_PRESENTATION: Record<DeliveryService, { icon: LucideIcon; fr: string; en: string; detailFr: string; detailEn: string; accent: string }> = {
  standard: { icon: Truck, fr: "Standard", en: "Standard", detailFr: "Adresse et chaîne du froid", detailEn: "Doorstep and cold chain", accent: BRAND_COLORS.burgundy },
  express: { icon: Zap, fr: "Express", en: "Express", detailFr: "Prioritaire jusqu'à 24 h", detailEn: "Priority within 24 hours", accent: BRAND_COLORS.terracotta },
  relay: { icon: MapPinned, fr: "Point relais", en: "Collection point", detailFr: "Produits ambiants uniquement", detailEn: "Ambient goods only", accent: BRAND_COLORS.gold },
};

export default function LogisticsSection({ locale, canCreate, canUpdate, canDelete }: { locale: "fr" | "en"; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<LogisticsPayload>("/api/admin/logistics", []);
  const [tab, setTab] = useState<LogisticsTab>("routes");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [zoneEditor, setZoneEditor] = useState<DeliveryZone | "new" | null>(null);
  const [carrierEditor, setCarrierEditor] = useState<Carrier | "new" | null>(null);

  const mutate: Mutate = async (url, method, body) => {
    setMessage("");
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { error?: string } : {};
    if (!response?.ok) {
      setMessageKind("error");
      setMessage(payload.error || (isFr ? "L'opération logistique a échoué." : "The logistics operation failed."));
      return false;
    }
    setMessageKind("success");
    setMessage(isFr ? "Référentiel logistique mis à jour. Le prochain calcul client utilisera ces données." : "Logistics reference data updated. The next customer quote will use it.");
    refetch();
    return true;
  };

  if (loading && !data) return <AdminSectionLoading label={isFr ? "Chargement de la logistique" : "Loading logistics"} />;
  if (error || !data) return <AdminErrorState message={isFr ? "Le référentiel de livraison est indisponible." : "The delivery reference data is unavailable."} onRetry={refetch} />;

  const tabs: Array<{ id: LogisticsTab; icon: LucideIcon; fr: string; en: string; detailFr: string; detailEn: string }> = [
    { id: "routes", icon: Route, fr: "Zones tarifaires", en: "Rate zones", detailFr: "Pays, prix et délais", detailEn: "Countries, prices and timing" },
    { id: "carriers", icon: Truck, fr: "Transporteurs", en: "Carriers", detailFr: "Partenaires et suivi", detailEn: "Partners and tracking" },
    { id: "simulator", icon: CircleGauge, fr: "Simulateur client", en: "Customer simulator", detailFr: "Contrôler la promesse", detailEn: "Verify the promise" },
  ];

  return (
    <div data-testid="logistics-workspace">
      <AdminPageHeader
        eyebrow={isFr ? "Réseau européen" : "European network"}
        title={isFr ? "Promesse de livraison" : "Delivery promise"}
        description={isFr ? "Configurez les routes réellement vendues au paiement, leurs transporteurs, leurs prix au poids et leurs contraintes de chaîne du froid." : "Configure the routes actually sold at checkout, their carriers, weight pricing and cold-chain constraints."}
        icon={<Route className="h-5 w-5" />}
        variant="flow"
        accent={BRAND_COLORS.earth}
      />

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-burgundy/10 bg-burgundy/10 lg:grid-cols-4" aria-label={isFr ? "Indicateurs logistiques" : "Logistics indicators"}>
        <Metric icon={Truck} label={isFr ? "Transporteurs" : "Carriers"} value={data.summary.carriers} accent={BRAND_COLORS.burgundy} />
        <Metric icon={Route} label={isFr ? "Routes actives" : "Active routes"} value={data.summary.routes} accent={BRAND_COLORS.earth} />
        <Metric icon={MapPin} label={isFr ? "Pays configurés" : "Configured countries"} value={data.summary.countries} accent={BRAND_COLORS.gold} />
        <Metric icon={Snowflake} label={isFr ? "Routes sous froid" : "Cold-chain routes"} value={data.summary.coldChainRoutes} accent={BRAND_COLORS.chilli} />
      </div>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-md border border-burgundy/10 bg-[#FFFCFA] p-1" role="tablist" aria-label={isFr ? "Espaces logistiques" : "Logistics workspaces"}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={`relative flex min-h-[4.25rem] min-w-0 items-center justify-center gap-2 rounded-md px-2 text-left transition sm:justify-start sm:px-3 ${active ? "border border-terre/15 bg-white text-terre shadow-[0_10px_26px_-22px_rgba(185,71,43,0.8)]" : "text-muted-foreground hover:bg-white/70 hover:text-charcoal"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${active ? "bg-terre text-white" : "bg-terre/[0.07] text-terre"}`}><item.icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-[10px] font-black sm:text-xs">{isFr ? item.fr : item.en}</span><span className="mt-0.5 hidden truncate text-[8px] sm:block">{isFr ? item.detailFr : item.detailEn}</span></span>{active ? <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-gold" /> : null}</button>;
        })}
      </div>

      {message ? <div role={messageKind === "error" ? "alert" : "status"} className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs ${messageKind === "error" ? "border-destructive/20 bg-destructive/[0.05] text-destructive" : "border-burgundy/15 bg-burgundy/[0.045] text-burgundy"}`}>{messageKind === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{message}</div> : null}

      <div className="mt-6">
        {tab === "routes" ? <RoutesWorkspace data={data} locale={locale} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} onCreate={() => setZoneEditor("new")} onEdit={setZoneEditor} mutate={mutate} /> : null}
        {tab === "carriers" ? <CarriersWorkspace carriers={data.carriers} locale={locale} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} onCreate={() => setCarrierEditor("new")} onEdit={setCarrierEditor} mutate={mutate} /> : null}
        {tab === "simulator" ? <ShippingSimulator locale={locale} /> : null}
      </div>

      {zoneEditor ? <ZoneEditor key={zoneEditor === "new" ? "new" : zoneEditor.id} locale={locale} zone={zoneEditor === "new" ? null : zoneEditor} carriers={data.carriers} mutate={mutate} onClose={() => setZoneEditor(null)} /> : null}
      {carrierEditor ? <CarrierEditor key={carrierEditor === "new" ? "new" : carrierEditor.id} locale={locale} carrier={carrierEditor === "new" ? null : carrierEditor} mutate={mutate} onClose={() => setCarrierEditor(null)} /> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number; accent: string }) {
  return <div className="flex min-h-[4.7rem] items-center gap-3 bg-white p-3 sm:p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ color: accent, backgroundColor: `${accent}12` }}><Icon className="h-4 w-4" /></span><span className="min-w-0"><strong className="block text-lg font-black tabular-nums text-charcoal">{value}</strong><span className="block truncate text-[9px] font-bold text-muted-foreground">{label}</span></span></div>;
}

function RoutesWorkspace({ data, locale, canCreate, canUpdate, canDelete, onCreate, onEdit, mutate }: { data: LogisticsPayload; locale: "fr" | "en"; canCreate: boolean; canUpdate: boolean; canDelete: boolean; onCreate: () => void; onEdit: (zone: DeliveryZone) => void; mutate: Mutate }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const [service, setService] = useState<DeliveryService | "all">("all");
  const filtered = useMemo(() => data.zones.filter((zone) => {
    if (service !== "all" && zone.service !== service) return false;
    const haystack = `${zone.country} ${zone.carrier || ""} ${zone.postalPattern || ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [data.zones, query, service]);

  return <section aria-labelledby="routes-title">
    <WorkspaceTitle id="routes-title" eyebrow={isFr ? "Tarification dynamique" : "Dynamic pricing"} title={isFr ? "Routes proposées au paiement" : "Routes offered at checkout"} description={isFr ? "Le prix client combine le forfait, le poids et la surcharge surgelée de la route sélectionnée." : "The customer price combines base fee, weight and frozen surcharge for the selected route."} action={canCreate ? <Button type="button" onClick={onCreate} disabled={!data.carriers.length} className="min-h-10 bg-terre text-white hover:bg-terre-dark"><Plus className="mr-2 h-4 w-4" />{isFr ? "Nouvelle route" : "New route"}</Button> : null} />
    <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="relative"><Label htmlFor="route-search" className="sr-only">{isFr ? "Rechercher une route" : "Search routes"}</Label><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="route-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isFr ? "Pays, transporteur ou code postal" : "Country, carrier or postcode"} className="h-10 bg-white pl-9" /></div>
      <Label className="sr-only" htmlFor="route-service-filter">{isFr ? "Filtrer par service" : "Filter by service"}</Label><select id="route-service-filter" value={service} onChange={(event) => setService(event.target.value as DeliveryService | "all")} className="h-10 rounded-md border border-input bg-white px-3 text-xs font-bold text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20"><option value="all">{isFr ? "Tous les services" : "All services"}</option><option value="standard">Standard</option><option value="express">Express</option><option value="relay">{isFr ? "Point relais" : "Collection point"}</option></select>
    </div>
    {filtered.length ? <div className="mt-4 divide-y divide-charcoal/8 border-y border-charcoal/8" data-testid="delivery-route-list">{filtered.map((zone) => <RouteRow key={zone.id} zone={zone} locale={locale} canUpdate={canUpdate} canDelete={canDelete} onEdit={() => onEdit(zone)} mutate={mutate} />)}</div> : <AdminEmptyState icon={<Route className="h-5 w-5" />} title={isFr ? "Aucune route correspondante" : "No matching route"} description={isFr ? "Modifiez la recherche ou créez une nouvelle zone tarifaire." : "Change the search or create a new rate zone."} />}
  </section>;
}

function RouteRow({ zone, locale, canUpdate, canDelete, onEdit, mutate }: { zone: DeliveryZone; locale: "fr" | "en"; canUpdate: boolean; canDelete: boolean; onEdit: () => void; mutate: Mutate }) {
  const isFr = locale === "fr";
  const service = SERVICE_PRESENTATION[zone.service];
  const Icon = service.icon;
  return <article className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(10rem,.55fr)_auto]" data-testid={`delivery-zone-${zone.id}`}>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md" style={{ color: service.accent, backgroundColor: `${service.accent}12` }}><Icon className="h-[1.1rem] w-[1.1rem]" /></span>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-xs font-black text-charcoal">{europeanCountryLabel(zone.country, locale)}</h3><span className="rounded bg-burgundy/[0.07] px-1.5 py-0.5 text-[8px] font-black uppercase text-burgundy">{isFr ? service.fr : service.en}</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{zone.carrier || (isFr ? "Transporteur non attribué" : "Carrier not assigned")} · {zone.postalPattern || (isFr ? "Tout le pays" : "Nationwide")}</p></div>
    <div className="col-span-2 ml-[3.25rem] min-w-0 sm:col-span-1 sm:ml-0"><p className="text-[10px] font-bold text-charcoal">{formatPrice(zone.baseFee, locale)} + {formatPrice(zone.perKgFee, locale)}/{isFr ? "kg" : "kg"}</p><p className="mt-1 text-[9px] text-muted-foreground">{zone.minDelayHours} h · {zone.service === "relay" ? (isFr ? "ambiant" : "ambient") : `${isFr ? "froid" : "cold"} +${formatPrice(zone.frozenSurcharge, locale)}`}</p></div>
    <div className="row-start-1 flex items-center gap-1 sm:row-auto">{canUpdate ? <Button type="button" variant="ghost" size="icon" onClick={onEdit} title={isFr ? "Modifier la route" : "Edit route"} aria-label={isFr ? `Modifier ${zone.country}` : `Edit ${zone.country}`} className="h-9 w-9 text-burgundy hover:bg-burgundy/[0.06]"><Pencil className="h-4 w-4" /></Button> : null}{canDelete ? <DeleteAction title={isFr ? "Supprimer cette route ?" : "Delete this route?"} description={isFr ? "Elle disparaîtra immédiatement du référentiel tarifaire. Les commandes existantes conserveront leur transporteur et leur prix enregistrés." : "It will immediately leave the rate reference. Existing orders keep their recorded carrier and price."} confirm={isFr ? "Oui, supprimer" : "Yes, delete"} label={isFr ? `Supprimer ${zone.country}` : `Delete ${zone.country}`} onConfirm={() => mutate(`/api/admin/logistics/zones/${zone.id}`, "DELETE")} /> : null}</div>
  </article>;
}

function CarriersWorkspace({ carriers, locale, canCreate, canUpdate, canDelete, onCreate, onEdit, mutate }: { carriers: Carrier[]; locale: "fr" | "en"; canCreate: boolean; canUpdate: boolean; canDelete: boolean; onCreate: () => void; onEdit: (carrier: Carrier) => void; mutate: Mutate }) {
  const isFr = locale === "fr";
  return <section aria-labelledby="carriers-title"><WorkspaceTitle id="carriers-title" eyebrow={isFr ? "Référentiel partenaires" : "Partner directory"} title={isFr ? "Transporteurs et suivi" : "Carriers and tracking"} description={isFr ? "Le lien de suivi utilise {ref} comme emplacement du numéro de colis et alimente directement l'espace client." : "The tracking link uses {ref} as the parcel-number placeholder and directly feeds the customer experience."} action={canCreate ? <Button type="button" onClick={onCreate} className="min-h-10 bg-terre text-white hover:bg-terre-dark"><Plus className="mr-2 h-4 w-4" />{isFr ? "Ajouter" : "Add carrier"}</Button> : null} />
    {carriers.length ? <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{carriers.map((carrier) => <article key={carrier.id} className="min-w-0 rounded-md border border-charcoal/8 bg-white p-4" data-testid={`carrier-${carrier.id}`}><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre"><Truck className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-charcoal">{carrier.name}</h3><p className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground"><Star className="h-3 w-3 fill-gold text-gold" />{carrier.rating}/5 · {carrier.zoneCount} {isFr ? "route(s)" : "route(s)"}</p></div><div className="flex shrink-0 gap-1">{canUpdate ? <Button variant="ghost" size="icon" onClick={() => onEdit(carrier)} title={isFr ? "Modifier" : "Edit"} aria-label={`${isFr ? "Modifier" : "Edit"} ${carrier.name}`} className="h-8 w-8 text-burgundy"><Pencil className="h-3.5 w-3.5" /></Button> : null}{canDelete ? <DeleteAction title={isFr ? "Supprimer ce transporteur ?" : "Delete this carrier?"} description={carrier.zoneCount || carrier.shipmentCount ? (isFr ? "Cette suppression sera refusée tant que des routes ou commandes utilisent ce transporteur, afin de protéger l'historique." : "Deletion will be refused while routes or orders use this carrier, protecting history.") : (isFr ? "Ce transporteur inutilisé sera supprimé définitivement." : "This unused carrier will be permanently deleted.")} confirm={isFr ? "Confirmer la suppression" : "Confirm deletion"} label={`${isFr ? "Supprimer" : "Delete"} ${carrier.name}`} onConfirm={() => mutate(`/api/admin/logistics/carriers/${carrier.id}`, "DELETE")} compact /> : null}</div></div><div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-burgundy/10"><span className="bg-[#FFFCFA] p-2.5"><span className="block text-[8px] font-black uppercase text-muted-foreground">{isFr ? "Zones" : "Zones"}</span><strong className="mt-0.5 block text-sm tabular-nums text-charcoal">{carrier.zoneCount}</strong></span><span className="bg-[#FFFCFA] p-2.5"><span className="block text-[8px] font-black uppercase text-muted-foreground">{isFr ? "Expéditions" : "Shipments"}</span><strong className="mt-0.5 block text-sm tabular-nums text-charcoal">{carrier.shipmentCount}</strong></span></div>{carrier.trackingUrl ? <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[9px] text-muted-foreground"><ExternalLink className="h-3 w-3 shrink-0 text-terre" /><span className="truncate">{carrier.trackingUrl}</span></p> : <p className="mt-3 text-[9px] text-muted-foreground">{isFr ? "Lien de suivi à renseigner" : "Tracking link not set"}</p>}</article>)}</div> : <AdminEmptyState icon={<Truck className="h-5 w-5" />} title={isFr ? "Aucun transporteur" : "No carrier"} description={isFr ? "Ajoutez un partenaire avant de créer une route." : "Add a partner before creating a route."} />}
  </section>;
}

function ShippingSimulator({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [country, setCountry] = useState("France");
  const [postalCode, setPostalCode] = useState("75011");
  const [weightKg, setWeightKg] = useState(2);
  const [thermal, setThermal] = useState<"AMBIANT" | "REFRIGERATED" | "FROZEN">("AMBIANT");
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");

  const simulate = async (event: FormEvent) => {
    event.preventDefault(); setStatus("busy"); setError("");
    const response = await fetch("/api/shipping/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, postalCode, weightGrams: Math.round(weightKg * 1000), thermalClasses: [thermal], service: "standard" }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { options?: ShippingQuote[]; error?: string } : {};
    if (!response?.ok || !payload.options) { setStatus("error"); setError(payload.error || (isFr ? "La simulation a échoué." : "The simulation failed.")); return; }
    setQuotes(payload.options); setStatus("idle");
  };

  return <section aria-labelledby="simulator-title"><WorkspaceTitle id="simulator-title" eyebrow={isFr ? "Miroir du paiement" : "Checkout mirror"} title={isFr ? "Simuler la promesse client" : "Simulate the customer promise"} description={isFr ? "Ce test appelle le moteur public avec le pays, le code postal, le poids et la classe thermique saisis." : "This test calls the public engine with the entered country, postcode, weight and thermal class."} />
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:gap-8">
      <form onSubmit={simulate} className="space-y-4" aria-label={isFr ? "Simulateur de livraison" : "Delivery simulator"}><div className="grid gap-3 sm:grid-cols-2"><FormField id="sim-country" label={isFr ? "Pays" : "Country"}><select id="sim-country" value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">{europeanCountryOptions(locale).map((item) => <option key={item.code} value={item.value}>{item.label}</option>)}</select></FormField><FormField id="sim-postal" label={isFr ? "Code postal" : "Postcode"}><Input id="sim-postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} maxLength={20} required className="h-11" /></FormField><FormField id="sim-weight" label={isFr ? "Poids du panier (kg)" : "Basket weight (kg)"}><Input id="sim-weight" type="number" inputMode="decimal" min={0.1} max={1000} step={0.1} value={weightKg} onChange={(event) => setWeightKg(Number(event.target.value))} required className="h-11" /></FormField><FormField id="sim-thermal" label={isFr ? "Contrainte thermique" : "Thermal requirement"}><select id="sim-thermal" value={thermal} onChange={(event) => setThermal(event.target.value as typeof thermal)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20"><option value="AMBIANT">{isFr ? "Ambiant" : "Ambient"}</option><option value="REFRIGERATED">{isFr ? "Réfrigéré" : "Chilled"}</option><option value="FROZEN">{isFr ? "Surgelé" : "Frozen"}</option></select></FormField></div>{error ? <p role="alert" className="flex items-start gap-2 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}<Button type="submit" disabled={status === "busy"} className="min-h-11 w-full bg-terre text-white hover:bg-terre-dark sm:w-auto sm:min-w-56">{status === "busy" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}{isFr ? "Calculer les 3 options" : "Calculate all 3 options"}</Button></form>
      <div className="min-w-0 border-t border-charcoal/8 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-live="polite">{quotes.length ? <div className="grid gap-2" data-testid="shipping-simulation-results">{quotes.map((quote) => <QuoteResult key={quote.service} quote={quote} locale={locale} />)}</div> : <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-burgundy/15 bg-[#FFFCFA] p-6 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-gold/14 text-burgundy"><CircleGauge className="h-5 w-5" /></span><p className="mt-3 text-xs font-black text-charcoal">{isFr ? "La promesse apparaîtra ici" : "The promise will appear here"}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Même transporteur, prix et délai que dans le paiement client." : "Same carrier, price and timing as customer checkout."}</p></div></div>}</div>
    </div>
  </section>;
}

function QuoteResult({ quote, locale }: { quote: ShippingQuote; locale: "fr" | "en" }) {
  const isFr = locale === "fr"; const service = SERVICE_PRESENTATION[quote.service]; const Icon = service.icon;
  return <article className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-3.5 ${quote.available ? "border-charcoal/8 bg-white" : "border-terre/12 bg-terre/[0.035]"}`}><span className="grid h-10 w-10 place-items-center rounded-md" style={{ color: service.accent, backgroundColor: `${service.accent}12` }}><Icon className="h-[1.1rem] w-[1.1rem]" /></span><div className="min-w-0"><h3 className="text-xs font-black text-charcoal">{isFr ? service.fr : service.en}</h3><p className="mt-1 truncate text-[10px] text-muted-foreground">{quote.available ? `${quote.carrier} · ${quote.minDelayHours}-${quote.maxDelayHours} h` : (isFr ? "Indisponible avec cette contrainte thermique" : "Unavailable with this thermal requirement")}</p>{quote.available ? <p className="mt-1 text-[8px] text-muted-foreground">{isFr ? "Forfait" : "Base"} {formatPrice(quote.breakdown.baseFee, locale)} + {isFr ? "poids" : "weight"} {formatPrice(quote.breakdown.weightFee, locale)}{quote.breakdown.frozenSurcharge ? ` + ${isFr ? "froid" : "cold"} ${formatPrice(quote.breakdown.frozenSurcharge, locale)}` : ""}</p> : null}</div><strong className="text-sm font-black tabular-nums text-charcoal">{quote.available ? formatPrice(quote.fee, locale) : "-"}</strong></article>;
}

function ZoneEditor({ locale, zone, carriers, mutate, onClose }: { locale: "fr" | "en"; zone: DeliveryZone | null; carriers: Carrier[]; mutate: Mutate; onClose: () => void }) {
  const isFr = locale === "fr"; const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ carrierId: zone?.carrierId || carriers[0]?.id || "", country: zone?.country || "France", postalPattern: zone?.postalPattern || "", service: zone?.service || "standard" as DeliveryService, baseFee: zone?.baseFee ?? 4.9, perKgFee: zone?.perKgFee ?? 0.6, frozenSurcharge: zone?.frozenSurcharge ?? 2.5, minDelayHours: zone?.minDelayHours ?? 48 });
  const updateService = (service: DeliveryService) => setForm((current) => ({ ...current, service, minDelayHours: service === "express" ? 24 : service === "relay" ? 72 : 48, frozenSurcharge: service === "relay" ? 0 : current.frozenSurcharge || 2.5 }));
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); const ok = await mutate(zone ? `/api/admin/logistics/zones/${zone.id}` : "/api/admin/logistics/zones", zone ? "PATCH" : "POST", form); setBusy(false); if (ok) onClose(); else setError(isFr ? "Vérifiez les champs et réessayez." : "Check the fields and try again."); };
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><span className="grid h-11 w-11 place-items-center rounded-md bg-terre/10 text-terre"><Route className="h-5 w-5" /></span><DialogTitle>{zone ? (isFr ? "Modifier la route" : "Edit route") : (isFr ? "Nouvelle zone tarifaire" : "New rate zone")}</DialogTitle><DialogDescription>{isFr ? "Définissez ce que le client verra et paiera pour cette destination." : "Define what the customer will see and pay for this destination."}</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" aria-label={isFr ? "Formulaire de zone tarifaire" : "Rate zone form"}><FormField id="zone-carrier" label={isFr ? "Transporteur" : "Carrier"}><select id="zone-carrier" value={form.carrierId} onChange={(event) => setForm({ ...form, carrierId: event.target.value })} required className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{carriers.map((carrier) => <option key={carrier.id} value={carrier.id}>{carrier.name}</option>)}</select></FormField><FormField id="zone-country" label={isFr ? "Pays" : "Country"}><select id="zone-country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{europeanCountryOptions(locale).map((item) => <option key={item.code} value={item.value}>{item.label}</option>)}</select></FormField><FormField id="zone-postal" label={isFr ? "Zone postale" : "Postcode area"} hint={isFr ? "Vide pour tout le pays. Exemple : 75*" : "Leave blank for nationwide. Example: 75*"}><Input id="zone-postal" value={form.postalPattern} onChange={(event) => setForm({ ...form, postalPattern: event.target.value })} maxLength={30} className="h-11" /></FormField><FormField id="zone-service" label={isFr ? "Service client" : "Customer service"}><select id="zone-service" value={form.service} onChange={(event) => updateService(event.target.value as DeliveryService)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal"><option value="standard">Standard</option><option value="express">Express</option><option value="relay">{isFr ? "Point relais" : "Collection point"}</option></select></FormField><FormField id="zone-base-fee" label={isFr ? "Forfait de base (€)" : "Base fee (€)"}><Input id="zone-base-fee" type="number" min={0} max={10000} step={0.01} value={form.baseFee} onChange={(event) => setForm({ ...form, baseFee: Number(event.target.value) })} required className="h-11" /></FormField><FormField id="zone-weight-fee" label={isFr ? "Prix par kg (€)" : "Price per kg (€)"}><Input id="zone-weight-fee" type="number" min={0} max={10000} step={0.01} value={form.perKgFee} onChange={(event) => setForm({ ...form, perKgFee: Number(event.target.value) })} required className="h-11" /></FormField><FormField id="zone-frozen-fee" label={isFr ? "Surcharge surgelée (€)" : "Frozen surcharge (€)"} hint={form.service === "relay" ? (isFr ? "Le relais est réservé aux produits ambiants." : "Collection points are for ambient goods only.") : undefined}><Input id="zone-frozen-fee" type="number" min={0} max={10000} step={0.01} value={form.frozenSurcharge} onChange={(event) => setForm({ ...form, frozenSurcharge: Number(event.target.value) })} disabled={form.service === "relay"} required className="h-11" /></FormField><FormField id="zone-delay" label={isFr ? "Délai maximal (heures)" : "Maximum time (hours)"} hint={form.service === "express" ? "1-24 h" : form.service === "standard" ? "25-48 h" : "49-336 h"}><Input id="zone-delay" type="number" min={form.service === "express" ? 1 : form.service === "standard" ? 25 : 49} max={form.service === "express" ? 24 : form.service === "standard" ? 48 : 336} value={form.minDelayHours} onChange={(event) => setForm({ ...form, minDelayHours: Number(event.target.value) })} required className="h-11" /></FormField>{error ? <p role="alert" className="text-xs text-destructive sm:col-span-2">{error}</p> : null}<DialogFooter className="mt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer la route" : "Save route"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function CarrierEditor({ locale, carrier, mutate, onClose }: { locale: "fr" | "en"; carrier: Carrier | null; mutate: Mutate; onClose: () => void }) {
  const isFr = locale === "fr"; const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [form, setForm] = useState({ name: carrier?.name || "", trackingUrl: carrier?.trackingUrl || "", logo: carrier?.logo || "", rating: carrier?.rating || 4 });
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); const ok = await mutate(carrier ? `/api/admin/logistics/carriers/${carrier.id}` : "/api/admin/logistics/carriers", carrier ? "PATCH" : "POST", form); setBusy(false); if (ok) onClose(); else setError(isFr ? "Vérifiez les informations du transporteur." : "Check the carrier details."); };
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"><DialogHeader><span className="grid h-11 w-11 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><Truck className="h-5 w-5" /></span><DialogTitle>{carrier ? (isFr ? "Modifier le transporteur" : "Edit carrier") : (isFr ? "Nouveau transporteur" : "New carrier")}</DialogTitle><DialogDescription>{isFr ? "Le nom et le suivi apparaissent dans les commandes et l’espace client." : "The name and tracking appear in orders and the customer experience."}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4" aria-label={isFr ? "Formulaire transporteur" : "Carrier form"}><FormField id="carrier-name" label={isFr ? "Nom commercial" : "Trading name"}><Input id="carrier-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={100} required className="h-11" /></FormField><FormField id="carrier-tracking" label={isFr ? "URL de suivi" : "Tracking URL"} hint={isFr ? "Utilisez {ref} à l’emplacement du numéro de colis." : "Use {ref} where the parcel number belongs."}><Input id="carrier-tracking" type="url" value={form.trackingUrl} onChange={(event) => setForm({ ...form, trackingUrl: event.target.value })} placeholder="https://suivi.example/{ref}" className="h-11" /></FormField><FormField id="carrier-logo" label={isFr ? "URL du logo" : "Logo URL"} hint={isFr ? "Optionnel, HTTPS recommandé." : "Optional, HTTPS recommended."}><Input id="carrier-logo" type="url" value={form.logo} onChange={(event) => setForm({ ...form, logo: event.target.value })} className="h-11" /></FormField><FormField id="carrier-rating" label={isFr ? "Note opérationnelle" : "Operational rating"}><select id="carrier-rating" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select></FormField>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}<DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer" : "Save carrier"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function WorkspaceTitle({ id, eyebrow, title, description, action }: { id: string; eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-charcoal/8 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="jma-eyebrow">{eyebrow}</p><h2 id={id} className="mt-1 text-xl font-black text-charcoal">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p></div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="min-w-0"><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label>{children}{hint ? <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">{hint}</p> : null}</div>;
}

function DeleteAction({ title, description, confirm, label, onConfirm, compact = false }: { title: string; description: string; confirm: string; label: string; onConfirm: () => void | Promise<boolean>; compact?: boolean }) {
  const cancel = /^delete|^edit|^confirm/i.test(`${title} ${confirm}`) ? "Cancel" : "Annuler";
  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" title={label} aria-label={label} className={`${compact ? "h-8 w-8" : "h-9 w-9"} text-destructive hover:bg-destructive/[0.06]`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><Trash2 className="h-5 w-5" /></span><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{cancel}</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">{confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
