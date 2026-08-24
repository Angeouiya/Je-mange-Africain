"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, ChevronRight, Tag, Truck, Package, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore, cartSubtotal, cartWeightGrams, cartThermalSplit, CartItem } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { formatPrice, formatWeight, thermalColor, thermalLabel } from "@/lib/format";
import { postJSON } from "@/lib/use-fetch";
import { toast } from "sonner";

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
        setCoupon(res.code);
        toast.success(locale === "fr" ? `Code ${res.code} appliqué` : `Code ${res.code} applied`);
      } else {
        setCouponError(res.error || "Code invalide");
        toast.error(res.error || "Code invalide");
      }
    } catch { setCouponError("Erreur"); }
  };

  const proceed = () => navigate("checkout");

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal md:text-3xl">{t.cart.title}</h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1 h-4 w-4" /> {t.cart.clear}
        </Button>
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

          <Button variant="outline" onClick={() => navigate("catalog")} className="text-charcoal">
            <ArrowLeft className="mr-1 h-4 w-4" /> {t.cart.continueShopping}
          </Button>
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
              <p className="text-[10px] text-muted-foreground">BIENVENUE10 · FRAIS5 · LIVRAISONOFFERTE</p>
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
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl bg-background p-2">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-2xl" style={{ background: (c.imageColor || "#D65A32") + "22" }}>{c.imageEmoji || "🍲"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{c.name}</p>
        <p className="text-[11px] text-muted-foreground">{c.unitLabel} · <span className={`inline-flex items-center rounded border px-1 text-[9px] ${thermalColor(c.thermalClass)}`}>{thermalLabel(c.thermalClass, locale as any)}</span></p>
      </div>
      <div className="inline-flex items-center rounded-full border border-border">
        <button onClick={() => onQty(c.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label="-"><span className="text-xs">−</span></button>
        <span className="min-w-7 text-center text-sm font-semibold">{c.qty}</span>
        <button onClick={() => onQty(Math.min(c.maxStock || 99, c.qty + 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label="+"><span className="text-xs">+</span></button>
      </div>
      <span className="w-20 text-right text-sm font-bold text-terre">{formatPrice(c.unitPrice * c.qty, locale as any)}</span>
      <button onClick={onRemove} aria-label={t.remove} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex items-center justify-between ${className}`}><span>{label}</span><span className="font-medium">{value}</span></div>;
}
