"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CreditCard, Truck, ShieldCheck, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore, cartSubtotal, cartWeightGrams, cartThermalSplit } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { formatPrice, formatWeight, thermalColor, thermalLabel } from "@/lib/format";
import { postJSON } from "@/lib/use-fetch";
import { PageBackButton } from "@/components/shared/PageBackButton";

export function CheckoutView() {
  const locale = useStore((s) => s.locale);
  const cart = useStore((s) => s.cart);
  const coupon = useStore((s) => s.coupon);
  const navigate = useStore((s) => s.navigate);
  const clearCart = useStore((s) => s.clearCart);
  const addresses = useStore((s) => s.addresses);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];

  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const addr = addresses[0];
  const [form, setForm] = useState({
    firstName: addr?.firstName || customer?.firstName || "",
    lastName: addr?.lastName || customer?.lastName || "",
    email: customer?.email || "",
    phone: addr?.phone || "",
    street: addr?.street || "",
    postalCode: addr?.postalCode || "",
    city: addr?.city || "",
    country: addr?.country || "France",
  });
  const [slot, setSlot] = useState("standard");
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });

  const subtotal = cartSubtotal(cart);
  const weight = cartWeightGrams(cart);
  const thermal = cartThermalSplit(cart);
  const shipFee = subtotal >= 50 ? 0 : 6.9;
  const total = subtotal + shipFee;

  const canNext0 = form.firstName && form.street && form.postalCode && form.city && form.email;
  const canPay = method === "card" ? card.number && card.expiry && card.cvc : true;

  const pay = async () => {
    setProcessing(true);
    setPaymentError("");
    try {
      const res = await postJSON<{ order: { id: string; number: string; total: number } }>("/api/checkout", {
        items: cart.map((c) => ({
          productId: c.productId, variantId: c.variantId, nameFr: c.nameFr, nameEn: c.nameEn,
          sku: c.productId, unitPrice: c.unitPrice, qty: c.qty, thermalClass: c.thermalClass,
          recipeId: c.recipeId, recipeNameFr: c.recipeName, recipeNameEn: c.recipeName, packWeightGrams: c.packWeightGrams,
        })),
        address: form, deliverySlot: slot, paymentMethod: method, subtotal, shipping: shipFee, coupon, customerEmail: form.email || customer?.email,
        locale,
        pushSubscriptionId: localStorage.getItem("jma-push-subscription-v1") || undefined,
      });
      clearCart();
      navigate("order-confirmation", { orderId: res.order.id });
    } catch (e: any) {
      setPaymentError(e.message || (locale === "fr" ? "Erreur de paiement" : "Payment error"));
    } finally {
      setProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted-foreground">{t.cart.empty}</p>
        <Button onClick={() => navigate("catalog")} className="mt-4 bg-terre text-cream">{t.cart.emptyCta}</Button>
      </div>
    );
  }

  const steps = [t.checkout.delivery, t.checkout.payment, t.checkout.review];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <PageBackButton fallbackView="cart" className="mb-4" />
      <h1 className="mb-4 text-2xl font-bold text-charcoal md:text-3xl">{t.checkout.title}</h1>

      {/* stepper */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-terre text-cream" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? "text-charcoal" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? "bg-terre" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.checkout.firstName} value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
              <Field label={t.checkout.lastName} value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            </div>
            <Field label={t.checkout.email} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label={t.checkout.phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label={t.checkout.street} value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
            <div className="grid grid-cols-3 gap-3">
              <Field label={t.checkout.postalCode} value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
              <Field label={t.checkout.city} value={form.city} onChange={(v) => setForm({ ...form, city: v })} className="col-span-2" />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold text-charcoal">{t.checkout.deliverySlot}</Label>
              <RadioGroup value={slot} onValueChange={setSlot} className="space-y-2">
                {[["standard", t.checkout.standard], ["express", t.checkout.express], ["relay", t.checkout.relay]].map(([v, l]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-terre has-[:checked]:bg-terre/5">
                    <RadioGroupItem value={v} /> <Truck className="h-4 w-4 text-terre" /> {l}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Button onClick={() => setStep(1)} disabled={!canNext0} className="w-full bg-terre text-cream hover:bg-terre-dark">{t.next}</Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold text-charcoal">{t.checkout.paymentMethod}</Label>
              <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[["card", t.checkout.card, "💳"], ["applePay", t.checkout.applePay, ""], ["googlePay", t.checkout.googlePay, ""], ["paypal", t.checkout.paypal, "🅿️"], ["giftCardPay", t.checkout.giftCardPay, "🎁"]].map(([v, l, ic]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-terre has-[:checked]:bg-terre/5">
                    <RadioGroupItem value={v} /> <span>{ic}</span> {l}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {method === "card" && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <Field label={t.checkout.cardNumber} value={card.number} onChange={(v) => setCard({ ...card, number: v.replace(/[^\d ]/g, "").slice(0, 19) })} placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.checkout.expiry} value={card.expiry} onChange={(v) => setCard({ ...card, expiry: v })} placeholder="12/26" />
                  <Field label={t.checkout.cvc} value={card.cvc} onChange={(v) => setCard({ ...card, cvc: v.replace(/\D/g, "").slice(0, 4) })} placeholder="123" />
                </div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> {locale === "fr" ? "Démonstration — aucune carte réelle n'est débitée." : "Demo — no real card is charged."}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">{t.previous}</Button>
              <Button onClick={() => setStep(2)} disabled={!canPay} className="flex-1 bg-terre text-cream hover:bg-terre-dark">{t.next}</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="font-semibold text-charcoal">{form.firstName} {form.lastName}</p>
              <p className="text-muted-foreground">{form.street}, {form.postalCode} {form.city}, {form.country}</p>
              <p className="text-muted-foreground">{form.email} · {form.phone}</p>
            </div>
            <div className="space-y-1.5">
              {cart.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2 text-charcoal">{c.name} × {c.qty}</span>
                  <span className="font-medium">{formatPrice(c.unitPrice * c.qty, locale)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between"><span>{t.cart.subtotal}</span><span>{formatPrice(subtotal, locale)}</span></div>
              <div className="flex justify-between"><span>{t.cart.shipping}</span><span>{shipFee === 0 ? (locale === "fr" ? "Offerte" : "Free") : formatPrice(shipFee, locale)}</span></div>
              <div className="flex justify-between"><span>{t.cart.totalWeight}</span><span>{formatWeight(weight, locale)}</span></div>
              <div className="flex justify-between"><span>{t.cart.packages}</span><span>{thermal.length || 1} · {thermal.map((tc) => thermalLabel(tc, locale)).join(", ")}</span></div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-bold text-charcoal">{t.cart.total}</span>
                <span className="text-xl font-extrabold text-terre">{formatPrice(total, locale)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-forest/5 p-2 text-xs text-forest">
              <ShieldCheck className="h-4 w-4" /> {t.checkout.securePayment}
            </div>
            {paymentError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{paymentError}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t.previous}</Button>
              <Button onClick={pay} disabled={processing} className="flex-1 bg-terre text-cream hover:bg-terre-dark">
                {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.checkout.processing}</> : <><CreditCard className="mr-2 h-4 w-4" /> {t.checkout.placeOrder.replace("{amount}", total.toFixed(2))}</>}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-semibold text-charcoal">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-background" />
    </div>
  );
}
