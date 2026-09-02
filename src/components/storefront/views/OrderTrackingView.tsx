"use client";

import { motion } from "framer-motion";
import { AlertCircle, CalendarDays, Camera, CheckCircle2, Circle, ClipboardSignature, Download, ExternalLink, MapPin, Truck, Package, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { deliveryServiceLabel, formatPrice, formatDate, formatDateTime, orderStatusColor, orderStatusKey, thermalColor, thermalLabel } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/client-actions";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";

export function OrderTrackingView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const { data: order, loading, error, refetch } = useFetch(customer && params.orderId ? `/api/orders/${params.orderId}?locale=${locale}` : null, [customer?.id, params.orderId, locale]);

  if (!customer) return <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span><h1 className="mt-4 font-display text-2xl font-semibold text-charcoal">{locale === "fr" ? "Suivi protégé" : "Protected tracking"}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Connectez-vous avec le compte ayant passé cette commande." : "Sign in with the account that placed this order."}</p><Button onClick={() => navigate("account")} className="mt-5 bg-terre text-white hover:bg-terre-dark">{t.nav.login}</Button></div></div>;
  if (loading) return <div className="mx-auto max-w-3xl px-4 py-6"><Skeleton className="h-96 rounded-lg" /></div>;
  if (error) return <div className="mx-auto grid min-h-[45vh] max-w-md place-items-center px-4 text-center"><div><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 text-sm font-bold text-charcoal">{locale === "fr" ? "Suivi momentanément indisponible" : "Tracking temporarily unavailable"}</p><Button type="button" variant="outline" size="sm" onClick={refetch} className="mt-3">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">{locale === "fr" ? "Commande introuvable." : "Order not found."}</div>;

  const isInterrupted = ["cancelled", "failed", "refunded"].includes(order.status);
  const stageIndex = isInterrupted ? -1 : order.status === "delivered" ? 3
    : ["shipped", "in_transit", "out_for_delivery", "delivering"].includes(order.status) ? 2
      : ["preparing", "packed", "controlDone"].includes(order.status) ? 1 : 0;
  const estimatedDelivery = order.shipments.find((shipment: any) => shipment.estimatedDelivery)?.estimatedDelivery;
  const deliveryStages = [
    { icon: CheckCircle2, fr: "Confirmée", en: "Confirmed" },
    { icon: Package, fr: "Préparée", en: "Packed" },
    { icon: Truck, fr: "En route", en: "On the way" },
    { icon: MapPin, fr: "Livrée", en: "Delivered" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="orders" className="mb-4" />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-terre">{locale === "fr" ? "Suivi de commande" : "Order tracking"}</p>
          <h1 className="font-display text-3xl font-semibold text-charcoal">{order.number}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{locale === "fr" ? "Commandée le" : "Ordered on"} {formatDate(order.createdAt, locale)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className={`border ${orderStatusColor(order.status)}`}>{t.orders.statuses[orderStatusKey(order.status) as keyof typeof t.orders.statuses] || order.status}</Badge>
          <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => downloadOrderInvoice(order, locale)}><Download className="h-3.5 w-3.5" />{t.orders.invoice}</Button>
        </div>
      </div>

      <section className="mb-5 grid gap-3 border-b border-border pb-5 sm:grid-cols-2" aria-label={locale === "fr" ? "Informations de livraison" : "Delivery information"}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><CalendarDays className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{t.orders.estimatedDelivery}</p><p className="truncate text-sm font-black text-charcoal">{estimatedDelivery ? formatDate(estimatedDelivery, locale) : (locale === "fr" ? "Estimation à venir" : "Estimate pending")}</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-terre/10 text-terre"><Truck className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{locale === "fr" ? "Service" : "Service"}</p><p className="truncate text-sm font-black text-charcoal">{deliveryServiceLabel(order.deliverySlot, locale) || (locale === "fr" ? "À confirmer" : "To be confirmed")}</p></div>
        </div>
      </section>

      {isInterrupted ? <div className="mb-5 flex gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{locale === "fr" ? "Cette commande n’est plus dans le parcours de livraison normal. Consultez le dernier événement ci-dessous pour connaître sa situation." : "This order is no longer in the standard delivery flow. Check the latest event below for its current situation."}</p></div> : null}

      <section className="mb-5 overflow-hidden rounded-lg border border-border bg-white px-3 py-4" aria-label={locale === "fr" ? "Progression de la livraison" : "Delivery progress"}>
        <ol className="grid grid-cols-4">{deliveryStages.map((stage, index) => <li key={stage.fr} className="relative flex min-w-0 flex-col items-center text-center">{index > 0 ? <span className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= stageIndex ? "bg-forest" : "bg-border"}`} /> : null}<span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full ${index <= stageIndex ? "bg-forest text-white" : isInterrupted && index === 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}><stage.icon className="h-4 w-4" /></span><span className={`mt-2 truncate text-[9px] font-bold sm:text-[10px] ${index <= stageIndex ? "text-forest" : isInterrupted && index === 0 ? "text-destructive" : "text-muted-foreground"}`}>{locale === "fr" ? stage.fr : stage.en}</span></li>)}</ol>
      </section>

      <div className="grid items-start gap-5 md:grid-cols-2">
        {/* timeline */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-charcoal">{t.orders.timeline}</h2>
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {order.timeline.map((e: any, i: number) => {
              const isLast = i === order.timeline.length - 1;
              return (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                  <span className={`absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full ${isLast ? (isInterrupted ? "bg-destructive text-white" : "bg-forest text-cream") : "bg-muted text-muted-foreground"}`}>
                    {isLast ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                  </span>
                  <p className="text-sm font-semibold text-charcoal">{t.orders.statuses[orderStatusKey(e.status) as keyof typeof t.orders.statuses] || e.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(e.at, locale)} {e.actor && `· ${e.actor}`}</p>
                </motion.li>
              );
            })}
            {!order.timeline.length ? <li className="text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Le premier événement apparaîtra après validation du paiement." : "The first event will appear after payment confirmation."}</li> : null}
          </ol>
        </div>

        {/* shipments + address */}
        <div className="space-y-4">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal"><Truck className="h-4 w-4 text-terre" /> {t.orders.packages}</h2>
            <div className="space-y-2">
              {order.shipments.map((s: any) => {
                const trackingHref = typeof s.trackingUrl === "string" && s.trackingUrl.startsWith("https://") && s.trackingNumber
                  ? s.trackingUrl.replace("{ref}", encodeURIComponent(s.trackingNumber))
                  : null;
                return (
                <div key={s.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0 truncate text-xs font-semibold text-charcoal">{s.trackingNumber || (locale === "fr" ? "Suivi en cours d'attribution" : "Tracking pending")}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(s.thermalClass)}`}>{thermalLabel(s.thermalClass, locale)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.carrier || s.carrierName || (locale === "fr" ? "Transporteur à attribuer" : "Carrier pending")} · <span>{t.orders.statuses[orderStatusKey(s.status) as keyof typeof t.orders.statuses] || s.status}</span></p>
                  <p className="text-[11px] text-muted-foreground">{t.orders.estimatedDelivery} : {s.estimatedDelivery ? formatDate(s.estimatedDelivery, locale) : "—"}</p>
                  {s.confirmCode && <p className="mt-0.5 text-[11px] font-medium text-forest">Code : {s.confirmCode}</p>}
                  {trackingHref ? <a href={trackingHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-terre hover:underline">{locale === "fr" ? "Suivre chez le transporteur" : "Track with carrier"}<ExternalLink className="h-3 w-3" /></a> : null}
                  {s.actualDelivery || s.proofPhoto || s.signature ? <div className="mt-3 border-t border-border pt-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-forest"><CheckCircle2 className="h-3.5 w-3.5" />{locale === "fr" ? "Preuve de remise" : "Delivery proof"}</p>{s.actualDelivery ? <p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Remis le" : "Handed over on"} {formatDateTime(s.actualDelivery, locale)}</p> : null}{s.proofPhoto ? <ProductImage src={s.proofPhoto} alt={locale === "fr" ? `Preuve de livraison du colis ${s.trackingNumber || ""}` : `Delivery proof for parcel ${s.trackingNumber || ""}`} emoji="" color="#F2F5F1" size="lg" className="mt-2 h-32 w-full" rounded="rounded-md" priority /> : null}{s.signature ? <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-charcoal"><ClipboardSignature className="h-3.5 w-3.5 text-forest" />{locale === "fr" ? "Reçu par" : "Received by"} {s.signature}</p> : s.proofPhoto ? <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Camera className="h-3.5 w-3.5" />{locale === "fr" ? "Photo enregistrée par le livreur" : "Photo recorded by the courier"}</p> : null}</div> : null}
                </div>
                );
              })}
              {!order.shipments.length ? <p className="text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Le colis sera attribué après la préparation." : "A parcel will be assigned after packing."}</p> : null}
            </div>
          </section>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-charcoal"><MapPin className="h-4 w-4 text-terre" /> {t.checkout.address}</h2>
            <p className="text-sm text-charcoal">{order.deliveryName}</p>
            <p className="text-xs text-muted-foreground">{order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}, {order.deliveryCountry}</p>
            {order.deliverySlot ? <p className="mt-3 border-t border-border pt-3 text-[11px] font-bold text-forest">{locale === "fr" ? "Service de livraison" : "Delivery service"} : {deliveryServiceLabel(order.deliverySlot, locale)}</p> : null}
          </div>
        </div>
      </div>

      {/* items */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold text-charcoal">{t.orders.items}</h2>
        <div className="space-y-1.5">
          {order.items.map((it: any) => (
            <div key={it.id} className="flex items-center gap-2 text-sm">
              <ProductImage src={it.imageUrl} alt={it.name} emoji="🍲" color="#D65A32" size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" />
              <span className="min-w-0 flex-1 truncate pr-2 text-charcoal">{it.name} × {it.qty}{it.recipeName && <span className="ml-1 text-[10px] text-forest">· {t.config.recipeGroup}</span>}</span>
              <span className="font-medium">{formatPrice(it.lineTotal, locale)}</span>
            </div>
          ))}
        </div>
        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Sous-total" : "Subtotal"}</dt><dd>{formatPrice(order.subtotal, locale)}</dd></div>
          {order.promoDiscount > 0 ? <div className="flex items-center justify-between gap-4 text-forest"><dt>{locale === "fr" ? "Remise" : "Discount"}</dt><dd>-{formatPrice(order.promoDiscount, locale)}</dd></div> : null}
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Livraison" : "Delivery"}</dt><dd>{formatPrice(order.shippingCost, locale)}</dd></div>
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Dont TVA" : "Including VAT"}</dt><dd>{formatPrice(order.vatAmount, locale)}</dd></div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 text-base"><dt className="font-bold text-charcoal">{t.cart.total}</dt><dd className="font-black text-terre">{formatPrice(order.total, locale)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
