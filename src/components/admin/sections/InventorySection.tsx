"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, CircleDollarSign, History, PackageCheck, Snowflake, Warehouse } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { BatchControlDialog, BatchReceiptDialog, BatchStatusBadge } from "@/components/admin/InventoryBatchDialogs";
import type { InventoryBatch, InventoryMovement, InventoryPayload, InventoryProductOption, InventoryWarehouseOption } from "@/components/admin/admin-types";
import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatDate, formatDateTime, formatPrice, normalize } from "@/lib/format";

type InventoryFilter = "all" | "priority" | "healthy";

const EMPTY_BATCHES: InventoryBatch[] = [];
const EMPTY_PRODUCTS: InventoryProductOption[] = [];
const EMPTY_WAREHOUSES: InventoryWarehouseOption[] = [];
const EMPTY_MOVEMENTS: InventoryMovement[] = [];

function daysUntil(date?: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function movementLabel(type: string, locale: "fr" | "en") {
  const isFr = locale === "fr";
  const labels: Record<string, string> = {
    receipt: isFr ? "Réception" : "Receipt",
    adjustment: isFr ? "Ajustement" : "Adjustment",
    release: isFr ? "Remise en vente" : "Released for sale",
    recall: isFr ? "Rappel sanitaire" : "Safety recall",
    loss: isFr ? "Sortie définitive" : "Permanent removal",
    reservation: isFr ? "Réservation" : "Reservation",
    pick: isFr ? "Prélèvement" : "Pick",
  };
  return labels[type] || type;
}

export default function InventorySection({ locale, canCreate = false, canUpdate = false }: { locale: "fr" | "en"; canCreate?: boolean; canUpdate?: boolean }) {
  const isFr = locale === "fr";
  const request = useFetch<InventoryPayload>(`/api/admin/stock?locale=${locale}`, [locale]);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [query, setQuery] = useState("");
  const batches = request.data?.batches ?? EMPTY_BATCHES;
  const products = request.data?.products ?? EMPTY_PRODUCTS;
  const warehouses = request.data?.warehouses ?? EMPTY_WAREHOUSES;
  const movements = request.data?.movements ?? EMPTY_MOVEMENTS;
  const priorityIds = useMemo(() => new Set(batches.filter((batch) => {
    const days = daysUntil(batch.expiryDate);
    return batch.status !== "active" || batch.quantity - batch.reserved <= 0 || (days !== null && days <= 14);
  }).map((batch) => batch.id)), [batches]);
  const warehouseCount = new Set(batches.map((batch) => batch.warehouse).filter(Boolean)).size;
  const availableUnits = batches.reduce((sum, batch) => sum + (batch.status === "active" ? Math.max(0, batch.quantity - batch.reserved) : 0), 0);
  const reservedUnits = batches.reduce((sum, batch) => sum + batch.reserved, 0);
  const availableValue = batches.reduce((sum, batch) => sum + (batch.status === "active" ? Math.max(0, batch.quantity - batch.reserved) * batch.costPrice : 0), 0);
  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const priority = priorityIds.has(batch.id);
    const matchesFilter = filter === "all" || (filter === "priority" ? priority : !priority);
    const matchesQuery = normalize(`${batch.productName} ${batch.productSku || ""} ${batch.lotNumber} ${batch.warehouse || ""}`).includes(normalize(query));
    return matchesFilter && matchesQuery;
  }), [batches, filter, priorityIds, query]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Contrôle des lots" : "Checking batches"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="control"
        accent="#C92A3E"
        icon={<Warehouse className="h-5 w-5" />}
        eyebrow={isFr ? "Disponibilité et traçabilité" : "Availability and traceability"}
        title={isFr ? "Inventaire piloté par les lots" : "Batch-led inventory"}
        description={isFr ? "Réceptionnez, valorisez et arbitrez chaque lot selon sa disponibilité réelle, sa chaîne thermique et son échéance FEFO." : "Receive, value and manage every batch using live availability, thermal class and FEFO expiry."}
        action={canCreate ? <BatchReceiptDialog locale={locale} products={products} warehouses={warehouses} disabled={request.loading} onCreated={request.refetch} /> : undefined}
      />

      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé et valeur de l'inventaire" : "Inventory health and value"}>
        <InventoryMetric position={0} icon={PackageCheck} label={isFr ? "Disponible à la vente" : "Available for sale"} value={String(availableUnits)} detail={isFr ? "unités nettes des réservations" : "units net of reservations"} tone="earth" />
        <InventoryMetric position={1} icon={Boxes} label={isFr ? "Déjà réservé" : "Already reserved"} value={String(reservedUnits)} detail={isFr ? "unités affectées aux commandes" : "units allocated to orders"} tone="burgundy" />
        <InventoryMetric position={2} icon={CircleDollarSign} label={isFr ? "Valeur brute disponible" : "Available gross value"} value={formatPrice(availableValue, locale)} detail={isFr ? "au coût réel des lots" : "at actual batch cost"} tone="gold" />
        <InventoryMetric position={3} icon={AlertTriangle} label={isFr ? "Lots à traiter" : "Batches to handle"} value={String(priorityIds.size)} detail={isFr ? `${warehouseCount} site${warehouseCount > 1 ? "s" : ""} de stockage` : `${warehouseCount} storage site${warehouseCount === 1 ? "" : "s"}`} tone={priorityIds.size ? "alert" : "burgundy"} />
      </section>

      <div className="flex items-start gap-3 border-y border-burgundy/15 bg-burgundy/[0.045] px-4 py-3 text-xs leading-5 text-burgundy"><Snowflake className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>FEFO</strong> · {isFr ? "Les lots expirant le plus tôt alimentent les prochaines préparations. Un lot bloqué ou rappelé sort immédiatement du stock vendable." : "Earliest-expiring batches feed upcoming fulfilment. Blocked or recalled batches leave sellable stock immediately."}</p></div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Santé des lots" : "Batch health"} items={[
          { value: "all", label: isFr ? "Tous les lots" : "All batches", count: batches.length },
          { value: "priority", label: isFr ? "À traiter" : "Action needed", count: priorityIds.size },
          { value: "healthy", label: isFr ? "Disponibles" : "Available", count: batches.length - priorityIds.size },
        ]} />
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un lot" : "Search batches"} placeholder={isFr ? "Produit, SKU, lot ou entrepôt" : "Product, SKU, batch or warehouse"} resultCount={filteredBatches.length} totalCount={batches.length} locale={locale} className="w-full lg:max-w-sm" />
      </div>

      {filteredBatches.length ? <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des lots" : "Batch register"}>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Produit et lot" : "Product and batch"}</TableHead><TableHead>{isFr ? "Entrepôt" : "Warehouse"}</TableHead><TableHead>{isFr ? "Stock" : "Stock"}</TableHead><TableHead>{isFr ? "Péremption" : "Expiry"}</TableHead><TableHead>{isFr ? "Valeur brute" : "Gross value"}</TableHead><TableHead>{isFr ? "Statut" : "Status"}</TableHead><TableHead className="text-right">{isFr ? "Contrôle" : "Control"}</TableHead></TableRow></TableHeader><TableBody>{filteredBatches.map((batch) => {
          const days = daysUntil(batch.expiryDate);
          const available = Math.max(0, batch.quantity - batch.reserved);
          return <TableRow key={batch.id}><TableCell><div className="flex items-center gap-3"><ProductImage src={batch.productImageUrl} alt={batch.productName} emoji="" color={batch.productImageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><div><p className="text-sm font-extrabold">{batch.productName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{batch.lotNumber}{batch.productSku ? ` · ${batch.productSku}` : ""}</p></div></div></TableCell><TableCell className="text-xs">{batch.warehouse || "—"}</TableCell><TableCell><p className="font-black tabular-nums text-charcoal">{available} <span className="text-[9px] font-semibold text-muted-foreground">{isFr ? "dispo." : "avail."}</span></p><p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{batch.reserved} {isFr ? "réservé" : "reserved"}</p></TableCell><TableCell><p className={`text-xs font-bold ${days !== null && days <= 14 ? "text-terre" : "text-charcoal"}`}>{batch.expiryDate ? formatDate(batch.expiryDate, locale) : "—"}</p>{days !== null ? <p className="mt-0.5 text-[10px] text-muted-foreground">{days < 0 ? (isFr ? "expiré" : "expired") : `${days} ${isFr ? "jour(s)" : "day(s)"}`}</p> : null}</TableCell><TableCell><p className="text-xs font-black tabular-nums">{formatPrice(batch.quantity * batch.costPrice, locale)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatPrice(batch.costPrice, locale)} / {isFr ? "unité" : "unit"}</p></TableCell><TableCell><BatchStatusBadge status={batch.status} locale={locale} /></TableCell><TableCell className="text-right"><BatchControlDialog batch={batch} locale={locale} canUpdate={canUpdate} onUpdated={request.refetch} /></TableCell></TableRow>;
        })}</TableBody></Table></div>
        <div className="divide-y divide-border md:hidden">{filteredBatches.map((batch) => {
          const days = daysUntil(batch.expiryDate);
          const available = Math.max(0, batch.quantity - batch.reserved);
          return <article key={batch.id} className="p-4"><div className="flex items-start gap-3"><ProductImage src={batch.productImageUrl} alt={batch.productName} emoji="" color={batch.productImageColor} size="sm" className="h-12 w-12 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{batch.productName}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{batch.lotNumber} · {batch.warehouse || "—"}</p></div><BatchStatusBadge status={batch.status} locale={locale} /></div></div></div><div className="mt-3 grid grid-cols-3 gap-2 border-y border-charcoal/8 py-3 text-[10px]"><div><span className="block text-muted-foreground">{isFr ? "Disponible" : "Available"}</span><strong className="mt-1 block text-sm tabular-nums">{available}</strong></div><div><span className="block text-muted-foreground">{isFr ? "Réservé" : "Reserved"}</span><strong className="mt-1 block text-sm tabular-nums">{batch.reserved}</strong></div><div><span className="block text-muted-foreground">{isFr ? "Échéance" : "Expiry"}</span><strong className={`mt-1 block text-sm tabular-nums ${days !== null && days <= 14 ? "text-terre" : ""}`}>{days === null ? "—" : days < 0 ? (isFr ? "Expiré" : "Expired") : `${days} j`}</strong></div></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-muted-foreground"><strong className="text-charcoal">{formatPrice(batch.quantity * batch.costPrice, locale)}</strong> · {isFr ? "valeur brute" : "gross value"}</p><BatchControlDialog batch={batch} locale={locale} canUpdate={canUpdate} onUpdated={request.refetch} /></div></article>;
        })}</div>
      </section> : <AdminEmptyState icon={<CalendarClock className="h-5 w-5" />} title={isFr ? "Aucun lot dans cette vue" : "No batches in this view"} description={isFr ? "Modifiez le filtre ou la recherche, ou réceptionnez un nouveau lot." : "Change the filter or search, or receive a new batch."} />}

      {movements.length ? <section aria-labelledby="stock-history-title"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-muted-foreground">{isFr ? "Traçabilité" : "Traceability"}</p><h3 id="stock-history-title" className="mt-1 text-lg font-black text-charcoal">{isFr ? "Derniers mouvements" : "Latest movements"}</h3></div><Badge variant="outline" className="border-charcoal/12 text-[9px] text-muted-foreground"><History className="mr-1 h-3 w-3" />{movements.length}</Badge></div><div className="divide-y divide-charcoal/8 border-y border-charcoal/8 bg-white">{movements.slice(0, 6).map((movement) => <div key={movement.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4"><span className={`grid h-9 w-9 place-items-center rounded-md ${movement.quantity < 0 ? "bg-destructive/[0.07] text-destructive" : "bg-burgundy/[0.07] text-burgundy"}`}><History className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-charcoal">{movementLabel(movement.type, locale)} · {movement.productName}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{movement.lotNumber || "—"} · {movement.warehouse}{movement.reason ? ` · ${movement.reason}` : ""}</p></div><div className="text-right"><p className={`text-sm font-black tabular-nums ${movement.quantity < 0 ? "text-destructive" : "text-burgundy"}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{formatDateTime(movement.createdAt, locale)}</p></div></div>)}</div></section> : null}
    </div>
  );
}

function InventoryMetric({ position, icon: Icon, label, value, detail, tone }: { position: number; icon: typeof Boxes; label: string; value: string; detail: string; tone: "earth" | "burgundy" | "gold" | "alert" }) {
  const style = tone === "earth" ? "bg-terre text-white" : tone === "burgundy" ? "bg-burgundy text-white" : tone === "gold" ? "bg-gold text-charcoal" : "bg-destructive text-white";
  return <div className={`min-w-0 p-3 sm:p-5 ${position < 2 ? "border-b" : ""} ${position % 2 === 0 ? "border-r" : ""} border-charcoal/8 xl:border-b-0 ${position < 3 ? "xl:border-r" : "xl:border-r-0"}`}><span className={`grid h-9 w-9 place-items-center rounded-md ${style}`}><Icon className="h-4 w-4" /></span><p className="mt-3 truncate text-xl font-black tabular-nums text-charcoal sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{detail}</p></div>;
}
