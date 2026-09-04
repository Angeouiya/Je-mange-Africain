"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Home,
  LogIn,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { MobileActionDock } from "@/components/storefront/MobileActionDock";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { deliveryServiceLabel, formatDate, formatPrice, thermalLabel } from "@/lib/format";
import { downloadOrderInvoice } from "@/lib/client-actions";
import type { Order } from "@/lib/types";

export function OrderConfirmationView() {
  const locale = useStore((state) => state.locale);
  const params = useStore((state) => state.params);
  const navigate = useStore((state) => state.navigate);
  const customer = useStore((state) => state.customer);
  const t = dict[locale];
  const isFr = locale === "fr";
  const { data: order, loading, error, refetch } = useFetch<Order>(
    customer && params.orderId ? `/api/orders/${params.orderId}?locale=${locale}` : null,
    [customer?.id, params.orderId, locale],
  );

  if (!customer) {
    return (
      <div className="mx-auto grid min-h-[58vh] max-w-md place-items-center px-5 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-terre/10 text-terre"><LogIn className="h-5 w-5" /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-charcoal">{isFr ? "Confirmation protégée" : "Protected confirmation"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{isFr ? "Connectez-vous avec le compte utilisé lors du paiement pour retrouver cette commande." : "Sign in with the account used at checkout to retrieve this order."}</p>
          <Button type="button" onClick={() => navigate("account", { returnView: "orders" })} className="mt-5 bg-terre text-white hover:bg-terre-dark"><LogIn className="h-4 w-4" />{t.nav.login}</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-7 md:px-7 md:py-10">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="mt-5 h-64 rounded-lg" />
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><Skeleton className="h-80 rounded-lg" /><Skeleton className="h-80 rounded-lg" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto grid min-h-[52vh] max-w-md place-items-center px-5 text-center">
        <div>
          <AlertCircle className="mx-auto h-9 w-9 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-charcoal">{isFr ? "Confirmation momentanément indisponible" : "Confirmation temporarily unavailable"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{isFr ? "Votre commande reste enregistrée. Réessayez ou retrouvez-la depuis votre historique." : "Your order remains recorded. Retry or find it in your order history."}</p>
          <div className="mt-5 flex justify-center gap-2"><Button type="button" variant="outline" onClick={refetch}>{isFr ? "Réessayer" : "Retry"}</Button><Button type="button" onClick={() => navigate("orders")} className="bg-terre text-white hover:bg-terre-dark">{isFr ? "Mes commandes" : "My orders"}</Button></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-muted-foreground">{isFr ? "Commande introuvable." : "Order not found."}</div>;
  }

  const shipment = order.shipments?.[0];
  const payment = order.payments?.find((entry) => entry.status === "captured") || order.payments?.[0];
  const itemCount = order.items.reduce((total, item) => total + item.qty, 0);
  const hasColdChain = order.items.some((item) => item.thermalClass !== "AMBIANT");
  const progress = confirmationProgress(order.status);
  const deliveryDate = shipment?.estimatedDelivery ? formatDate(shipment.estimatedDelivery, locale) : (isFr ? "À confirmer" : "To be confirmed");
  const firstName = customer.firstName || order.deliveryName?.split(" ")[0] || "";
  const steps = [
    { icon: ShieldCheck, title: isFr ? "Paiement validé" : "Payment validated", detail: isFr ? "Transaction sécurisée" : "Secure transaction" },
    { icon: PackageCheck, title: isFr ? "Préparation" : "Preparation", detail: hasColdChain ? (isFr ? "Température contrôlée" : "Temperature controlled") : (isFr ? "Contrôle des produits" : "Product checks") },
    { icon: Truck, title: isFr ? "Remise au transporteur" : "Carrier handover", detail: shipment?.carrierName || shipment?.carrier || (isFr ? "Après préparation" : "After preparation") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-40 pt-6 md:px-7 md:pb-12 md:pt-9 lg:px-8" data-testid="order-confirmation">
      <PageBackButton fallbackView="orders" className="mb-3" />

      <section className="overflow-hidden rounded-lg border border-burgundy/15 bg-[#FFF9F6]" aria-labelledby="confirmation-title" data-testid="confirmation-command-center">
        <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-7 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-8">
          <div className="min-w-0">
            <motion.span
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 17 }}
              className="grid h-12 w-12 place-items-center rounded-lg bg-burgundy text-white shadow-[0_12px_30px_-18px_rgba(138,48,66,0.8)]"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.span>
            <p className="mt-4 text-[10px] font-black uppercase text-terre">{isFr ? "Commande reçue" : "Order received"}</p>
            <h1 id="confirmation-title" className="mt-1 max-w-2xl font-display text-3xl font-semibold leading-tight text-charcoal sm:text-4xl">
              {isFr ? `Merci${firstName ? ` ${firstName}` : ""}, c'est confirmé.` : `Thank you${firstName ? ` ${firstName}` : ""}, it is confirmed.`}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{isFr ? "Nous avons bien reçu votre commande. Chaque article sera contrôlé avant son conditionnement et son expédition." : "We have received your order. Every item will be checked before packing and dispatch."}</p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-burgundy/12 bg-burgundy/12 md:mt-0 md:min-w-72">
            <div className="bg-white px-4 py-3"><dt className="text-[9px] font-black uppercase text-muted-foreground">{t.checkout.orderNumber}</dt><dd className="mt-1 truncate text-sm font-black text-burgundy">{order.number}</dd></div>
            <div className="bg-white px-4 py-3"><dt className="text-[9px] font-black uppercase text-muted-foreground">{t.orders.date}</dt><dd className="mt-1 text-sm font-bold text-charcoal">{formatDate(order.createdAt, locale)}</dd></div>
          </dl>
        </div>

        <ol className="grid grid-cols-3 border-t border-burgundy/12 bg-white" aria-label={isFr ? "Prochaines étapes de la commande" : "Next order steps"}>
          {steps.map((step, index) => {
            const isComplete = index < progress;
            const isCurrent = index === Math.min(progress, steps.length - 1);
            return (
              <li key={step.title} className="relative min-w-0 border-r border-burgundy/10 px-2 py-4 last:border-r-0 sm:px-5">
                <div className="flex items-start gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${isComplete ? "bg-burgundy text-white" : isCurrent ? "bg-gold/25 text-terre-dark ring-1 ring-gold/60" : "bg-muted text-muted-foreground"}`}>
                    {isComplete ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0"><p className={`text-[10px] font-black leading-4 sm:text-xs ${isComplete || isCurrent ? "text-charcoal" : "text-muted-foreground"}`}>{step.title}</p><p className="mt-0.5 hidden truncate text-[9px] text-muted-foreground sm:block">{step.detail}</p></div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <section className="overflow-hidden rounded-lg border border-border bg-white" aria-labelledby="confirmed-items-title">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Votre sélection" : "Your selection"}</p><h2 id="confirmed-items-title" className="mt-0.5 font-display text-xl font-semibold text-charcoal">{isFr ? "Articles confirmés" : "Confirmed items"}</h2></div>
            <span className="shrink-0 rounded-md bg-burgundy/8 px-2 py-1 text-[10px] font-black text-burgundy">{itemCount} {isFr ? "article(s)" : "item(s)"}</span>
          </div>

          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                <ProductImage src={item.imageUrl} alt={item.name} emoji="🍲" color="#D65A32" size="sm" className="h-14 w-14 shrink-0" rounded="rounded-md" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-charcoal">{item.name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.qty} × {formatPrice(item.unitPrice, locale)}{item.unitLabel ? ` · ${item.unitLabel}` : ""}</p><p className="mt-1 text-[9px] font-bold uppercase text-burgundy">{thermalLabel(item.thermalClass, locale)}</p></div>
                <p className="shrink-0 text-sm font-black tabular-nums text-terre">{formatPrice(item.lineTotal, locale)}</p>
              </li>
            ))}
          </ul>

          <dl className="border-t border-border bg-[#FFFCFA] px-4 py-4 text-xs sm:px-5">
            <SummaryLine label={isFr ? "Sous-total" : "Subtotal"} value={formatPrice(order.subtotal, locale)} />
            {order.promoDiscount > 0 ? <SummaryLine label={isFr ? "Remise" : "Discount"} value={`-${formatPrice(order.promoDiscount, locale)}`} accent /> : null}
            <SummaryLine label={isFr ? "Livraison" : "Delivery"} value={formatPrice(order.shippingCost, locale)} />
            <SummaryLine label={isFr ? "Dont TVA" : "Including VAT"} value={formatPrice(order.vatAmount, locale)} />
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-burgundy/15 pt-3"><dt className="font-black text-charcoal">{t.cart.total}</dt><dd className="text-xl font-black tabular-nums text-terre">{formatPrice(order.total, locale)}</dd></div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-white p-4 sm:p-5" aria-labelledby="confirmed-delivery-title">
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><Truck className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Acheminement" : "Delivery"}</p><h2 id="confirmed-delivery-title" className="mt-0.5 text-base font-black text-charcoal">{deliveryDate}</h2><p className="mt-1 text-xs text-muted-foreground">{deliveryServiceLabel(order.deliverySlot || "standard", locale)}</p></div></div>
            <div className="mt-4 border-t border-border pt-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-terre" />{isFr ? "Adresse de livraison" : "Delivery address"}</p><p className="mt-2 text-sm font-bold text-charcoal">{order.deliveryName}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{[order.deliveryAddress, `${order.deliveryPostalCode || ""} ${order.deliveryCity || ""}`.trim(), order.deliveryCountry].filter(Boolean).join(", ")}</p></div>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border"><ConfirmationFact icon={CalendarDays} label={isFr ? "Arrivée" : "Arrival"} value={deliveryDate} /><ConfirmationFact icon={PackageCheck} label={isFr ? "Colis" : "Parcels"} value={String(order.packageCount || order.shipments.length || 1)} /></div>
          </section>

          <section className="rounded-lg border border-border bg-white p-4 sm:p-5" aria-labelledby="confirmed-payment-title">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy/8 text-burgundy"><WalletCards className="h-4 w-4" /></span><div><p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Transaction" : "Transaction"}</p><h2 id="confirmed-payment-title" className="text-base font-black text-charcoal">{paymentStatusLabel(payment?.status, locale)}</h2></div></div>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{isFr ? "Mode" : "Method"}</dt><dd className="font-bold text-charcoal">{paymentMethodLabel(payment?.method || order.paymentMethod, locale)}</dd></div>{payment?.reference ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{isFr ? "Référence" : "Reference"}</dt><dd className="max-w-[12rem] truncate font-mono text-[10px] font-bold text-charcoal">{payment.reference}</dd></div> : null}</dl>
          </section>

          <div className="hidden grid-cols-2 gap-2 md:grid" data-testid="confirmation-desktop-actions">
            <Button type="button" onClick={() => navigate("order-tracking", { orderId: order.id })} className="bg-terre text-white hover:bg-terre-dark"><Truck className="h-4 w-4" />{t.checkout.trackOrder}</Button>
            <Button type="button" variant="outline" onClick={() => downloadOrderInvoice(order, locale)}><Download className="h-4 w-4" />{t.orders.invoice}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("orders")}><ReceiptText className="h-4 w-4" />{isFr ? "Mes commandes" : "My orders"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("home")}><Home className="h-4 w-4" />{t.checkout.backHome}</Button>
          </div>
        </div>
      </div>

      <MobileActionDock testId="confirmation-action-dock">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Commande confirmée" : "Order confirmed"}</p><p className="mt-0.5 truncate text-sm font-black text-burgundy">{order.number}</p></div>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 border-burgundy/20 bg-white text-burgundy" onClick={() => downloadOrderInvoice(order, locale)} aria-label={isFr ? "Télécharger la facture" : "Download invoice"}><Download className="h-4 w-4" /></Button>
          <Button type="button" className="h-10 shrink-0 bg-terre px-3 text-white hover:bg-terre-dark" onClick={() => navigate("order-tracking", { orderId: order.id })}>{isFr ? "Suivre" : "Track"}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
        </div>
      </MobileActionDock>
    </div>
  );
}

function confirmationProgress(status: string) {
  if (["in_transit", "shipped", "out_for_delivery", "delivered"].includes(status)) return 3;
  if (["preparing", "picking", "packed", "ready"].includes(status)) return 2;
  return 1;
}

function paymentStatusLabel(status: string | undefined, locale: "fr" | "en") {
  if (status === "captured" || status === "paid") return locale === "fr" ? "Paiement validé" : "Payment validated";
  if (status === "failed") return locale === "fr" ? "Paiement à vérifier" : "Payment requires review";
  if (status === "refunded") return locale === "fr" ? "Paiement remboursé" : "Payment refunded";
  return locale === "fr" ? "Paiement enregistré" : "Payment recorded";
}

function paymentMethodLabel(method: string | null | undefined, locale: "fr" | "en") {
  const labels: Record<string, { fr: string; en: string }> = {
    card: { fr: "Carte bancaire", en: "Payment card" },
    apple_pay: { fr: "Apple Pay", en: "Apple Pay" },
    google_pay: { fr: "Google Pay", en: "Google Pay" },
    paypal: { fr: "PayPal", en: "PayPal" },
    gift_card: { fr: "Carte cadeau", en: "Gift card" },
  };
  return labels[method || ""]?.[locale] || (locale === "fr" ? "Enregistré" : "Recorded");
}

function SummaryLine({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 py-1 ${accent ? "text-burgundy" : "text-muted-foreground"}`}><dt>{label}</dt><dd className="font-bold tabular-nums">{value}</dd></div>;
}

function ConfirmationFact({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="min-w-0 bg-[#FFFCFA] px-3 py-3"><p className="flex items-center gap-1.5 text-[8px] font-black uppercase text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-terre" />{label}</p><p className="mt-1 truncate text-[10px] font-black text-charcoal">{value}</p></div>;
}
