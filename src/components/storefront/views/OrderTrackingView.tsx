"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, MapPin, Truck, Package, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate, formatDateTime, orderStatusColor, thermalColor, thermalLabel } from "@/lib/format";

export function OrderTrackingView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const { data: order, loading } = useFetch(`/api/orders/${params.orderId}?locale=${locale}`, [params.orderId, locale]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-6"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Commande introuvable.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <button onClick={() => navigate("orders")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-terre">
        <ChevronLeft className="h-4 w-4" /> {t.back}
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{order.number}</h1>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, locale)}</p>
        </div>
        <Badge className={`border ${orderStatusColor(order.status)}`}>{t.orders.statuses[order.status as keyof typeof t.orders.statuses] || order.status}</Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* timeline */}
        <div className="rounded-2xl border border-border bg-card p-4">
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
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal"><Truck className="h-4 w-4 text-terre" /> {t.orders.packages}</h2>
            <div className="space-y-2">
              {order.shipments.map((s: any) => (
                <div key={s.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal">{s.trackingNumber}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(s.thermalClass)}`}>{thermalLabel(s.thermalClass, locale)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.carrier} · <span className="capitalize">{s.status}</span></p>
                  <p className="text-[11px] text-muted-foreground">{t.orders.estimatedDelivery} : {s.estimatedDelivery ? formatDate(s.estimatedDelivery, locale) : "—"}</p>
                  {s.confirmCode && <p className="mt-0.5 text-[11px] font-medium text-forest">Code : {s.confirmCode}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-charcoal"><MapPin className="h-4 w-4 text-terre" /> {t.checkout.address}</h2>
            <p className="text-sm text-charcoal">{order.deliveryName}</p>
            <p className="text-xs text-muted-foreground">{order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}, {order.deliveryCountry}</p>
            {/* map placeholder */}
            <div className="mt-3 grid h-24 place-items-center rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Package className="mb-1 h-5 w-5" /> {locale === "fr" ? "Carte de suivi" : "Tracking map"}
            </div>
          </div>
        </div>
      </div>

      {/* items */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold text-charcoal">{t.orders.items}</h2>
        <div className="space-y-1.5">
          {order.items.map((it: any) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2 text-charcoal">{it.name} × {it.qty}{it.recipeName && <span className="ml-1 text-[10px] text-forest">· {t.config.recipeGroup}</span>}</span>
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
