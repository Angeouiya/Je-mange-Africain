"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Box, Boxes, CalendarClock, CheckCircle2, CircleDollarSign, ClipboardList, Clock3, CreditCard, Landmark, MapPin, PackageCheck, Smartphone, Snowflake, Truck, WalletCards } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import type { AdminOrder } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFetch } from "@/lib/use-fetch";
import { formatDate, formatDateTime, formatPrice, formatWeight, normalize, orderStatusColor, thermalLabel } from "@/lib/format";
import { ProductImage } from "@/components/shared/ProductImage";
import { JourneyRail, type JourneyStage } from "@/components/shared/JourneyRail";
import { OrderFulfillmentControl } from "@/components/admin/OrderFulfillmentControl";
import { fulfillmentStatusLabel, nextFulfillmentStatus } from "@/lib/admin-order-fulfillment";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/payment-methods";
import { europeanCountryLabel } from "@/lib/european-countries";

type FlowId = "all" | "validate" | "prepare" | "deliver" | "closed";

const FLOW_STATUSES: Record<Exclude<FlowId, "all">, string[]> = {
  validate: ["cart", "validated", "paymentPending", "paymentConfirmed", "stockReserved", "fraudCheck", "awaitingClient", "replacement"],
  prepare: ["preparing", "packed", "controlDone"],
  deliver: ["shipped", "in_transit", "out_for_delivery", "delivering"],
  closed: ["delivered", "cancelled", "failed", "refunded"],
};
const FLOW_ORDER: Array<Exclude<FlowId, "all">> = ["validate", "prepare", "deliver", "closed"];

function flowFor(status: string): Exclude<FlowId, "all"> {
  return (Object.entries(FLOW_STATUSES).find(([, statuses]) => statuses.includes(status))?.[0] as Exclude<FlowId, "all">) || "validate";
}

function statusLabel(status: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    cart: ["Brouillon", "Draft"], validated: ["Validée", "Validated"], paymentPending: ["Paiement attendu", "Payment pending"], paymentConfirmed: ["Paiement confirmé", "Payment confirmed"],
    stockReserved: ["Stock réservé", "Stock reserved"], preparing: ["En préparation", "Preparing"], packed: ["Colis prêt", "Packed"], controlDone: ["Contrôle terminé", "Quality checked"],
    created: ["Colis créé", "Parcel created"], shipped: ["Expédiée", "Shipped"], picked_up: ["Remis au transporteur", "Handed to carrier"], in_transit: ["En transit", "In transit"], out_for_delivery: ["En livraison", "Out for delivery"], delivering: ["En livraison", "Delivering"], returned: ["Retourné", "Returned"],
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

  const activeFlowLabel: Record<FlowId, string> = {
    all: isFr ? "Toutes les commandes" : "All orders",
    validate: isFr ? "Commandes à valider" : "Orders to validate",
    prepare: isFr ? "Commandes en préparation" : "Orders being packed",
    deliver: isFr ? "Commandes en livraison" : "Orders being delivered",
    closed: isFr ? "Commandes clôturées" : "Closed orders",
  };
  const orderStages: JourneyStage[] = [
    { id: "validate", icon: Clock3, label: isFr ? "À valider" : "To validate", detail: isFr ? "Paiement et stock" : "Payment and stock" },
    { id: "prepare", icon: PackageCheck, label: isFr ? "Préparation" : "Preparation", detail: isFr ? "Contrôle et colis" : "Checks and parcels" },
    { id: "deliver", icon: Truck, label: isFr ? "Livraison" : "Delivery", detail: isFr ? "Transport et suivi" : "Carrier and tracking" },
    { id: "closed", icon: CheckCircle2, label: isFr ? "Clôturée" : "Closed", detail: isFr ? "Livrée ou arrêtée" : "Delivered or stopped" },
  ];
  const selectedFlowIndex = selectedOrder ? FLOW_ORDER.indexOf(flowFor(selectedOrder.status)) : 0;
  const selectedInterrupted = selectedOrder ? ["cancelled", "failed", "refunded"].includes(selectedOrder.status) : false;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="flow"
        accent="#B9472B"
        icon={<ClipboardList className="h-5 w-5" />}
        eyebrow={isFr ? "Exécution des commandes" : "Order execution"}
        title={isFr ? "Du paiement jusqu'à la porte" : "From payment to the doorstep"}
        description={isFr ? "Chaque commande avance dans un flux explicite. Ouvrez une fiche pour contrôler ses articles, son paiement, ses colis et sa chronologie." : "Every order moves through an explicit workflow. Open a record to inspect items, payment, parcels and timeline."}
      />

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white sm:grid-cols-4" aria-label={isFr ? "Filtrer par étape opérationnelle" : "Filter by operational stage"}>
        {([
          ["validate", Clock3, isFr ? "À valider" : "To validate", counts.validate, "text-terre"],
          ["prepare", PackageCheck, isFr ? "En préparation" : "Packing", counts.prepare, "text-gold"],
          ["deliver", Truck, isFr ? "En livraison" : "Delivering", counts.deliver, "text-terre"],
          ["closed", CheckCircle2, isFr ? "Clôturées" : "Closed", counts.closed, "text-burgundy"],
        ] as const).map(([target, Icon, label, value, color], index) => <button key={target} type="button" onClick={() => setFlow(flow === target ? "all" : target)} aria-pressed={flow === target} aria-label={`${label}, ${value}`} className={`flex min-h-20 items-center gap-3 p-3 text-left transition hover:bg-burgundy/[0.035] sm:p-4 ${flow === target ? "bg-burgundy/[0.055] shadow-[inset_0_-2px_0_#8A3042]" : ""} ${index % 2 === 0 ? "border-r border-charcoal/8" : ""} ${index < 2 ? "border-b border-charcoal/8" : ""} ${index < 3 ? "sm:border-r" : "sm:border-r-0"} sm:border-b-0`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${flow === target ? "bg-white shadow-sm" : "bg-charcoal/[0.035]"}`}><Icon className={`h-5 w-5 ${color}`} /></span><span><span className="block text-xl font-black tabular-nums text-charcoal">{value}</span><span className="block text-[10px] font-bold leading-4 text-muted-foreground">{label}</span></span></button>)}
      </div>

      <div className="flex flex-col gap-3 border-y border-charcoal/8 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <div><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Vue active" : "Active view"}</p><p className="mt-0.5 text-xs font-extrabold text-charcoal">{activeFlowLabel[flow]} · {filteredOrders.length}</p></div>
          {flow !== "all" ? <button type="button" onClick={() => setFlow("all")} className="shrink-0 text-[10px] font-black text-terre hover:underline">{isFr ? "Voir toutes" : "View all"}</button> : null}
        </div>
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher une commande" : "Search orders"} placeholder={isFr ? "N°, destinataire ou ville" : "Number, recipient or city"} resultCount={filteredOrders.length} totalCount={orders.length} locale={locale} className="w-full xl:max-w-sm" />
      </div>

      {filteredOrders.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredOrders.map((order) => {
            const currentFlow = flowFor(order.status);
            const flowIndex = FLOW_ORDER.indexOf(currentFlow);
            const nextStatus = nextFulfillmentStatus(order.status);
            const coldChain = order.items.some((item) => item.thermalClass === "FROZEN" || item.thermalClass === "REFRIGERATED");
            return (
            <button key={order.id} type="button" data-testid={`admin-order-card-${order.id}`} onClick={() => setSelectedOrder(order)} className="group rounded-lg border border-charcoal/8 bg-white p-4 text-left transition [contain-intrinsic-size:236px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-terre/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-terre">{order.number}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(order.createdAt, locale)}</p></div><Badge className={`border ${orderStatusColor(order.status)}`}>{statusLabel(order.status, isFr)}</Badge></div>
              <div className="mt-4 flex items-center gap-3 border-y border-charcoal/8 py-3"><span className="flex shrink-0 -space-x-2" aria-label={isFr ? "Aperçu des produits" : "Product preview"}>{order.items.slice(0, 3).map((item) => <ProductImage key={item.id} src={item.imageUrl} alt={isFr ? item.nameFr : item.nameEn} emoji="" color="#F8F3EF" size="sm" className="h-9 w-9 border-2 border-white" rounded="rounded-md" />)}{order.items.length > 3 ? <span className="relative grid h-9 w-9 place-items-center rounded-md border-2 border-white bg-burgundy/10 text-[9px] font-black text-burgundy">+{order.items.length - 3}</span> : null}</span><span className="min-w-0 flex-1"><span className="block break-words text-xs font-extrabold leading-4 text-charcoal">{order.deliveryName}</span><span className="mt-0.5 flex items-start gap-1 text-[10px] leading-4 text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{order.deliveryPostalCode} {order.deliveryCity}</span></span></span>{coldChain ? <Snowflake className="h-4 w-4 shrink-0 text-burgundy" aria-label={isFr ? "Chaîne du froid" : "Cold chain"} /> : null}</div>
              <div className="mt-3 grid grid-cols-4 gap-1" role="progressbar" aria-label={`${isFr ? "Progression" : "Progress"}: ${statusLabel(order.status, isFr)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={(flowIndex + 1) * 25}>{FLOW_ORDER.map((stage, index) => <span key={stage} className={`h-1 rounded-sm ${index <= flowIndex ? "bg-terre" : "bg-charcoal/10"}`} />)}</div>
              <div className="mt-3 flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">{order.items.length} {isFr ? "article(s)" : "item(s)"} · {order.packageCount} {isFr ? "colis" : "parcel(s)"} · {formatWeight(order.weightGrams, locale)}</p><p className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase text-burgundy">{nextStatus ? <>{isFr ? "Prochaine" : "Next"}: {fulfillmentStatusLabel(nextStatus, locale)} <ArrowRight className="h-3 w-3" /></> : (isFr ? "Flux terminé" : "Workflow complete")}</p></div><p className="shrink-0 text-base font-black tabular-nums text-charcoal">{formatPrice(order.total, locale)}</p></div>
            </button>
            );
          })}
        </div>
      ) : <AdminEmptyState icon={<Box className="h-5 w-5" />} title={isFr ? "Aucune commande dans cette vue" : "No orders in this view"} description={isFr ? "Modifiez l'étape ou la recherche pour retrouver une commande." : "Change the stage or search to find an order."} />}

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent closeLabel={isFr ? "Fermer" : "Close"} className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-4xl">
          {selectedOrder ? <>
            <DialogHeader className="border-b border-border px-5 py-5 sm:px-6"><div className="flex flex-wrap items-center gap-2 pr-8"><DialogTitle className="text-xl font-black text-terre">{selectedOrder.number}</DialogTitle><Badge className={`border ${orderStatusColor(selectedOrder.status)}`}>{statusLabel(selectedOrder.status, isFr)}</Badge></div><DialogDescription>{formatDateTime(selectedOrder.createdAt, locale)} · {selectedOrder.deliveryName}</DialogDescription><div className="mt-4 grid grid-cols-3 divide-x divide-charcoal/10 border-y border-charcoal/8 py-3 text-left"><OrderDialogFact icon={CircleDollarSign} label={isFr ? "Total" : "Total"} value={formatPrice(selectedOrder.total, locale)} /><OrderDialogFact icon={PackageCheck} label={isFr ? "Préparation" : "Fulfilment"} value={`${selectedOrder.items.length} ${isFr ? "article(s)" : "item(s)"}`} /><OrderDialogFact icon={Truck} label={isFr ? "Expédition" : "Shipping"} value={`${selectedOrder.packageCount} ${isFr ? "colis" : "parcel(s)"}`} /></div></DialogHeader>
            <JourneyRail
              stages={orderStages}
              activeIndex={selectedFlowIndex}
              progress={selectedInterrupted ? 0 : (selectedFlowIndex + 1) * 25}
              label={isFr ? "Parcours opérationnel de la commande" : "Order operations journey"}
              progressLabel={selectedInterrupted
                ? (isFr ? "Parcours interrompu" : "Journey interrupted")
                : (isFr ? `Commande traitée à ${(selectedFlowIndex + 1) * 25} %` : `Order ${((selectedFlowIndex + 1) * 25)}% complete`)}
              interrupted={selectedInterrupted}
              testId="admin-order-progress"
              className="mx-5 mt-5 sm:mx-6"
            />
            <div className="grid gap-7 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] sm:px-6">
              <div className="space-y-6">
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Articles à préparer" : "Items to fulfil"}</h3><div className="mt-3 divide-y divide-border border-y border-border">{selectedOrder.items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><ProductImage src={item.imageUrl} alt={isFr ? item.nameFr : item.nameEn} emoji="" color="#F8F3EF" size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-burgundy/10 text-[10px] font-black text-burgundy">{item.qty}×</span><div className="min-w-0 flex-1"><p className="break-words text-xs font-bold leading-4">{isFr ? item.nameFr : item.nameEn}</p><p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">{item.salesChannel === "wholesale" ? <span className="inline-flex items-center gap-1 font-bold text-burgundy"><Boxes className="h-3 w-3" />{isFr ? "Gros" : "Wholesale"}</span> : null}{item.variantLabel ? <span className="font-bold text-charcoal">{item.variantLabel}</span> : null}<span>{item.sku} · {thermalLabel(item.thermalClass, locale)}</span></p></div><span className="shrink-0 text-xs font-extrabold">{formatPrice(item.lineTotal, locale)}</span></div>)}</div></section>
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Livraison" : "Delivery"}</h3><div className="mt-3 rounded-lg border border-burgundy/12 bg-[#FFF9F6] p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre text-white"><MapPin className="h-4 w-4" /></span><div className="min-w-0"><p className="break-words text-sm font-extrabold text-charcoal">{selectedOrder.deliveryName}</p><p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{selectedOrder.deliveryAddress}<br />{selectedOrder.deliveryPostalCode} {selectedOrder.deliveryCity}<br />{europeanCountryLabel(selectedOrder.deliveryCountry, locale)}{selectedOrder.customerEmail ? <><br />{selectedOrder.customerEmail}</> : null}{selectedOrder.customerPhone ? <><br />{selectedOrder.customerPhone}</> : null}</p></div></div>{selectedOrder.deliverySlot ? <p className="mt-3 border-t border-burgundy/10 pt-3 text-[10px] font-bold text-burgundy">{deliveryServiceLabel(selectedOrder.deliverySlot, isFr)}</p> : null}</div></section>
              </div>
              <div className="space-y-6">
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Progression" : "Progress"}</h3>{selectedOrder.timeline.length ? <ol className="mt-3 space-y-0">{selectedOrder.timeline.map((event, index) => <li key={`${event.status}-${event.at}`} className="relative flex gap-3 pb-5 last:pb-0"><span className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${index === selectedOrder.timeline.length - 1 ? "bg-terre text-white" : "bg-burgundy/10 text-burgundy"}`}><CheckCircle2 className="h-3.5 w-3.5" /></span>{index < selectedOrder.timeline.length - 1 ? <span className="absolute bottom-0 left-[13px] top-7 w-px bg-border" /> : null}<div><p className="text-xs font-bold text-charcoal">{event.label || statusLabel(event.status, isFr)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(event.at, locale)}{event.actor ? ` · ${event.actor}` : ""}</p></div></li>)}</ol> : <p className="mt-3 text-xs text-muted-foreground">{isFr ? "Aucun événement enregistré." : "No event recorded."}</p>}</section>
                <section><h3 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Paiement et colis" : "Payment and parcels"}</h3><div className="mt-3 divide-y divide-border border-y border-border text-xs">{selectedOrder.payments.map((payment, index) => <div key={`${payment.reference}-${index}`} className="flex items-center gap-3 py-3"><OrderPaymentIcon method={payment.method} /><div className="min-w-0 flex-1"><p className="font-bold text-charcoal">{paymentMethodLabel(payment.method, locale)}</p><p className="mt-0.5 break-all text-[10px] text-muted-foreground">{paymentMethodFamilyLabel(payment.method, locale)} · {paymentStatusLabel(payment.status, locale)}{payment.reference ? ` · ${payment.reference}` : ""}</p></div><strong className="shrink-0 tabular-nums">{formatPrice(payment.amount, locale)}</strong></div>)}{selectedOrder.shipments.map((shipment) => <div key={shipment.id} className="py-3"><div className="flex justify-between gap-3"><span className="font-bold">{shipment.carrier || (isFr ? "Transporteur" : "Carrier")}</span><span className="text-muted-foreground">{statusLabel(shipment.status, isFr)}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{shipment.trackingNumber || (isFr ? "Suivi à attribuer" : "Tracking pending")}{shipment.estimatedDelivery ? ` · ${formatDate(shipment.estimatedDelivery, locale)}` : ""}</p></div>)}</div></section>
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

function OrderPaymentIcon({ method }: { method: string }) {
  const family = paymentMethodFamily(method);
  const Icon = family === "card" ? CreditCard : family === "wallet" ? Smartphone : family === "bank" ? Landmark : family === "deferred" ? CalendarClock : WalletCards;
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/10 text-terre" aria-hidden="true"><Icon className="h-4 w-4" /></span>;
}

function OrderDialogFact({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return <div className="min-w-0 px-3 first:pl-0 last:pr-0"><p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-terre" />{label}</p><p className="mt-1 break-words text-[10px] font-extrabold leading-4 text-charcoal sm:text-xs">{value}</p></div>;
}

function deliveryServiceLabel(service: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    standard: ["Livraison standard", "Standard delivery"],
    express: ["Livraison express", "Express delivery"],
    relay: ["Point relais", "Collection point"],
  };
  return (labels[service] || [service, service])[isFr ? 0 : 1];
}
