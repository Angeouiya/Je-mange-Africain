"use client";

import { useMemo, useState } from "react";
import { Box, Boxes, CheckCircle2, ClipboardList, Clock3, MapPin, PackageCheck, Truck, UserRound } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminOrder } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFetch } from "@/lib/use-fetch";
import { formatDate, formatDateTime, formatPrice, formatWeight, normalize, orderStatusColor, thermalLabel } from "@/lib/format";
import { ProductImage } from "@/components/shared/ProductImage";
import { OrderFulfillmentControl } from "@/components/admin/OrderFulfillmentControl";

type FlowId = "all" | "validate" | "prepare" | "deliver" | "closed";

const FLOW_STATUSES: Record<Exclude<FlowId, "all">, string[]> = {
  validate: ["cart", "validated", "paymentPending", "paymentConfirmed", "stockReserved", "fraudCheck", "awaitingClient", "replacement"],
  prepare: ["preparing", "packed", "controlDone"],
  deliver: ["shipped", "in_transit", "out_for_delivery", "delivering"],
  closed: ["delivered", "cancelled", "failed", "refunded"],
};

function flowFor(status: string): Exclude<FlowId, "all"> {
  return (Object.entries(FLOW_STATUSES).find(([, statuses]) => statuses.includes(status))?.[0] as Exclude<FlowId, "all">) || "validate";
}

function statusLabel(status: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    cart: ["Brouillon", "Draft"], validated: ["Validée", "Validated"], paymentPending: ["Paiement attendu", "Payment pending"], paymentConfirmed: ["Paiement confirmé", "Payment confirmed"],
    stockReserved: ["Stock réservé", "Stock reserved"], preparing: ["En préparation", "Preparing"], packed: ["Colis prêt", "Packed"], controlDone: ["Contrôle terminé", "Quality checked"],
    shipped: ["Expédiée", "Shipped"], in_transit: ["En transit", "In transit"], out_for_delivery: ["En livraison", "Out for delivery"], delivering: ["En livraison", "Delivering"],
    delivered: ["Livrée", "Delivered"], cancelled: ["Annulée", "Cancelled"], failed: ["Échec", "Failed"], refunded: ["Remboursée", "Refunded"],
  };
  return (labels[status] || [status, status])[isFr ? 0 : 1];
}

export default function OrdersSection({ locale, canUpdate }: { locale: "fr" | "en"; canUpdate: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<{ orders: AdminOrder[] }>(`/api/orders?locale=${locale}`, [locale]);
  const [flow, setFlow] = useState<FlowId>("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderOverrides, setOrderOverrides] = useState<Record<string, AdminOrder>>({});
  const orders = useMemo(() => (data?.orders || []).map((order) => orderOverrides[order.id] || order), [data?.orders, orderOverrides]);
  const counts = useMemo(() => ({
    all: orders.length,
    validate: orders.filter((order) => flowFor(order.status) === "validate").length,
    prepare: orders.filter((order) => flowFor(order.status) === "prepare").length,
    deliver: orders.filter((order) => flowFor(order.status) === "deliver").length,
    closed: orders.filter((order) => flowFor(order.status) === "closed").length,
  }), [orders]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesFlow = flow === "all" || flowFor(order.status) === flow;
    const matchesQuery = normalize(`${order.number} ${order.deliveryName} ${order.deliveryCity} ${order.deliveryPostalCode}`).includes(normalize(query));
    return matchesFlow && matchesQuery;
  }), [orders, flow, query]);

  if (loading) return <AdminSectionLoading label={isFr ? "Synchronisation des commandes" : "Synchronising orders"} />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;

  const flowItems: Array<{ value: FlowId; label: string; count: number }> = [
    { value: "all", label: isFr ? "Toutes" : "All", count: counts.all },
    { value: "validate", label: isFr ? "À valider" : "Validate", count: counts.validate },
    { value: "prepare", label: isFr ? "Préparation" : "Packing", count: counts.prepare },
    { value: "deliver", label: isFr ? "Livraison" : "Delivery", count: counts.deliver },
    { value: "closed", label: isFr ? "Clôturées" : "Closed", count: counts.closed },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="flow"
        accent="#326B8A"
        icon={<ClipboardList className="h-5 w-5" />}
        eyebrow={isFr ? "Exécution des commandes" : "Order execution"}
        title={isFr ? "Du paiement jusqu'à la porte" : "From payment to the doorstep"}
        description={isFr ? "Chaque commande avance dans un flux explicite. Ouvrez une fiche pour contrôler ses articles, son paiement, ses colis et sa chronologie." : "Every order moves through an explicit workflow. Open a record to inspect items, payment, parcels and timeline."}
      />

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white sm:grid-cols-4">
        {([
          [Clock3, isFr ? "À valider" : "To validate", counts.validate, "text-terre"],
          [PackageCheck, isFr ? "En préparation" : "Packing", counts.prepare, "text-gold"],
          [Truck, isFr ? "En livraison" : "Delivering", counts.deliver, "text-blue-700"],
          [CheckCircle2, isFr ? "Clôturées" : "Closed", counts.closed, "text-forest"],
        ] as const).map(([Icon, label, value, color], index) => <div key={label} className={`flex items-center gap-3 p-3 sm:p-4 ${index % 2 === 0 ? "border-r border-charcoal/8" : ""} ${index < 2 ? "border-b border-charcoal/8" : ""} ${index < 3 ? "sm:border-r" : "sm:border-r-0"} sm:border-b-0`}><Icon className={`h-5 w-5 ${color}`} /><div><p className="text-xl font-black tabular-nums">{value}</p><p className="text-[10px] font-bold text-muted-foreground">{label}</p></div></div>)}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SectionTabs value={flow} onChange={setFlow} label={isFr ? "Étapes du flux" : "Workflow stages"} items={flowItems} />
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher une commande" : "Search orders"} placeholder={isFr ? "N°, destinataire ou ville" : "Number, recipient or city"} resultCount={filteredOrders.length} totalCount={orders.length} locale={locale} className="w-full xl:max-w-sm" />
      </div>

      {filteredOrders.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <button key={order.id} type="button" onClick={() => setSelectedOrder(order)} className="group rounded-lg border border-charcoal/8 bg-white p-4 text-left transition [contain-intrinsic-size:220px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-terre/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-terre">{order.number}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(order.createdAt, locale)}</p></div><Badge className={`border ${orderStatusColor(order.status)}`}>{statusLabel(order.status, isFr)}</Badge></div>
              <div className="mt-4 flex items-center gap-3 border-y border-charcoal/8 py-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-charcoal/5 text-charcoal"><UserRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{order.deliveryName}</p><p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> {order.deliveryPostalCode} {order.deliveryCity}</p></div></div>
              <div className="mt-3 flex items-end justify-between"><div><p className="text-[10px] text-muted-foreground">{order.items.length} {isFr ? "article(s)" : "item(s)"} · {order.packageCount} {isFr ? "colis" : "parcel(s)"}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatWeight(order.weightGrams, locale)}</p></div><p className="text-base font-black tabular-nums text-charcoal">{formatPrice(order.total, locale)}</p></div>
            </button>
          ))}
        </div>
      ) : <AdminEmptyState icon={<Box className="h-5 w-5" />} title={isFr ? "Aucune commande dans cette vue" : "No orders in this view"} description={isFr ? "Modifiez l'étape ou la recherche pour retrouver une commande." : "Change the stage or search to find an order."} />}

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-4xl">
          {selectedOrder ? <>
            <DialogHeader className="border-b border-border px-5 py-5 sm:px-6"><div className="flex flex-wrap items-center gap-2 pr-8"><DialogTitle className="text-xl font-black text-terre">{selectedOrder.number}</DialogTitle><Badge className={`border ${orderStatusColor(selectedOrder.status)}`}>{statusLabel(selectedOrder.status, isFr)}</Badge></div><DialogDescription>{formatDateTime(selectedOrder.createdAt, locale)} · {selectedOrder.items.length} {isFr ? "articles" : "items"} · {formatPrice(selectedOrder.total, locale)}</DialogDescription></DialogHeader>
            <div className="grid gap-7 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] sm:px-6">
              <div className="space-y-6">
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Articles à préparer" : "Items to fulfil"}</h3><div className="mt-3 divide-y divide-border border-y border-border">{selectedOrder.items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><ProductImage src={item.imageUrl} alt={isFr ? item.nameFr : item.nameEn} emoji="🍲" color="#D65A32" size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-charcoal text-[10px] font-black text-white">{item.qty}×</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{isFr ? item.nameFr : item.nameEn}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">{item.salesChannel === "wholesale" ? <span className="inline-flex items-center gap-1 font-bold text-forest"><Boxes className="h-3 w-3" />{isFr ? "Gros" : "Wholesale"}</span> : null}<span>{item.sku} · {thermalLabel(item.thermalClass, locale)}</span></p></div><span className="text-xs font-extrabold">{formatPrice(item.lineTotal, locale)}</span></div>)}</div></section>
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Livraison" : "Delivery"}</h3><div className="mt-3 rounded-lg bg-charcoal p-4 text-white"><p className="text-sm font-extrabold">{selectedOrder.deliveryName}</p><p className="mt-2 text-xs leading-5 text-white/65">{selectedOrder.deliveryAddress}<br />{selectedOrder.deliveryPostalCode} {selectedOrder.deliveryCity}<br />{selectedOrder.deliveryCountry}{selectedOrder.customerEmail ? <><br />{selectedOrder.customerEmail}</> : null}{selectedOrder.customerPhone ? <><br />{selectedOrder.customerPhone}</> : null}</p>{selectedOrder.deliverySlot ? <p className="mt-3 border-t border-white/10 pt-3 text-[10px] font-bold text-gold">{deliveryServiceLabel(selectedOrder.deliverySlot, isFr)}</p> : null}</div></section>
              </div>
              <div className="space-y-6">
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Progression" : "Progress"}</h3>{selectedOrder.timeline.length ? <ol className="mt-3 space-y-0">{selectedOrder.timeline.map((event, index) => <li key={`${event.status}-${event.at}`} className="relative flex gap-3 pb-5 last:pb-0"><span className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${index === selectedOrder.timeline.length - 1 ? "bg-terre text-white" : "bg-forest/10 text-forest"}`}><CheckCircle2 className="h-3.5 w-3.5" /></span>{index < selectedOrder.timeline.length - 1 ? <span className="absolute bottom-0 left-[13px] top-7 w-px bg-border" /> : null}<div><p className="text-xs font-bold text-charcoal">{event.label || statusLabel(event.status, isFr)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(event.at, locale)}{event.actor ? ` · ${event.actor}` : ""}</p></div></li>)}</ol> : <p className="mt-3 text-xs text-muted-foreground">{isFr ? "Aucun événement enregistré." : "No event recorded."}</p>}</section>
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Paiement et colis" : "Payment and parcels"}</h3><div className="mt-3 divide-y divide-border border-y border-border text-xs">{selectedOrder.payments.map((payment, index) => <div key={`${payment.reference}-${index}`} className="flex justify-between gap-3 py-3"><span>{payment.method} · <span className="text-muted-foreground">{payment.status}</span></span><strong>{formatPrice(payment.amount, locale)}</strong></div>)}{selectedOrder.shipments.map((shipment) => <div key={shipment.id} className="py-3"><div className="flex justify-between gap-3"><span className="font-bold">{shipment.carrier || (isFr ? "Transporteur" : "Carrier")}</span><span className="text-muted-foreground">{shipment.status}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{shipment.trackingNumber || (isFr ? "Suivi à attribuer" : "Tracking pending")}{shipment.estimatedDelivery ? ` · ${formatDate(shipment.estimatedDelivery, locale)}` : ""}</p></div>)}</div></section>
              </div>
            </div>
            <OrderFulfillmentControl
              key={selectedOrder.id}
              order={selectedOrder}
              locale={locale}
              canUpdate={canUpdate}
              onUpdated={(updatedOrder) => {
                setSelectedOrder(updatedOrder);
                setOrderOverrides((current) => ({ ...current, [updatedOrder.id]: updatedOrder }));
              }}
            />
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function deliveryServiceLabel(service: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    standard: ["Livraison standard", "Standard delivery"],
    express: ["Livraison express", "Express delivery"],
    relay: ["Point relais", "Collection point"],
  };
  return (labels[service] || [service, service])[isFr ? 0 : 1];
}
