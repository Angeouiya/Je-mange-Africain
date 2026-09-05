"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Download,
  Inbox,
  LogIn,
  MapPin,
  Package,
  PackageSearch,
  ReceiptText,
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
import { getOrderDeliveryTimestamp, getOrderProgress, getOrderStageIndex, isTerminalOrder, orderNeedsAttention, summarizeOrders } from "@/lib/order-experience";
import { europeanCountryLabel } from "@/lib/european-countries";
import type { Order, OrderLine } from "@/lib/types";

type OrderFilter = "all" | "active" | "delivered" | "attention";

function isOrderInFilter(order: Order, filter: OrderFilter) {
  if (filter === "delivered") return order.status === "delivered";
  if (filter === "attention") return orderNeedsAttention(order.status);
  if (filter === "active") return !isTerminalOrder(order.status);
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
  const portfolio = useMemo(() => summarizeOrders(orders), [orders]);
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
        variantId: item.salesChannel === "wholesale" ? "wholesale" : item.variantId || undefined,
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

      <header className="mb-5 max-w-2xl" data-testid="orders-header">
        <p className="text-[10px] font-black uppercase text-terre">{locale === "fr" ? "Centre de commandes" : "Order centre"}</p>
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
          <section className="mb-5 grid grid-cols-2 border-y border-charcoal/10 sm:grid-cols-4" aria-label={locale === "fr" ? "Synthèse des commandes" : "Order summary"} data-testid="orders-portfolio">
            <OrderMetric icon={PackageSearch} label={locale === "fr" ? "En cours" : "Active"} value={String(portfolio.active)} className="border-b border-r sm:border-b-0" />
            <OrderMetric icon={CircleAlert} label={locale === "fr" ? "À suivre" : "Attention"} value={String(portfolio.attention)} className="border-b sm:border-b-0 sm:border-r" urgent={portfolio.attention > 0} />
            <OrderMetric icon={CheckCircle2} label={locale === "fr" ? "Livrées" : "Delivered"} value={String(portfolio.delivered)} className="border-r" />
            <OrderMetric icon={CircleDollarSign} label={locale === "fr" ? "Montant commandé" : "Ordered value"} value={formatPrice(portfolio.orderedValue, locale)} />
          </section>

          {portfolio.focusOrder ? <OrderFocus order={portfolio.focusOrder} locale={locale} onOpen={() => navigate("order-tracking", { orderId: portfolio.focusOrder!.id })} /> : <div className="mb-5 flex items-center gap-3 border-b border-charcoal/10 pb-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy/10 text-burgundy"><CheckCircle2 className="h-4 w-4" /></span><div><p className="text-xs font-black text-charcoal">{locale === "fr" ? "Tout est à jour" : "Everything is up to date"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Aucune commande active ne demande votre attention." : "No active order currently needs your attention."}</p></div></div>}

          <section className="mb-5 border-b border-border pb-4" aria-label={locale === "fr" ? "Rechercher et filtrer les commandes" : "Search and filter orders"}>
            <div className="grid items-end gap-3 lg:grid-cols-[minmax(18rem,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 bg-white pl-10 pr-10" placeholder={t.orders.searchPlaceholder} aria-label={t.orders.searchPlaceholder} />
              {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-charcoal" aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}><X className="h-4 w-4" /></button> : null}
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label={locale === "fr" ? "Filtrer par statut" : "Filter by status"}>
              {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] font-bold transition-colors sm:gap-2 sm:px-3 sm:text-xs ${filter === item.id ? "border-burgundy bg-burgundy text-white" : "border-border bg-white text-muted-foreground hover:border-burgundy/30 hover:text-burgundy"}`}><span className="truncate">{item.label}</span><span className={`min-w-4 shrink-0 rounded px-1 text-center text-[9px] sm:min-w-5 sm:text-[10px] ${filter === item.id ? "bg-white/15 text-white" : "bg-muted text-charcoal"}`}>{counts[item.id]}</span></button>)}
            </div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-muted-foreground" aria-live="polite">{filteredOrders.length} {t.orders.orderCount}</p>
          </section>

          {filteredOrders.length ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const availableCount = order.items.filter((item) => reorderableQuantity(item) > 0).length;
                const deliveryTimestamp = getOrderDeliveryTimestamp(order);
                return (
                  <article key={order.id} className="overflow-hidden rounded-lg border border-charcoal/10 bg-white">
                    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-charcoal">{order.number}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt, locale)} · {order.items.length} {t.orders.items.toLowerCase()}</p>
                      </div>
                      <Badge className={`max-w-[48%] shrink-0 border text-center ${orderStatusColor(order.status)}`}>{t.orders.statuses[orderStatusKey(order.status) as keyof typeof t.orders.statuses] || order.status}</Badge>
                    </div>

                    <OrderProgress order={order} locale={locale} />

                    <div className="grid grid-cols-2 divide-x divide-charcoal/10 border-b border-border/70 px-4 py-3">
                      <OrderFact icon={MapPin} label={locale === "fr" ? "Destination" : "Destination"} value={[order.deliveryCity, europeanCountryLabel(order.deliveryCountry, locale)].filter(Boolean).join(", ") || (locale === "fr" ? "À confirmer" : "To be confirmed")} />
                      <OrderFact icon={CalendarRange} label={order.status === "delivered" ? (locale === "fr" ? "Remise" : "Delivered") : (locale === "fr" ? "Arrivée" : "Arrival")} value={deliveryTimestamp ? formatDate(deliveryTimestamp, locale) : (locale === "fr" ? "À confirmer" : "To be confirmed")} />
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
                        <Button size="sm" variant="outline" onClick={() => navigate("order-tracking", { orderId: order.id })} className="border-burgundy/25 bg-white text-xs text-burgundy hover:bg-burgundy/[0.05] hover:text-burgundy">
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

function OrderMetric({ icon: Icon, label, value, className = "", urgent = false }: { icon: typeof Package; label: string; value: string; className?: string; urgent?: boolean }) {
  return <div className={`flex min-w-0 items-center gap-3 border-charcoal/10 px-3 py-3.5 sm:px-4 ${className}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${urgent ? "bg-gold/20 text-terre" : "bg-terre/[0.07] text-terre"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-black tabular-nums text-charcoal">{value}</p></div></div>;
}

function OrderFocus({ order, locale, onOpen }: { order: Order; locale: "fr" | "en"; onOpen: () => void }) {
  const attention = orderNeedsAttention(order.status);
  return <section className="mb-5 flex items-center gap-3 border-b border-charcoal/10 bg-terre/[0.025] px-3 pb-4 pt-1" aria-labelledby="order-focus-title" data-testid="order-focus"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${attention ? "bg-gold/20 text-terre" : "bg-burgundy/10 text-burgundy"}`}>{attention ? <CircleAlert className="h-4 w-4" /> : <PackageSearch className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase text-terre">{attention ? (locale === "fr" ? "Action prioritaire" : "Priority action") : (locale === "fr" ? "Prochaine livraison" : "Next delivery")}</p><h2 id="order-focus-title" className="mt-0.5 truncate text-xs font-black text-charcoal">{order.number} · {locale === "fr" ? "ouvrir le suivi" : "open tracking"}</h2><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{[order.deliveryCity, europeanCountryLabel(order.deliveryCountry, locale)].filter(Boolean).join(", ")}</p></div><Button type="button" size="sm" variant="ghost" onClick={onOpen} className="shrink-0 text-terre hover:bg-terre/[0.06] hover:text-terre" aria-label={locale === "fr" ? `Suivre la commande ${order.number}` : `Track order ${order.number}`}><span className="hidden sm:inline">{locale === "fr" ? "Ouvrir" : "Open"}</span><ArrowRight className="h-4 w-4" /></Button></section>;
}

function OrderProgress({ order, locale }: { order: Order; locale: "fr" | "en" }) {
  const stage = getOrderStageIndex(order.status);
  const progress = getOrderProgress(order.status);
  const interrupted = stage < 0;
  return <div className="border-b border-border/70 px-4 py-3" data-testid={`order-progress-${order.id}`}><div className="mb-2 flex items-center justify-between gap-3"><p className="text-[9px] font-black uppercase text-muted-foreground">{locale === "fr" ? "Parcours de livraison" : "Delivery journey"}</p><span className={`text-[9px] font-black ${interrupted ? "text-destructive" : "text-burgundy"}`}>{interrupted ? (locale === "fr" ? "À régulariser" : "Needs review") : `${stage + 1}/4`}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={locale === "fr" ? `Progression de ${order.number}` : `${order.number} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className={`h-full rounded-full transition-[width] ${interrupted ? "bg-destructive" : "bg-burgundy"}`} style={{ width: `${progress}%` }} /></div></div>;
}

function OrderFact({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return <div className="min-w-0 px-3 first:pl-0 last:pr-0"><p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-terre" />{label}</p><p className="mt-1 truncate text-[10px] font-bold text-charcoal">{value}</p></div>;
}
