"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, Snowflake, Warehouse } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { InventoryBatch } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatDate, normalize } from "@/lib/format";

type InventoryFilter = "all" | "priority" | "healthy";

function daysUntil(date?: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function InventorySection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<{ batches: InventoryBatch[] }>(`/api/admin/stock?locale=${locale}`, [locale]);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [query, setQuery] = useState("");
  const batches = data?.batches || [];
  const priorityBatches = useMemo(() => batches.filter((batch) => { const days = daysUntil(batch.expiryDate); return batch.status !== "active" || batch.quantity - batch.reserved <= 0 || (days !== null && days <= 14); }), [batches]);
  const warehouseCount = new Set(batches.map((batch) => batch.warehouse).filter(Boolean)).size;
  const availableUnits = batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity - batch.reserved), 0);
  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const priority = priorityBatches.some((item) => item.id === batch.id);
    const matchesFilter = filter === "all" || (filter === "priority" ? priority : !priority);
    const matchesQuery = normalize(`${batch.productName} ${batch.lotNumber} ${batch.warehouse || ""}`).includes(normalize(query));
    return matchesFilter && matchesQuery;
  }), [batches, filter, priorityBatches, query]);

  if (loading) return <AdminSectionLoading label={isFr ? "Contrôle des lots" : "Checking batches"} />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="control"
        accent="#C92A3E"
        icon={<Warehouse className="h-5 w-5" />}
        eyebrow={isFr ? "Disponibilité et traçabilité" : "Availability and traceability"}
        title={isFr ? "Inventaire piloté par les lots" : "Batch-led inventory"}
        description={isFr ? "Les priorités sont calculées selon la quantité disponible, le statut du lot et la date de péremption. Les lots les plus proches de l'échéance passent en premier." : "Priorities are calculated from available quantity, batch status and expiry date. Earliest-expiring batches come first."}
      />

      <section className="grid grid-cols-3 overflow-hidden rounded-lg bg-charcoal text-white" aria-label={isFr ? "Santé de l'inventaire" : "Inventory health"}>
        <div className="min-w-0 p-3 sm:flex sm:items-center sm:gap-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-gold sm:h-11 sm:w-11"><Boxes className="h-5 w-5" /></span><div><p className="mt-3 text-xl font-black tabular-nums sm:mt-0 sm:text-2xl">{availableUnits}</p><p className="mt-1 text-[9px] leading-4 text-white/45 sm:text-[10px]">{isFr ? "unités disponibles" : "available units"}</p></div></div>
        <div className="min-w-0 border-l border-white/10 p-3 sm:flex sm:items-center sm:gap-4 sm:p-5"><span className={`grid h-9 w-9 place-items-center rounded-md sm:h-11 sm:w-11 ${priorityBatches.length ? "bg-gold text-charcoal" : "bg-forest text-white"}`}><AlertTriangle className="h-5 w-5" /></span><div><p className="mt-3 text-xl font-black tabular-nums sm:mt-0 sm:text-2xl">{priorityBatches.length}</p><p className="mt-1 text-[9px] leading-4 text-white/45 sm:text-[10px]">{isFr ? "lots prioritaires" : "priority batches"}</p></div></div>
        <div className="min-w-0 border-l border-white/10 p-3 sm:flex sm:items-center sm:gap-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white sm:h-11 sm:w-11"><Warehouse className="h-5 w-5" /></span><div><p className="mt-3 text-xl font-black tabular-nums sm:mt-0 sm:text-2xl">{warehouseCount}</p><p className="mt-1 text-[9px] leading-4 text-white/45 sm:text-[10px]">{isFr ? "sites de stockage" : "storage sites"}</p></div></div>
      </section>

      <div className="flex items-start gap-3 rounded-lg border border-forest/15 bg-forest/[0.045] px-4 py-3 text-xs leading-5 text-forest"><Snowflake className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>FEFO</strong> · {isFr ? "Les lots expirant le plus tôt doivent alimenter les prochaines préparations, sous réserve de leur statut sanitaire." : "Earliest-expiring batches should feed upcoming fulfilment, subject to their safety status."}</p></div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Santé des lots" : "Batch health"} items={[
          { value: "all", label: isFr ? "Tous les lots" : "All batches", count: batches.length },
          { value: "priority", label: isFr ? "À traiter" : "Action needed", count: priorityBatches.length },
          { value: "healthy", label: isFr ? "Sains" : "Healthy", count: batches.length - priorityBatches.length },
        ]} />
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un lot" : "Search batches"} placeholder={isFr ? "Produit, lot ou entrepôt" : "Product, batch or warehouse"} resultCount={filteredBatches.length} totalCount={batches.length} locale={locale} className="w-full lg:max-w-sm" />
      </div>

      {filteredBatches.length ? <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Produit et lot" : "Product and batch"}</TableHead><TableHead>{isFr ? "Entrepôt" : "Warehouse"}</TableHead><TableHead>{isFr ? "Disponible" : "Available"}</TableHead><TableHead>{isFr ? "Réservé" : "Reserved"}</TableHead><TableHead>{isFr ? "Péremption" : "Expiry"}</TableHead><TableHead>{isFr ? "Priorité" : "Priority"}</TableHead></TableRow></TableHeader><TableBody>{filteredBatches.map((batch) => {
          const days = daysUntil(batch.expiryDate); const available = Math.max(0, batch.quantity - batch.reserved); const priority = priorityBatches.some((item) => item.id === batch.id);
          return <TableRow key={batch.id}><TableCell><p className="text-sm font-extrabold">{batch.productName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{batch.lotNumber}</p></TableCell><TableCell className="text-xs">{batch.warehouse || "—"}</TableCell><TableCell className="font-black tabular-nums">{available}</TableCell><TableCell className="text-xs tabular-nums text-muted-foreground">{batch.reserved}</TableCell><TableCell><p className={`text-xs font-bold ${days !== null && days <= 14 ? "text-terre" : "text-charcoal"}`}>{batch.expiryDate ? formatDate(batch.expiryDate, locale) : "—"}</p>{days !== null ? <p className="mt-0.5 text-[10px] text-muted-foreground">{days < 0 ? (isFr ? "expiré" : "expired") : `${days} ${isFr ? "jour(s)" : "day(s)"}`}</p> : null}</TableCell><TableCell><Badge variant="outline" className={priority ? "border-gold/40 bg-gold/[0.09] text-charcoal" : "border-forest/25 bg-forest/[0.04] text-forest"}>{priority ? (isFr ? "À traiter" : "Action") : (isFr ? "Sain" : "Healthy")}</Badge></TableCell></TableRow>;
        })}</TableBody></Table></div>
        <div className="divide-y divide-border md:hidden">{filteredBatches.map((batch) => { const days = daysUntil(batch.expiryDate); const available = Math.max(0, batch.quantity - batch.reserved); const priority = priorityBatches.some((item) => item.id === batch.id); return <div key={batch.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{batch.productName}</p><p className="mt-1 text-[10px] text-muted-foreground">{batch.lotNumber} · {batch.warehouse || "—"}</p></div><Badge variant="outline" className={priority ? "border-gold/40 bg-gold/[0.09] text-charcoal" : "border-forest/25 text-forest"}>{priority ? (isFr ? "Priorité" : "Priority") : (isFr ? "Sain" : "Healthy")}</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-charcoal/8 pt-3 text-[10px]"><div><span className="block text-muted-foreground">{isFr ? "Disponible" : "Available"}</span><strong className="mt-1 block text-sm">{available}</strong></div><div><span className="block text-muted-foreground">{isFr ? "Réservé" : "Reserved"}</span><strong className="mt-1 block text-sm">{batch.reserved}</strong></div><div><span className="block text-muted-foreground">{isFr ? "Échéance" : "Expiry"}</span><strong className="mt-1 block text-sm">{days === null ? "—" : `${days} j`}</strong></div></div></div>; })}</div>
      </div> : <AdminEmptyState icon={<CalendarClock className="h-5 w-5" />} title={isFr ? "Aucun lot dans cette vue" : "No batches in this view"} description={isFr ? "Modifiez le filtre ou la recherche pour afficher d'autres lots." : "Change the filter or search to display other batches."} />}
    </div>
  );
}
