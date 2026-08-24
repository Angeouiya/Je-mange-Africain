"use client";

import { AlertCircle, Package, RotateCcw, Download, Inbox, LogIn } from "lucide-react";
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
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const { data, loading, error, refetch } = useFetch(customer ? `/api/orders?locale=${locale}` : null, [customer?.id, locale]);

  const reorder = (order: any) => {
    order.items.forEach((it: any) => {
      addToCart({
        productId: it.productId, name: locale === "en" ? it.nameEn : it.nameFr, nameFr: it.nameFr, nameEn: it.nameEn,
        unitPrice: it.unitPrice, unitLabel: "", packWeightGrams: 0, thermalClass: it.thermalClass, qty: it.qty, maxStock: 99,
      });
    });
    navigate("cart");
  };

  if (!customer) {
    return <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-black text-charcoal">{locale === "fr" ? "Connectez-vous pour voir vos commandes" : "Sign in to view your orders"}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Votre historique et le suivi de livraison sont protégés par votre compte." : "Your history and delivery tracking are protected by your account."}</p><Button onClick={() => navigate("account")} className="mt-5 bg-terre text-white hover:bg-terre-dark">{t.nav.login}</Button></div></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6">
      <h1 className="mb-4 text-2xl font-bold text-charcoal md:text-3xl">{t.orders.title}</h1>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
      ) : error ? (
        <div className="grid min-h-64 place-items-center border-y border-dashed border-border text-center"><div><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 text-sm font-bold text-charcoal">{locale === "fr" ? "Historique indisponible" : "History unavailable"}</p><Button type="button" size="sm" variant="outline" onClick={refetch} className="mt-3">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div>
      ) : !data?.orders?.length ? (
        <div className="flex flex-col items-center gap-3 border-y border-dashed border-border py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.orders.empty}</p>
          <Button onClick={() => navigate("catalog")} className="bg-terre text-cream">{t.cart.emptyCta}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.orders.map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4 [contain-intrinsic-size:150px] [content-visibility:auto]">
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
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => navigate("order-tracking", { orderId: o.id })}>
                    <Package className="mr-1 h-3.5 w-3.5" /> {t.orders.track}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reorder(o)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t.orders.reorder}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadOrderInvoice(o, locale)} aria-label={locale === "fr" ? `Télécharger la facture ${o.number}` : `Download invoice ${o.number}`} title={locale === "fr" ? "Télécharger la facture" : "Download invoice"}>
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
