"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Circle, MapPin, Truck, Package, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate, formatDateTime, orderStatusColor, orderStatusKey, thermalColor, thermalLabel } from "@/lib/format";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";

export function OrderTrackingView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const { data: order, loading, error, refetch } = useFetch(customer && params.orderId ? `/api/orders/${params.orderId}?locale=${locale}` : null, [customer?.id, params.orderId, locale]);

  if (!customer) return <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-black text-charcoal">{locale === "fr" ? "Suivi protégé" : "Protected tracking"}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Connectez-vous avec le compte ayant passé cette commande." : "Sign in with the account that placed this order."}</p><Button onClick={() => navigate("account")} className="mt-5 bg-terre text-white hover:bg-terre-dark">{t.nav.login}</Button></div></div>;
  if (loading) return <div className="mx-auto max-w-3xl px-4 py-6"><Skeleton className="h-96 rounded-lg" /></div>;
  if (error) return <div className="mx-auto grid min-h-[45vh] max-w-md place-items-center px-4 text-center"><div><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 text-sm font-bold text-charcoal">{locale === "fr" ? "Suivi momentanément indisponible" : "Tracking temporarily unavailable"}</p><Button type="button" variant="outline" size="sm" onClick={refetch} className="mt-3">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">{locale === "fr" ? "Commande introuvable." : "Order not found."}</div>;

  const stageIndex = order.status === "delivered" ? 3
    : ["shipped", "in_transit", "out_for_delivery", "delivering"].includes(order.status) ? 2
      : ["preparing", "packed", "controlDone"].includes(order.status) ? 1 : 0;
  const deliveryStages = [
    { icon: CheckCircle2, fr: "Confirmée", en: "Confirmed" },
    { icon: Package, fr: "Préparée", en: "Packed" },
    { icon: Truck, fr: "En route", en: "On the way" },
    { icon: MapPin, fr: "Livrée", en: "Delivered" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <PageBackButton fallbackView="orders" className="mb-4" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{order.number}</h1>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, locale)}</p>
        </div>
        <Badge className={`border ${orderStatusColor(order.status)}`}>{t.orders.statuses[orderStatusKey(order.status) as keyof typeof t.orders.statuses] || order.status}</Badge>
      </div>

      <section className="mb-5 overflow-hidden rounded-lg border border-border bg-white px-3 py-4" aria-label={locale === "fr" ? "Progression de la livraison" : "Delivery progress"}>
        <ol className="grid grid-cols-4">{deliveryStages.map((stage, index) => <li key={stage.fr} className="relative flex min-w-0 flex-col items-center text-center">{index > 0 ? <span className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= stageIndex ? "bg-forest" : "bg-border"}`} /> : null}<span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full ${index <= stageIndex ? "bg-forest text-white" : "bg-muted text-muted-foreground"}`}><stage.icon className="h-4 w-4" /></span><span className={`mt-2 truncate text-[9px] font-bold sm:text-[10px] ${index <= stageIndex ? "text-forest" : "text-muted-foreground"}`}>{locale === "fr" ? stage.fr : stage.en}</span></li>)}</ol>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {/* timeline */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-charcoal">{t.orders.timeline}</h2>
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {order.timeline.map((e: any, i: number) => {
              const isLast = i === order.timeline.length - 1;
              return (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                  <span className={`absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full ${isLast ? "bg-forest text-cream" : "bg-muted text-muted-foreground"}`}>
                    {isLast ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                  </span>
                  <p className="text-sm font-semibold text-charcoal">{e.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(e.at, locale)} {e.actor && `· ${e.actor}`}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>

        {/* shipments + address */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal"><Truck className="h-4 w-4 text-terre" /> {t.orders.packages}</h2>
            <div className="space-y-2">
              {order.shipments.map((s: any) => (
                <div key={s.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal">{s.trackingNumber}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(s.thermalClass)}`}>{thermalLabel(s.thermalClass, locale)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.carrier} · <span>{t.orders.statuses[orderStatusKey(s.status) as keyof typeof t.orders.statuses] || s.status}</span></p>
                  <p className="text-[11px] text-muted-foreground">{t.orders.estimatedDelivery} : {s.estimatedDelivery ? formatDate(s.estimatedDelivery, locale) : "—"}</p>
                  {s.confirmCode && <p className="mt-0.5 text-[11px] font-medium text-forest">Code : {s.confirmCode}</p>}
                </div>
              ))}
              {!order.shipments.length ? <p className="text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Le colis sera attribué après la préparation." : "A parcel will be assigned after packing."}</p> : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-charcoal"><MapPin className="h-4 w-4 text-terre" /> {t.checkout.address}</h2>
            <p className="text-sm text-charcoal">{order.deliveryName}</p>
            <p className="text-xs text-muted-foreground">{order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}, {order.deliveryCountry}</p>
            {order.deliverySlot ? <p className="mt-3 border-t border-border pt-3 text-[11px] font-bold text-forest">{locale === "fr" ? "Créneau" : "Time slot"} : {order.deliverySlot}</p> : null}
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
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-bold text-charcoal">{t.cart.total}</span>
          <span className="font-bold text-terre">{formatPrice(order.total, locale)}</span>
        </div>
      </div>
    </div>
  );
}
