"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Truck, Home, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/client-actions";

export function OrderConfirmationView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const { data: order, loading } = useFetch(`/api/orders/${params.orderId}?locale=${locale}`, [params.orderId, locale]);

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-10"><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!order) return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Commande introuvable.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-forest/15">
        <CheckCircle2 className="h-12 w-12 text-forest" />
      </motion.div>
      <h1 className="text-2xl font-extrabold text-charcoal md:text-3xl">{t.checkout.orderConfirmed}</h1>
      <p className="mt-1 text-muted-foreground">{t.checkout.thankYou}</p>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-left">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-muted-foreground">{t.checkout.orderNumber}</p>
            <p className="text-lg font-bold text-terre">{order.number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t.orders.date}</p>
            <p className="text-sm font-medium text-charcoal">{formatDate(order.createdAt, locale)}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {order.items.map((it: any) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2 text-charcoal">{it.name} × {it.qty}</span>
              <span className="font-medium">{formatPrice(it.lineTotal, locale)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-bold text-charcoal">{t.cart.total}</span>
          <span className="text-xl font-extrabold text-terre">{formatPrice(order.total, locale)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
        <Truck className="h-4 w-4" />
        {t.orders.estimatedDelivery} : {order.shipments?.[0] ? formatDate(order.shipments[0].estimatedDelivery, locale) : "48-72 h"}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate("order-tracking", { orderId: order.id })} className="bg-terre text-cream hover:bg-terre-dark">
          <Truck className="mr-1 h-4 w-4" /> {t.checkout.trackOrder}
        </Button>
        <Button variant="outline" onClick={() => downloadOrderInvoice(order, locale)}>
          <Download className="mr-1 h-4 w-4" /> {t.orders.invoice}
        </Button>
        <Button variant="ghost" onClick={() => navigate("home")}>
          <Home className="mr-1 h-4 w-4" /> {t.checkout.backHome}
        </Button>
      </div>
    </div>
  );
}
