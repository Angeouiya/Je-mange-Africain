"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, ChevronRight, Tag, Truck, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore, cartSubtotal, cartWeightGrams, cartThermalSplit, CartItem } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { formatPrice, formatWeight, thermalColor, thermalLabel } from "@/lib/format";
import { postJSON } from "@/lib/use-fetch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";

export function CartView() {
  const locale = useStore((s) => s.locale);
  const cart = useStore((s) => s.cart);
  const updateQty = useStore((s) => s.updateQty);
  const removeLine = useStore((s) => s.removeLine);
  const clearCart = useStore((s) => s.clearCart);
  const coupon = useStore((s) => s.coupon);
  const setCoupon = useStore((s) => s.setCoupon);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const promoCodes = ["BIENVENUE10", "FRAIS5", "LIVRAISONOFFERTE"];

  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; freeShipping?: boolean } | null>(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = cartSubtotal(cart);
  const weight = cartWeightGrams(cart);
  const thermal = cartThermalSplit(cart);
  const thermalKey = thermal.join("|");

  const [shipQuote, setShipQuote] = useState<{ fee: number; carrier: string } | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  useEffect(() => {
    const fetchShip = async () => {
      if (cart.length === 0) {
        setShipQuote(null);
        return;
      }
      setShipLoading(true);
      try {
        const res = await postJSON<{ fee: number; carrier: string; packages: number }>("/api/shipping/quote", {
          weightGrams: weight,
          thermalClasses: thermalKey ? thermalKey.split("|") : [],
          postalCode: "75011",
          country: "France",
        });
        setShipQuote(res);
      } catch {
        setShipQuote(null);
      } finally {
        setShipLoading(false);
      }
    };
    fetchShip();
  }, [cart.length, weight, thermalKey]);

  const promoDiscount = couponApplied?.discount || 0;
  const freeShip = couponApplied?.freeShipping;
  const shipFee = freeShip ? 0 : (shipQuote?.fee ?? (subtotal >= 50 ? 0 : subtotal > 0 ? 6.9 : 0));
  const taxable = Math.max(0, subtotal - promoDiscount);
  const vat = Math.round((taxable / 1.2) * 0.2 * 100) / 100;
  const total = taxable + shipFee;

  // group cart by recipe
  const recipeGroups = new Map<string, CartItem[]>();
  const standalone: CartItem[] = [];
  cart.forEach((c) => {
    if (c.recipeId) {
      const k = c.recipeId + "::" + (c.recipeName || "");
      if (!recipeGroups.has(k)) recipeGroups.set(k, []);
      recipeGroups.get(k)!.push(c);
    } else standalone.push(c);
  });

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError("");
    try {
      const res = await postJSON<{ valid: boolean; discount?: number; freeShipping?: boolean; code?: string; error?: string }>("/api/promotions/validate", { code: couponInput, subtotal });
      if (res.valid) {
        setCouponApplied({ code: res.code!, discount: res.discount!, freeShipping: res.freeShipping });
        setCoupon(res.code || null);
      } else {
        setCouponError(res.error || "Code invalide");
      }
    } catch { setCouponError("Erreur"); }
  };

  const proceed = () => navigate("checkout");

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <PageBackButton fallbackView="catalog" className="self-start" />
        <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-bold text-charcoal">{t.cart.empty}</h2>
        <Button onClick={() => navigate("catalog")} className="bg-terre text-cream hover:bg-terre-dark">
          {t.cart.emptyCta} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <PageBackButton fallbackView="catalog" className="mb-2" />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal md:text-3xl">{t.cart.title}</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-4 w-4" /> {t.cart.clear}</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{locale === "fr" ? "Vider tout le panier ?" : "Empty the entire cart?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? "Tous les produits, quantités et paniers de recettes seront retirés. Cette action ne peut pas être annulée." : "All products, quantities and recipe baskets will be removed. This action cannot be undone."}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Conserver mon panier" : "Keep my cart"}</AlertDialogCancel><AlertDialogAction onClick={clearCart} className="bg-destructive text-white hover:bg-destructive/90">{locale === "fr" ? "Oui, tout retirer" : "Yes, remove all"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* items */}
        <div className="space-y-4">
          {/* recipe groups */}
          {Array.from(recipeGroups.entries()).map(([key, items]) => {
            const recipeName = key.split("::")[1] || "Recette";
            const groupTotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
            return (
              <div key={key} className="rounded-2xl border border-forest/30 bg-forest/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-forest text-cream border-0">{t.cart.recipeGroup.replace("{name}", recipeName)}</Badge>
                  <span className="ml-auto text-sm font-bold text-forest">{formatPrice(groupTotal, locale)}</span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => <CartLine key={c.id} c={c} locale={locale} onQty={(q) => updateQty(c.id, q)} onRemove={() => removeLine(c.id)} />)}
                </div>
              </div>
            );
          })}

          {/* standalone */}
          {standalone.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="space-y-2">
                {standalone.map((c) => <CartLine key={c.id} c={c} locale={locale} onQty={(q) => updateQty(c.id, q)} onRemove={() => removeLine(c.id)} />)}
              </div>
            </div>
          )}

        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-charcoal">{t.config.summary}</h2>

            {/* coupon */}
            <div className="mb-3 space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t.cart.coupon} className="pl-8 text-sm" />
                </div>
                <Button size="sm" onClick={applyCoupon} className="bg-charcoal text-cream hover:bg-charcoal/90">{t.cart.applyCoupon}</Button>
              </div>
              {couponApplied && <p className="text-xs text-forest"><Check className="inline h-3 w-3" /> {couponApplied.code} (-{formatPrice(couponApplied.discount, locale)})</p>}
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              <div className="flex flex-wrap gap-1.5" aria-label={locale === "fr" ? "Codes promotionnels disponibles" : "Available promotion codes"}>
                {promoCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCouponInput(code)}
                    aria-pressed={couponInput === code}
                    className={`rounded-md border px-2 py-1 text-[9px] font-bold transition-colors ${couponInput === code ? "border-terre bg-terre/8 text-terre" : "border-border bg-background text-muted-foreground hover:border-terre/35 hover:text-charcoal"}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3 text-sm">
              <Row label={t.cart.subtotal} value={formatPrice(subtotal, locale)} />
              {promoDiscount > 0 && <Row label={t.cart.promo} value={`-${formatPrice(promoDiscount, locale)}`} className="text-forest" />}
              <Row label={t.cart.totalWeight} value={formatWeight(weight, locale)} />
              <Row label={t.cart.vat} value={formatPrice(vat, locale)} className="text-muted-foreground" />
              <Row label={t.cart.shipping} value={shipLoading ? t.loading : shipFee === 0 ? (locale === "fr" ? "Offerte" : "Free") : formatPrice(shipFee, locale)} />
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                <Truck className="h-3.5 w-3.5" />
                <span>{t.cart.thermalSplit.replace("{n}", String(thermal.length || 1))}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {thermal.map((tc) => <span key={tc} className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${thermalColor(tc)}`}><Package className="mr-1 h-2.5 w-2.5" />{thermalLabel(tc, locale)}</span>)}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-charcoal">{t.cart.total}</span>
              <span className="text-2xl font-extrabold text-terre">{formatPrice(total, locale)}</span>
            </div>

            <Button onClick={proceed} size="lg" className="mt-3 w-full bg-terre text-cream hover:bg-terre-dark shadow-md">
              {t.cart.checkout} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">{t.checkout.securePayment}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartLine({ c, locale, onQty, onRemove }: { c: CartItem; locale: string; onQty: (q: number) => void; onRemove: () => void }) {
  const t = dict[locale as "fr" | "en"];
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg bg-background p-2.5 sm:flex sm:gap-3">
      <ProductImage src={c.imageUrl} alt={c.name} emoji={c.imageEmoji} color={c.imageColor} size="sm" className="row-span-2 h-14 w-14 shrink-0 sm:row-auto" rounded="rounded-md" />
      <div className="min-w-0 sm:flex-1">
        <p className="truncate text-sm font-bold text-charcoal">{c.name}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground"><span className="truncate">{c.unitLabel}</span><span aria-hidden="true">·</span><span className={`inline-flex shrink-0 items-center rounded border px-1 text-[9px] ${thermalColor(c.thermalClass)}`}>{thermalLabel(c.thermalClass, locale as any)}</span></p>
      </div>
      <div className="col-start-2 row-start-2 inline-flex w-fit items-center rounded-full border border-border sm:col-auto sm:row-auto">
        <button onClick={() => onQty(c.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label="-"><span className="text-xs">−</span></button>
        <span className="min-w-7 text-center text-sm font-semibold">{c.qty}</span>
        <button onClick={() => onQty(Math.min(c.maxStock || 99, c.qty + 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label="+"><span className="text-xs">+</span></button>
      </div>
      <span className="col-start-3 row-start-2 whitespace-nowrap text-right text-sm font-bold text-terre sm:col-auto sm:row-auto sm:w-20">{formatPrice(c.unitPrice * c.qty, locale as any)}</span>
      <button onClick={onRemove} aria-label={t.remove} className="col-start-3 row-start-1 justify-self-end text-muted-foreground hover:text-destructive sm:col-auto sm:row-auto">
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex items-center justify-between ${className}`}><span>{label}</span><span className="font-medium">{value}</span></div>;
}
