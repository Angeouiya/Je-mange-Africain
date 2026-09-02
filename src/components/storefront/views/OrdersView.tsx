"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  Inbox,
  LogIn,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatDate, normalize, orderStatusColor, orderStatusKey } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/client-actions";
import type { Order, OrderLine } from "@/lib/types";

type OrderFilter = "all" | "active" | "delivered" | "attention";

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "refunded"]);
const ATTENTION_STATUSES = new Set(["awaitingClient", "replacement", "failed", "paymentPending"]);

function isOrderInFilter(order: Order, filter: OrderFilter) {
  if (filter === "delivered") return order.status === "delivered";
  if (filter === "attention") return ATTENTION_STATUSES.has(orderStatusKey(order.status));
  if (filter === "active") return !TERMINAL_STATUSES.has(order.status);
  return true;
}

function reorderableQuantity(item: OrderLine) {
  const maxStock = typeof item.maxStock === "number" ? item.maxStock : 99;
  if (item.purchasable === false || maxStock <= 0) return 0;
  return Math.min(item.qty, maxStock);
}

export function OrdersView() {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const addManyToCart = useStore((state) => state.addManyToCart);
  const customer = useStore((state) => state.customer);
  const t = dict[locale];
  const { data, loading, error, refetch } = useFetch<{ orders: Order[] }>(customer ? `/api/orders?locale=${locale}` : null, [customer?.id, locale]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [pendingReorder, setPendingReorder] = useState<Order | null>(null);

  const orders = data?.orders || [];
  const counts = useMemo(() => ({
    all: orders.length,
    active: orders.filter((order) => isOrderInFilter(order, "active")).length,
    delivered: orders.filter((order) => isOrderInFilter(order, "delivered")).length,
    attention: orders.filter((order) => isOrderInFilter(order, "attention")).length,
  }), [orders]);
  const filteredOrders = useMemo(() => {
    const needle = normalize(query);
    return orders.filter((order) => {
      if (!isOrderInFilter(order, filter)) return false;
      if (!needle) return true;
      return normalize([order.number, order.deliveryCity, ...order.items.flatMap((item) => [item.name, item.nameFr, item.nameEn])].filter(Boolean).join(" ")).includes(needle);
    });
  }, [filter, orders, query]);

  const addOrderToCart = (order: Order) => {
    const items = order.items.flatMap((item) => {
      const qty = reorderableQuantity(item);
      if (!qty) return [];
      return [{
        productId: item.productId,
        variantId: item.salesChannel === "wholesale" ? "wholesale" : undefined,
        name: locale === "en" ? item.nameEn : item.nameFr,
        nameFr: item.nameFr,
        nameEn: item.nameEn,
        unitPrice: item.currentUnitPrice ?? item.unitPrice,
        unitLabel: item.unitLabel || "",
        packWeightGrams: item.packWeightGrams || 0,
        thermalClass: item.thermalClass as "AMBIANT" | "REFRIGERATED" | "FROZEN",
        qty,
        maxStock: typeof item.maxStock === "number" ? item.maxStock : 99,
        imageUrl: item.imageUrl || undefined,
        recipeId: item.recipeId || undefined,
        recipeName: item.recipeName || undefined,
        salesChannel: item.salesChannel,
        unitsPerPack: item.unitsPerPack,
        minimumQty: item.minimumQty,
        wholesaleTiers: item.wholesaleTiers,
      }];
    });
    if (!items.length) return;
    addManyToCart(items);
    setPendingReorder(null);
    navigate("cart");
  };

  const requestReorder = (order: Order) => {
    const unavailableCount = order.items.filter((item) => reorderableQuantity(item) === 0).length;
    if (unavailableCount) {
      setPendingReorder(order);
      return;
    }
    addOrderToCart(order);
  };

  if (!customer) {
    return <div className="mx-auto grid min-h-[55vh] max-w-md place-items-center px-4 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span><h1 className="mt-4 font-display text-2xl font-semibold text-charcoal">{locale === "fr" ? "Connectez-vous pour voir vos commandes" : "Sign in to view your orders"}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Votre historique et le suivi de livraison sont protégés par votre compte." : "Your history and delivery tracking are protected by your account."}</p><Button onClick={() => navigate("account")} className="mt-5 bg-terre text-white hover:bg-terre-dark">{t.nav.login}</Button></div></div>;
  }

  const filters: Array<{ id: OrderFilter; label: string }> = [
    { id: "all", label: t.orders.all },
    { id: "active", label: t.orders.active },
    { id: "delivered", label: t.orders.deliveredFilter },
    { id: "attention", label: t.orders.attention },
  ];
  const pendingAvailableCount = pendingReorder?.items.filter((item) => reorderableQuantity(item) > 0).length || 0;
  const pendingUnavailableCount = (pendingReorder?.items.length || 0) - pendingAvailableCount;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="account" fallbackParams={{ accountSection: "profile" }} className="mb-4" />

      <header className="mb-6 max-w-2xl">
        <p className="text-xs font-bold uppercase text-terre">{locale === "fr" ? "Espace personnel" : "Personal space"}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal sm:text-4xl">{t.orders.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.orders.subtitle}</p>
      </header>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24 rounded-lg" />{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-lg" />)}</div>
      ) : error ? (
        <div className="grid min-h-64 place-items-center border-y border-dashed border-border text-center"><div><AlertCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-3 text-sm font-bold text-charcoal">{locale === "fr" ? "Historique indisponible" : "History unavailable"}</p><Button type="button" size="sm" variant="outline" onClick={refetch} className="mt-3">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div></div>
      ) : !orders.length ? (
        <div className="flex flex-col items-center gap-3 border-y border-dashed border-border py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.orders.empty}</p>
          <Button onClick={() => navigate("catalog")} className="bg-terre text-white hover:bg-terre-dark"><ShoppingBag className="h-4 w-4" />{t.cart.emptyCta}</Button>
        </div>
      ) : (
        <>
          <section className="mb-5 border-y border-border py-4" aria-label={locale === "fr" ? "Rechercher et filtrer les commandes" : "Search and filter orders"}>
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 bg-white pl-10 pr-10" placeholder={t.orders.searchPlaceholder} aria-label={t.orders.searchPlaceholder} />
              {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-charcoal" aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}><X className="h-4 w-4" /></button> : null}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:max-w-xl sm:gap-2" role="group" aria-label={locale === "fr" ? "Filtrer par statut" : "Filter by status"}>
              {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] font-bold transition-colors sm:gap-2 sm:px-3 sm:text-xs ${filter === item.id ? "border-charcoal bg-charcoal text-white" : "border-border bg-white text-muted-foreground hover:border-charcoal/30 hover:text-charcoal"}`}><span className="truncate">{item.label}</span><span className={`min-w-4 shrink-0 rounded px-1 text-center text-[9px] sm:min-w-5 sm:text-[10px] ${filter === item.id ? "bg-white/15 text-white" : "bg-muted text-charcoal"}`}>{counts[item.id]}</span></button>)}
            </div>
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">{filteredOrders.length} {t.orders.orderCount}</p>
          </section>

          {filteredOrders.length ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const availableCount = order.items.filter((item) => reorderableQuantity(item) > 0).length;
                return (
                  <article key={order.id} className="overflow-hidden rounded-lg border border-charcoal/10 bg-white">
                    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-charcoal">{order.number}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt, locale)} · {order.items.length} {t.orders.items.toLowerCase()}</p>
                      </div>
                      <Badge className={`max-w-[48%] shrink-0 border text-center ${orderStatusColor(order.status)}`}>{t.orders.statuses[orderStatusKey(order.status) as keyof typeof t.orders.statuses] || order.status}</Badge>
                    </div>

                    <div className="divide-y divide-border/70 px-4">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex min-w-0 items-center gap-3 py-3">
                          <ProductImage src={item.imageUrl} alt={locale === "en" ? item.nameEn : item.nameFr} emoji="" color="#F7F4F3" size="sm" className="h-12 w-12 shrink-0" rounded="rounded-md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-charcoal">{locale === "en" ? item.nameEn : item.nameFr}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.unitLabel || item.sku} · {item.qty} × {formatPrice(item.unitPrice, locale)}</p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-charcoal">{formatPrice(item.lineTotal, locale)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 ? <p className="py-2.5 text-xs font-semibold text-muted-foreground">+ {order.items.length - 3} {locale === "fr" ? "autre(s) article(s)" : "more item(s)"}</p> : null}
                    </div>

                    <div className="flex items-end justify-between gap-3 bg-muted/35 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">{t.orders.total}</p>
                        <p className="text-lg font-black text-charcoal">{formatPrice(order.total, locale)}</p>
                      </div>
                      <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => navigate("order-tracking", { orderId: order.id })} className="bg-white text-xs">
                          <Package className="h-3.5 w-3.5" /> {t.orders.track}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={!availableCount} onClick={() => requestReorder(order)} className="text-xs" title={!availableCount ? (locale === "fr" ? "Articles indisponibles" : "Items unavailable") : undefined}>
                          <RotateCcw className="h-3.5 w-3.5" /> {t.orders.reorder}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadOrderInvoice(order as unknown as Record<string, any>, locale)} aria-label={locale === "fr" ? `Télécharger la facture ${order.number}` : `Download invoice ${order.number}`} title={locale === "fr" ? "Télécharger la facture" : "Download invoice"}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center border-y border-dashed border-border text-center"><div><Search className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-bold text-charcoal">{t.orders.noMatch}</p><Button type="button" variant="link" onClick={() => { setQuery(""); setFilter("all"); }} className="mt-1 text-terre">{locale === "fr" ? "Réinitialiser" : "Reset"}</Button></div></div>
          )}
        </>
      )}

      <AlertDialog open={Boolean(pendingReorder)} onOpenChange={(open) => { if (!open) setPendingReorder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === "fr" ? "Panier partiellement disponible" : "Basket partially available"}</AlertDialogTitle>
            <AlertDialogDescription>{locale === "fr" ? `${pendingUnavailableCount} article(s) ne sont plus disponibles. Les ${pendingAvailableCount} article(s) disponibles seront ajoutés au panier avec leur prix et leur stock actuels.` : `${pendingUnavailableCount} item(s) are no longer available. The ${pendingAvailableCount} available item(s) will be added with current prices and stock.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction disabled={!pendingAvailableCount} onClick={() => { if (pendingReorder) addOrderToCart(pendingReorder); }} className="bg-terre text-white hover:bg-terre-dark">{locale === "fr" ? "Continuer" : "Continue"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
