"use client";

import { Package, ChevronRight, RotateCcw, Download, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate, orderStatusColor } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/client-actions";

export function OrdersView() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const addToCart = useStore((s) => s.addToCart);
  const t = dict[locale];
  const { data, loading } = useFetch(`/api/orders?locale=${locale}`, [locale]);

  const reorder = (order: any) => {
    order.items.forEach((it: any) => {
      addToCart({
        productId: it.productId, name: locale === "en" ? it.nameEn : it.nameFr, nameFr: it.nameFr, nameEn: it.nameEn,
        unitPrice: it.unitPrice, unitLabel: "", packWeightGrams: 0, thermalClass: it.thermalClass, qty: it.qty, maxStock: 99,
      });
    });
    navigate("cart");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6">
      <h1 className="mb-4 text-2xl font-bold text-charcoal md:text-3xl">{t.orders.title}</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : !data?.orders?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.orders.empty}</p>
          <Button onClick={() => navigate("catalog")} className="bg-terre text-cream">{t.cart.emptyCta}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.orders.map((o: any) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <p className="text-sm font-bold text-terre">{o.number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, locale)} · {o.items.length} {t.orders.items}</p>
                </div>
                <Badge className={`border ${orderStatusColor(o.status)}`}>{t.orders.statuses[o.status as keyof typeof t.orders.statuses] || o.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t.orders.total} : </span>
                  <span className="font-bold text-charcoal">{formatPrice(o.total, locale)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate("order-tracking", { orderId: o.id })}>
                    <Package className="mr-1 h-3.5 w-3.5" /> {t.orders.track}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reorder(o)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t.orders.reorder}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadOrderInvoice(o, locale)} aria-label={locale === "fr" ? `Télécharger la facture ${o.number}` : `Download invoice ${o.number}`}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
