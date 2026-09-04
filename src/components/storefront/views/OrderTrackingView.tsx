"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CalendarDays, Camera, CheckCircle2, Circle, ClipboardSignature, Download, ExternalLink, MapPin, Truck, Package, LogIn, ReceiptText, ShieldCheck } from "lucide-react";
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
import { getOrderDeliveryOverview, getShipmentTrackingHref } from "@/lib/order-experience";
import { MobileActionDock } from "@/components/storefront/MobileActionDock";
import type { Order } from "@/lib/types";

export function OrderTrackingView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const [mobilePanel, setMobilePanel] = useState<"delivery" | "order">("delivery");
  const { data: order, loading, error, refetch } = useFetch<Order>(customer && params.orderId ? `/api/orders/${params.orderId}?locale=${locale}` : null, [customer?.id, params.orderId, locale]);

  if (!customer) return <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span><h1 className="mt-4 font-display text-2xl font-semibold text-charcoal">{locale === "fr" ? "Suivi protégé" : "Protected tracking"}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Connectez-vous avec le compte ayant passé cette commande." : "Sign in with the account that placed this order."}</p><Button onClick={() => navigate("account")} className="mt-5 bg-terre text-white hover:bg-terre-dark">{t.nav.login}</Button></div></div>;
  if (loading) return <div className="mx-auto max-w-3xl px-4 py-6"><Skeleton className="h-96 rounded-lg" /></div>;
  if (error) return <div className="mx-auto grid min-h-[45vh] max-w-md place-items-center px-4 text-center"><div><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 text-sm font-bold text-charcoal">{locale === "fr" ? "Suivi momentanément indisponible" : "Tracking temporarily unavailable"}</p><Button type="button" variant="outline" size="sm" onClick={refetch} className="mt-3">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">{locale === "fr" ? "Commande introuvable." : "Order not found."}</div>;

  const deliveryOverview = getOrderDeliveryOverview(order);
  const { interrupted: isInterrupted, stageIndex, deliveryTimestamp, shipment: primaryShipment, trackingHref: primaryTrackingHref, packageCount } = deliveryOverview;
  const deliveryCopy = getDeliveryCopy(stageIndex, locale);
  const DeliveryIcon = isInterrupted ? AlertCircle : stageIndex === 3 ? CheckCircle2 : stageIndex === 2 ? Truck : stageIndex === 1 ? Package : ShieldCheck;
  const deliveryStages = [
    { icon: CheckCircle2, fr: "Confirmée", en: "Confirmed" },
    { icon: Package, fr: "Préparée", en: "Packed" },
    { icon: Truck, fr: "En route", en: "On the way" },
    { icon: MapPin, fr: "Livrée", en: "Delivered" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-40 pt-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="orders" className="mb-4" />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-terre">{locale === "fr" ? "Suivi de commande" : "Order tracking"}</p>
          <h1 className="font-display text-3xl font-semibold text-charcoal">{order.number}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{locale === "fr" ? "Commandée le" : "Ordered on"} {formatDate(order.createdAt, locale)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge className={`border ${orderStatusColor(order.status)}`}>{t.orders.statuses[orderStatusKey(order.status) as keyof typeof t.orders.statuses] || order.status}</Badge>
          <Button type="button" size="sm" variant="outline" className="hidden bg-white md:inline-flex" onClick={() => downloadOrderInvoice(order, locale)}><Download className="h-3.5 w-3.5" />{t.orders.invoice}</Button>
        </div>
      </div>

      <section className={`mb-5 overflow-hidden border-y px-4 py-4 ${isInterrupted ? "border-destructive/20 bg-destructive/[0.045]" : "border-burgundy/15 bg-[#FFF8F4]"}`} aria-labelledby="delivery-command-title" data-testid="delivery-command-center" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${isInterrupted ? "bg-destructive text-white" : "bg-terre text-white"}`}><DeliveryIcon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3"><p className={`text-[9px] font-black uppercase ${isInterrupted ? "text-destructive" : "text-terre"}`}>{deliveryCopy.eyebrow}</p><span className="shrink-0 text-[9px] font-black tabular-nums text-burgundy">{isInterrupted ? (locale === "fr" ? "Vérification" : "Review") : `${stageIndex + 1}/4`}</span></div>
            <h2 id="delivery-command-title" className="mt-0.5 text-base font-black text-charcoal">{deliveryCopy.title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{deliveryCopy.detail}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-burgundy/10 border-t border-burgundy/10 pt-3">
          <DeliveryFact icon={CalendarDays} label={stageIndex === 3 ? (locale === "fr" ? "Remise" : "Delivered") : (locale === "fr" ? "Arrivée" : "Arrival")} value={deliveryTimestamp ? formatDate(deliveryTimestamp, locale) : (locale === "fr" ? "À confirmer" : "Pending")} />
          <DeliveryFact icon={Truck} label={locale === "fr" ? "Transporteur" : "Carrier"} value={primaryShipment?.carrierName || primaryShipment?.carrier || (locale === "fr" ? "À attribuer" : "Pending")} />
          <DeliveryFact icon={Package} label={locale === "fr" ? "Colis" : "Parcels"} value={String(packageCount)} />
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-lg border border-border bg-white px-3 py-4" aria-label={locale === "fr" ? "Progression de la livraison" : "Delivery progress"}>
        <span className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={deliveryOverview.progress} aria-label={locale === "fr" ? `Livraison terminée à ${deliveryOverview.progress} %` : `Delivery ${deliveryOverview.progress}% complete`} />
        <ol className="grid grid-cols-4">{deliveryStages.map((stage, index) => <li key={stage.fr} className="relative flex min-w-0 flex-col items-center text-center">{index > 0 ? <span className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= stageIndex ? "bg-burgundy" : "bg-border"}`} /> : null}<span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full ${index <= stageIndex ? "bg-burgundy text-white" : isInterrupted && index === 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}><stage.icon className="h-4 w-4" /></span><span className={`mt-2 truncate text-[9px] font-bold sm:text-[10px] ${index <= stageIndex ? "text-burgundy" : isInterrupted && index === 0 ? "text-destructive" : "text-muted-foreground"}`}>{locale === "fr" ? stage.fr : stage.en}</span></li>)}</ol>
      </section>

      <nav className="mb-4 grid grid-cols-2 rounded-md border border-burgundy/12 bg-white p-1 md:hidden" aria-label={locale === "fr" ? "Informations de la commande" : "Order information"} data-testid="tracking-mobile-tabs">
        <button type="button" onClick={() => setMobilePanel("delivery")} aria-pressed={mobilePanel === "delivery"} className={`flex min-h-11 items-center justify-center gap-2 rounded-sm text-xs font-black transition ${mobilePanel === "delivery" ? "bg-terre text-white" : "text-muted-foreground"}`}><Truck className="h-4 w-4" />{locale === "fr" ? "Livraison" : "Delivery"}</button>
        <button type="button" onClick={() => setMobilePanel("order")} aria-pressed={mobilePanel === "order"} className={`flex min-h-11 items-center justify-center gap-2 rounded-sm text-xs font-black transition ${mobilePanel === "order" ? "bg-burgundy text-white" : "text-muted-foreground"}`}><ReceiptText className="h-4 w-4" />{locale === "fr" ? "Ma commande" : "My order"}</button>
      </nav>

      <div className="grid items-start gap-5 md:grid-cols-2">
        {/* timeline */}
        <section className={`rounded-lg border border-border bg-card p-4 md:block ${mobilePanel !== "delivery" ? "hidden" : ""}`}>
          <h2 className="mb-3 text-sm font-bold text-charcoal">{t.orders.timeline}</h2>
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {order.timeline.map((e, i) => {
              const isLast = i === order.timeline.length - 1;
              return (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                  <span className={`absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full ${isLast ? (isInterrupted ? "bg-destructive text-white" : "bg-burgundy text-cream") : "bg-muted text-muted-foreground"}`}>
                    {isLast ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                  </span>
                  <p className="text-sm font-semibold text-charcoal">{t.orders.statuses[orderStatusKey(e.status) as keyof typeof t.orders.statuses] || e.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(e.at, locale)} {e.actor && `· ${e.actor}`}</p>
                </motion.li>
              );
            })}
            {!order.timeline.length ? <li className="text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Le premier événement apparaîtra après validation du paiement." : "The first event will appear after payment confirmation."}</li> : null}
          </ol>
        </section>

        {/* shipments + address */}
        <div className="space-y-4">
          <section className={`md:block ${mobilePanel !== "delivery" ? "hidden" : ""}`}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal"><Truck className="h-4 w-4 text-terre" /> {t.orders.packages}</h2>
            <div className="space-y-2">
              {order.shipments.map((s) => {
                const trackingHref = getShipmentTrackingHref(s);
                return (
                <div key={s.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0 truncate text-xs font-semibold text-charcoal">{s.trackingNumber || (locale === "fr" ? "Suivi en cours d'attribution" : "Tracking pending")}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(s.thermalClass)}`}>{thermalLabel(s.thermalClass, locale)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.carrier || s.carrierName || (locale === "fr" ? "Transporteur à attribuer" : "Carrier pending")} · <span>{t.orders.statuses[orderStatusKey(s.status) as keyof typeof t.orders.statuses] || s.status}</span></p>
                  <p className="text-[11px] text-muted-foreground">{t.orders.estimatedDelivery} : {s.estimatedDelivery ? formatDate(s.estimatedDelivery, locale) : "—"}</p>
                  {s.confirmCode && <p className="mt-0.5 text-[11px] font-medium text-burgundy">Code : {s.confirmCode}</p>}
                  {trackingHref ? <a href={trackingHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-terre hover:underline">{locale === "fr" ? "Suivre chez le transporteur" : "Track with carrier"}<ExternalLink className="h-3 w-3" /></a> : null}
                  {s.actualDelivery || s.proofPhoto || s.signature ? <div className="mt-3 border-t border-border pt-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-burgundy"><CheckCircle2 className="h-3.5 w-3.5" />{locale === "fr" ? "Preuve de remise" : "Delivery proof"}</p>{s.actualDelivery ? <p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Remis le" : "Handed over on"} {formatDateTime(s.actualDelivery, locale)}</p> : null}{s.proofPhoto ? <ProductImage src={s.proofPhoto} alt={locale === "fr" ? `Preuve de livraison du colis ${s.trackingNumber || ""}` : `Delivery proof for parcel ${s.trackingNumber || ""}`} emoji="" color="#F7F4F3" size="lg" className="mt-2 h-32 w-full" rounded="rounded-md" priority /> : null}{s.signature ? <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-charcoal"><ClipboardSignature className="h-3.5 w-3.5 text-burgundy" />{locale === "fr" ? "Reçu par" : "Received by"} {s.signature}</p> : s.proofPhoto ? <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Camera className="h-3.5 w-3.5" />{locale === "fr" ? "Photo enregistrée par le livreur" : "Photo recorded by the courier"}</p> : null}</div> : null}
                </div>
                );
              })}
              {!order.shipments.length ? <p className="text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Le colis sera attribué après la préparation." : "A parcel will be assigned after packing."}</p> : null}
            </div>
          </section>

          <div className={`rounded-lg border border-border bg-card p-4 md:block ${mobilePanel !== "order" ? "hidden" : ""}`}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-charcoal"><MapPin className="h-4 w-4 text-terre" /> {t.checkout.address}</h2>
            <p className="text-sm text-charcoal">{order.deliveryName}</p>
            <p className="text-xs text-muted-foreground">{order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}, {order.deliveryCountry}</p>
            {order.deliverySlot ? <p className="mt-3 border-t border-border pt-3 text-[11px] font-bold text-burgundy">{locale === "fr" ? "Service de livraison" : "Delivery service"} : {deliveryServiceLabel(order.deliverySlot, locale)}</p> : null}
          </div>
        </div>
      </div>

      {/* items */}
      <div className={`mt-5 rounded-lg border border-border bg-card p-4 md:block ${mobilePanel !== "order" ? "hidden" : ""}`}>
        <h2 className="mb-2 text-sm font-bold text-charcoal">{t.orders.items}</h2>
        <div className="space-y-1.5">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-sm">
              <ProductImage src={it.imageUrl} alt={it.name} emoji="🍲" color="#D65A32" size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" />
              <span className="min-w-0 flex-1 truncate pr-2 text-charcoal">{it.name} × {it.qty}{it.recipeName && <span className="ml-1 text-[10px] text-burgundy">· {t.config.recipeGroup}</span>}</span>
              <span className="font-medium">{formatPrice(it.lineTotal, locale)}</span>
            </div>
          ))}
        </div>
        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Sous-total" : "Subtotal"}</dt><dd>{formatPrice(order.subtotal, locale)}</dd></div>
          {order.promoDiscount > 0 ? <div className="flex items-center justify-between gap-4 text-burgundy"><dt>{locale === "fr" ? "Remise" : "Discount"}</dt><dd>-{formatPrice(order.promoDiscount, locale)}</dd></div> : null}
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Livraison" : "Delivery"}</dt><dd>{formatPrice(order.shippingCost, locale)}</dd></div>
          <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>{locale === "fr" ? "Dont TVA" : "Including VAT"}</dt><dd>{formatPrice(order.vatAmount, locale)}</dd></div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 text-base"><dt className="font-bold text-charcoal">{t.cart.total}</dt><dd className="font-black text-terre">{formatPrice(order.total, locale)}</dd></div>
        </dl>
      </div>

      <MobileActionDock testId="order-tracking-action-dock">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black uppercase text-muted-foreground">{stageIndex === 3 ? (locale === "fr" ? "Commande livrée" : "Order delivered") : (locale === "fr" ? "Total de la commande" : "Order total")}</p><p className="mt-0.5 text-lg font-black leading-none text-terre">{formatPrice(order.total, locale)}</p></div>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 border-burgundy/20 bg-white text-burgundy" onClick={() => downloadOrderInvoice(order, locale)} aria-label={locale === "fr" ? "Télécharger la facture" : "Download invoice"}><Download className="h-4 w-4" /></Button>
          {primaryTrackingHref ? <Button asChild className="h-10 bg-terre px-3 text-white hover:bg-terre-dark"><a href={primaryTrackingHref} target="_blank" rel="noreferrer">{locale === "fr" ? "Suivre le colis" : "Track parcel"}<ArrowRight className="ml-1.5 h-4 w-4" /></a></Button> : <Button type="button" className="h-10 bg-burgundy px-3 text-white hover:bg-burgundy-dark" onClick={() => setMobilePanel("order")}><ReceiptText className="mr-1.5 h-4 w-4" />{locale === "fr" ? "Voir la commande" : "View order"}</Button>}
        </div>
      </MobileActionDock>
    </div>
  );
}

function getDeliveryCopy(stageIndex: number, locale: "fr" | "en") {
  const isFr = locale === "fr";
  if (stageIndex < 0) return { eyebrow: isFr ? "Action nécessaire" : "Action required", title: isFr ? "Une vérification est nécessaire" : "A review is required", detail: isFr ? "Consultez le dernier événement de suivi avant de poursuivre." : "Review the latest tracking event before continuing." };
  return [
    { eyebrow: isFr ? "Paiement sécurisé" : "Secure payment", title: isFr ? "Votre commande est confirmée" : "Your order is confirmed", detail: isFr ? "Nous vérifions chaque produit avant le lancement de la préparation." : "Every product is checked before preparation begins." },
    { eyebrow: isFr ? "Dans notre atelier" : "In our fulfilment centre", title: isFr ? "Votre panier est en préparation" : "Your basket is being prepared", detail: isFr ? "Les produits sont contrôlés, conditionnés et répartis selon leur température." : "Products are checked, packed and separated by temperature." },
    { eyebrow: isFr ? "Acheminement en cours" : "In transit", title: isFr ? "Votre colis est en route" : "Your parcel is on the way", detail: isFr ? "Le transporteur a pris en charge la livraison jusqu'à votre adresse." : "The carrier is bringing the delivery to your address." },
    { eyebrow: isFr ? "Livraison terminée" : "Delivery complete", title: isFr ? "Votre commande a été remise" : "Your order has been delivered", detail: isFr ? "La preuve de remise et votre facture restent disponibles dans cet espace." : "Delivery evidence and your invoice remain available here." },
  ][Math.min(stageIndex, 3)];
}

function DeliveryFact({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return <div className="min-w-0 px-3 first:pl-0 last:pr-0"><p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-terre" />{label}</p><p className="mt-1 truncate text-[10px] font-black text-charcoal sm:text-xs">{value}</p></div>;
}
