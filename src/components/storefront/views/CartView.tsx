"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, ChevronRight, Tag, Truck, Package, Check, Boxes, MapPin, Clock3, X, ChefHat, Plus, ShieldCheck } from "lucide-react";
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
import { MobileActionDock } from "@/components/storefront/MobileActionDock";

export function CartView() {
  const locale = useStore((s) => s.locale);
  const cart = useStore((s) => s.cart);
  const updateQty = useStore((s) => s.updateQty);
  const removeLine = useStore((s) => s.removeLine);
  const clearCart = useStore((s) => s.clearCart);
  const coupon = useStore((s) => s.coupon);
  const setCoupon = useStore((s) => s.setCoupon);
  const country = useStore((s) => s.country);
  const postalCode = useStore((s) => s.postalCode);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];

  const [couponInput, setCouponInput] = useState(coupon || "");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; freeShipping?: boolean } | null>(null);
  const [couponError, setCouponError] = useState("");

  const subtotal = cartSubtotal(cart);
  const weight = cartWeightGrams(cart);
  const thermal = cartThermalSplit(cart);
  const thermalKey = thermal.join("|");
  const promotionItems = useMemo(() => cart.map((item) => ({ productId: item.productId, lineTotal: item.unitPrice * item.qty })), [cart]);

  const [shipQuote, setShipQuote] = useState<{ fee: number; carrier: string; minDelayHours?: number; maxDelayHours?: number } | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  useEffect(() => {
    const fetchShip = async () => {
      if (cart.length === 0) {
        setShipQuote(null);
        return;
      }
      setShipLoading(true);
      try {
        const res = await postJSON<{ fee: number; carrier: string; packages: number; minDelayHours?: number; maxDelayHours?: number }>("/api/shipping/quote", {
          weightGrams: weight,
          thermalClasses: thermalKey ? thermalKey.split("|") : [],
          postalCode,
          country,
        });
        setShipQuote(res);
      } catch {
        setShipQuote(null);
      } finally {
        setShipLoading(false);
      }
    };
    fetchShip();
  }, [cart.length, country, postalCode, thermalKey, weight]);

  useEffect(() => {
    let cancelled = false;
    if (!coupon) {
      setCouponApplied(null);
      return;
    }
    setCouponInput(coupon);
    postJSON<{ valid: boolean; discount?: number; freeShipping?: boolean; code?: string; error?: string }>("/api/promotions/validate", { code: coupon, subtotal, country, locale, items: promotionItems })
      .then((result) => {
        if (cancelled) return;
        if (result.valid) {
          setCouponApplied({ code: result.code || coupon, discount: result.discount || 0, freeShipping: result.freeShipping });
          setCouponError("");
          return;
        }
        setCouponApplied(null);
        setCoupon(null);
        setCouponError(result.error || (locale === "fr" ? "Ce code n'est plus applicable." : "This code is no longer applicable."));
      })
      .catch(() => {
        if (!cancelled) setCouponError(locale === "fr" ? "Vérification momentanément indisponible." : "Verification is temporarily unavailable.");
      });
    return () => { cancelled = true; };
  }, [coupon, country, locale, promotionItems, setCoupon, subtotal]);

  const promoDiscount = couponApplied?.discount || 0;
  const freeShip = couponApplied?.freeShipping;
  const shipFee = freeShip ? 0 : (shipQuote?.fee ?? (subtotal > 0 ? 6.9 : 0));
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
      const res = await postJSON<{ valid: boolean; discount?: number; freeShipping?: boolean; code?: string; error?: string }>("/api/promotions/validate", { code: couponInput, subtotal, country, locale, items: promotionItems });
      if (res.valid) {
        setCouponApplied({ code: res.code!, discount: res.discount!, freeShipping: res.freeShipping });
        setCoupon(res.code || null);
      } else {
        setCouponError(res.error || (locale === "fr" ? "Code invalide" : "Invalid code"));
      }
    } catch { setCouponError(locale === "fr" ? "Vérification momentanément indisponible." : "Verification is temporarily unavailable."); }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponApplied(null);
    setCouponInput("");
    setCouponError("");
  };

  const proceed = () => navigate("checkout");

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-7 md:py-10 lg:px-8">
        <PageBackButton fallbackView="catalog" />
        <section className="mx-auto flex min-h-[28rem] max-w-3xl flex-col items-center justify-center py-12 text-center md:min-h-[34rem]">
          <span className="relative grid h-24 w-24 place-items-center rounded-lg border border-terre/14 bg-terre/[0.055] text-terre shadow-[0_26px_60px_-38px_rgba(138,48,66,0.65)]">
            <ShoppingBag className="h-10 w-10" strokeWidth={1.65} />
            <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-md bg-gold text-charcoal shadow-sm"><Plus className="h-4 w-4" strokeWidth={2.5} /></span>
          </span>
          <p className="jma-eyebrow mt-7">{locale === "fr" ? "Votre sélection" : "Your selection"}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal md:text-4xl">{t.cart.empty}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Choisissez vos produits directement dans le marché, ou partez d'une recette pour générer un panier déjà calculé." : "Choose products directly from the market, or start with a recipe to generate a ready-calculated basket."}</p>
          <div className="mt-7 grid w-full max-w-md gap-2 sm:grid-cols-2">
            <Button onClick={() => navigate("catalog")} className="h-11 bg-terre text-cream hover:bg-terre-dark">
              {t.cart.emptyCta} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("recipes")} className="h-11 border-charcoal/14 bg-white text-charcoal hover:bg-muted">
              <ChefHat className="mr-2 h-4 w-4 text-burgundy" /> {locale === "fr" ? "Choisir une recette" : "Choose a recipe"}
            </Button>
          </div>
          <div className="mt-10 grid w-full max-w-2xl grid-cols-3 border-y border-charcoal/10 py-4 text-left">
            <EmptyBenefit icon={Package} label={locale === "fr" ? "Stock vérifié" : "Verified stock"} />
            <EmptyBenefit icon={Truck} label={locale === "fr" ? "Livraison suivie" : "Tracked delivery"} />
            <EmptyBenefit icon={ShieldCheck} label={locale === "fr" ? "Paiement protégé" : "Protected payment"} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="catalog" className="mb-2" />
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-charcoal/10 pb-4">
        <div><p className="jma-eyebrow">{locale === "fr" ? "Votre sélection" : "Your selection"}</p><h1 className="jma-section-title mt-1">{t.cart.title}</h1></div>
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
              <section key={key} className="border-y border-burgundy/25 bg-burgundy/[0.035] px-3 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="bg-burgundy text-cream border-0">{t.cart.recipeGroup.replace("{name}", recipeName)}</Badge>
                  <span className="ml-auto text-sm font-bold text-burgundy">{formatPrice(groupTotal, locale)}</span>
                </div>
                <div className="divide-y divide-burgundy/12">
                  {items.map((c) => <CartLine key={c.id} c={c} locale={locale} onQty={(q) => updateQty(c.id, q)} onRemove={() => removeLine(c.id)} />)}
                </div>
              </section>
            );
          })}

          {/* standalone */}
          {standalone.length > 0 && (
            <section className="border-y border-charcoal/10 bg-white px-3 py-1">
              <div className="divide-y divide-charcoal/8">
                {standalone.map((c) => <CartLine key={c.id} c={c} locale={locale} onQty={(q) => updateQty(c.id, q)} onRemove={() => removeLine(c.id)} />)}
              </div>
            </section>
          )}

        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-charcoal/12 bg-white p-4 shadow-[0_22px_50px_-42px_rgba(63,41,48,0.55)]">
            <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="font-display text-xl font-semibold text-charcoal">{t.config.summary}</h2><span className="text-[10px] font-bold uppercase text-muted-foreground">{cart.reduce((sum, item) => sum + item.qty, 0)} {locale === "fr" ? "article(s)" : "item(s)"}</span></div>

            {/* coupon */}
            <div className="mb-3 space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t.cart.coupon} aria-label={t.cart.coupon} className="pl-8 text-sm" />
                </div>
                <Button size="sm" variant="outline" onClick={applyCoupon} className="border-terre/30 text-terre hover:bg-terre/5 hover:text-terre">{t.cart.applyCoupon}</Button>
              </div>
              {couponApplied && <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-burgundy"><p><Check className="mr-1 inline h-3 w-3" />{couponApplied.code} {couponApplied.freeShipping ? (locale === "fr" ? "· livraison offerte" : "· free delivery") : `(-${formatPrice(couponApplied.discount, locale)})`}</p><button type="button" onClick={removeCoupon} aria-label={locale === "fr" ? "Retirer le code promotionnel" : "Remove promo code"} title={locale === "fr" ? "Retirer" : "Remove"} className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-muted"><X className="h-3.5 w-3.5" /></button></div>}
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            </div>

            <div className="flex items-start gap-2 border-y border-border py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/8 text-terre"><MapPin className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{locale === "fr" ? "Estimation de livraison" : "Delivery estimate"}</p><p className="mt-0.5 truncate text-xs font-bold text-charcoal">{postalCode ? `${postalCode} · ` : ""}{country}</p>{shipQuote ? <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{shipQuote.carrier}{shipQuote.minDelayHours && shipQuote.maxDelayHours ? ` · ${shipQuote.minDelayHours}–${shipQuote.maxDelayHours} h` : ""}</p> : null}</div>
            </div>

            <div className="space-y-1.5 pt-3 text-sm">
              <Row label={t.cart.subtotal} value={formatPrice(subtotal, locale)} />
              {promoDiscount > 0 && <Row label={t.cart.promo} value={`-${formatPrice(promoDiscount, locale)}`} className="text-burgundy" />}
              <Row label={t.cart.totalWeight} value={formatWeight(weight, locale)} />
              <Row label={t.cart.vat} value={formatPrice(vat, locale)} className="text-muted-foreground" />
              <Row label={t.cart.shipping} value={shipLoading ? t.loading : shipFee === 0 ? (locale === "fr" ? "Offerte" : "Free") : formatPrice(shipFee, locale)} />
              <div className="mt-2 flex items-center gap-2 rounded-md border border-gold/30 bg-gold/[0.08] p-2 text-xs text-charcoal">
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

            <Button onClick={proceed} size="lg" className="mt-3 hidden w-full bg-terre text-cream shadow-md hover:bg-terre-dark lg:flex">
              {t.cart.checkout} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-2 hidden text-center text-[10px] text-muted-foreground lg:block">{t.checkout.securePayment}</p>
          </div>
        </aside>
      </div>

      <MobileActionDock testId="cart-checkout-dock">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[8px] font-black uppercase text-muted-foreground">{locale === "fr" ? "Total, livraison incluse" : "Total, delivery included"}</p>
            <p className="mt-0.5 text-lg font-black tabular-nums text-terre">{shipLoading ? "…" : formatPrice(total, locale)}</p>
          </div>
          <Button onClick={proceed} size="lg" aria-label={`${t.cart.checkout}, ${formatPrice(total, locale)}`} className="h-11 min-w-0 flex-1 justify-between bg-terre px-3 text-cream shadow-md hover:bg-terre-dark">
            <span className="min-w-0 text-center leading-tight">{t.cart.checkout}</span><ChevronRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </MobileActionDock>
    </div>
  );
}

function CartLine({ c, locale, onQty, onRemove }: { c: CartItem; locale: string; onQty: (q: number) => void; onRemove: () => void }) {
  const t = dict[locale as "fr" | "en"];
  const localizedName = (locale === "en" ? c.nameEn : c.nameFr) || c.name;
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:flex sm:gap-3">
      <ProductImage src={c.imageUrl} alt={localizedName} emoji={c.imageEmoji} color={c.imageColor} size="sm" className="row-span-2 h-14 w-14 shrink-0 sm:row-auto" rounded="rounded-md" />
      <div className="min-w-0 sm:flex-1">
        <p className="truncate text-sm font-bold text-charcoal">{localizedName}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">{c.salesChannel === "wholesale" ? <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-burgundy"><Boxes className="h-3 w-3" />{locale === "fr" ? "Gros" : "Wholesale"}</span> : null}<span className="truncate">{c.unitLabel}</span><span aria-hidden="true">·</span><span className={`inline-flex shrink-0 items-center rounded border px-1 text-[9px] ${thermalColor(c.thermalClass)}`}>{thermalLabel(c.thermalClass, locale as any)}</span></p>
      </div>
      <div className="col-start-2 row-start-2 inline-flex w-fit items-center rounded-full border border-border sm:col-auto sm:row-auto">
        <button type="button" onClick={() => onQty(c.qty - 1)} disabled={c.salesChannel === "wholesale" && c.qty <= (c.minimumQty || 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35" aria-label={locale === "fr" ? `Diminuer la quantité de ${localizedName}` : `Decrease ${localizedName} quantity`}><span className="text-xs">−</span></button>
        <span className="min-w-7 text-center text-sm font-semibold">{c.qty}</span>
        <button type="button" onClick={() => onQty(Math.min(c.maxStock || 99, c.qty + 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" aria-label={locale === "fr" ? `Augmenter la quantité de ${localizedName}` : `Increase ${localizedName} quantity`}><span className="text-xs">+</span></button>
      </div>
      <span className="col-start-3 row-start-2 whitespace-nowrap text-right text-sm font-bold text-terre sm:col-auto sm:row-auto sm:w-20">{formatPrice(c.unitPrice * c.qty, locale as any)}</span>
      <button type="button" onClick={onRemove} aria-label={`${t.remove} ${localizedName}`} className="col-start-3 row-start-1 justify-self-end text-muted-foreground hover:text-destructive sm:col-auto sm:row-auto">
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex items-center justify-between ${className}`}><span>{label}</span><span className="font-medium">{value}</span></div>;
}

function EmptyBenefit({ icon: Icon, label }: { icon: typeof Package; label: string }) {
  return <span className="flex min-w-0 flex-col items-center gap-1.5 border-r border-charcoal/10 px-2 text-center last:border-r-0 sm:flex-row sm:justify-center sm:text-left"><Icon className="h-4 w-4 shrink-0 text-terre" /><span className="text-[9px] font-extrabold leading-3 text-charcoal sm:text-[10px]">{label}</span></span>;
}
