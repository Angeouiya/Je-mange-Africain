"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2, Lock, LogIn, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";
import { formatPrice, formatWeight, thermalLabel } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { cartSubtotal, cartThermalSplit, cartWeightGrams, useStore } from "@/lib/store";
import { postJSON } from "@/lib/use-fetch";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type IntentResponse = {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  pricing: { subtotal: number; promoDiscount: number; shipping: number; vat: number; packages: number; carrier: string };
};

export function CheckoutView() {
  const locale = useStore((state) => state.locale);
  const cart = useStore((state) => state.cart);
  const coupon = useStore((state) => state.coupon);
  const navigate = useStore((state) => state.navigate);
  const clearCart = useStore((state) => state.clearCart);
  const addresses = useStore((state) => state.addresses);
  const customer = useStore((state) => state.customer);
  const t = dict[locale];

  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const address = addresses[0];
  const [form, setForm] = useState({
    firstName: address?.firstName || customer?.firstName || "",
    lastName: address?.lastName || customer?.lastName || "",
    email: customer?.email || "",
    phone: address?.phone || customer?.phone || "",
    street: address?.street || "",
    postalCode: address?.postalCode || "",
    city: address?.city || "",
    country: address?.country || "France",
  });
  const [slot, setSlot] = useState("standard");
  const [shipQuote, setShipQuote] = useState<{ fee: number; carrier: string; packages: number } | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  const [promotion, setPromotion] = useState<{ discount: number; freeShipping?: boolean } | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);

  const subtotal = cartSubtotal(cart);
  const weight = cartWeightGrams(cart);
  const thermal = cartThermalSplit(cart);
  const thermalKey = thermal.join("|");
  const promoDiscount = promotion?.discount || 0;
  const quotedFee = shipQuote?.fee ?? (subtotal >= 50 ? 0 : 4.9 + 0.6 * (weight / 1000) + (thermal.includes("FROZEN") ? 2.5 : 0));
  const shipFee = promotion?.freeShipping ? 0 : quotedFee;
  const displayTotal = intent?.amount ?? Math.max(0, subtotal - promoDiscount) + shipFee;
  const checkoutItems = cart.map((item) => ({
    productId: item.productId,
    qty: item.qty,
    recipeId: item.recipeId,
    recipeNameFr: item.recipeName,
    recipeNameEn: item.recipeName,
  }));

  useEffect(() => {
    let cancelled = false;
    setShipLoading(true);
    postJSON<{ fee: number; carrier: string; packages: number }>("/api/shipping/quote", {
      weightGrams: weight,
      thermalClasses: thermalKey ? thermalKey.split("|") : [],
      postalCode: form.postalCode,
      country: form.country,
    }).then((quote) => {
      if (!cancelled) setShipQuote(quote);
    }).catch(() => {
      if (!cancelled) setShipQuote(null);
    }).finally(() => {
      if (!cancelled) setShipLoading(false);
    });
    return () => { cancelled = true; };
  }, [form.country, form.postalCode, thermalKey, weight]);

  useEffect(() => {
    let cancelled = false;
    if (!coupon) {
      setPromotion(null);
      return;
    }
    setPromotionLoading(true);
    postJSON<{ valid: boolean; discount?: number; freeShipping?: boolean }>("/api/promotions/validate", { code: coupon, subtotal })
      .then((result) => {
        if (!cancelled) setPromotion(result.valid ? { discount: result.discount || 0, freeShipping: result.freeShipping } : null);
      })
      .catch(() => {
        if (!cancelled) setPromotion(null);
      })
      .finally(() => {
        if (!cancelled) setPromotionLoading(false);
      });
    return () => { cancelled = true; };
  }, [coupon, subtotal]);

  const canContinue = Boolean(form.firstName && form.street && form.postalCode && form.city && form.email);

  const preparePayment = async () => {
    setPreparingPayment(true);
    setPaymentError("");
    try {
      const response = await postJSON<IntentResponse>("/api/payments/intent", {
        items: checkoutItems,
        address: form,
        coupon,
        locale,
      });
      if (!response.clientSecret) throw new Error(locale === "fr" ? "Le paiement sécurisé n'a pas pu démarrer." : "Secure checkout could not start.");
      setIntent(response);
      setStep(1);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : (locale === "fr" ? "Le paiement est indisponible." : "Payment is unavailable."));
    } finally {
      setPreparingPayment(false);
    }
  };

  const finalizeOrder = async (paymentIntentId: string) => {
    setProcessing(true);
    setPaymentError("");
    try {
      const response = await postJSON<{ order: { id: string; number: string; total: number } }>("/api/checkout", {
        items: checkoutItems,
        address: form,
        deliverySlot: slot,
        paymentIntentId,
        coupon,
        locale,
        pushSubscriptionId: localStorage.getItem("jma-push-subscription-v1") || undefined,
      });
      clearCart();
      navigate("order-confirmation", { orderId: response.order.id });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : (locale === "fr" ? "La commande n'a pas pu être finalisée." : "The order could not be completed."));
    } finally {
      setProcessing(false);
    }
  };

  if (cart.length === 0) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><p className="text-muted-foreground">{t.cart.empty}</p><Button onClick={() => navigate("catalog")} className="mt-4 bg-terre text-cream">{t.cart.emptyCta}</Button></div>;
  }

  if (!customer) {
    return (
      <div className="mx-auto min-h-[68dvh] max-w-xl px-4 py-6 lg:px-6">
        <PageBackButton fallbackView="cart" />
        <div className="flex min-h-[55dvh] flex-col items-center justify-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-md bg-terre/10 text-terre"><Lock className="h-6 w-6" /></span>
          <p className="mt-5 text-[10px] font-black uppercase text-terre">{locale === "fr" ? "Paiement protégé" : "Protected checkout"}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal">{locale === "fr" ? "Connectez-vous avant de finaliser" : "Sign in before checkout"}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Votre panier reste intact. La connexion associe l'adresse, le paiement et le suivi de livraison au bon compte." : "Your basket remains intact. Signing in links the address, payment and delivery tracking to the correct account."}</p>
          <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate("account", { returnView: "checkout" })} className="flex-1 bg-terre text-white hover:bg-terre-dark"><LogIn className="mr-2 h-4 w-4" />{t.nav.login}</Button>
            <Button variant="outline" onClick={() => navigate("cart")} className="flex-1">{locale === "fr" ? "Revoir le panier" : "Review basket"}</Button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [t.checkout.delivery, t.checkout.payment, t.checkout.review];
  const review = (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        <p className="font-semibold text-charcoal">{form.firstName} {form.lastName}</p>
        <p className="text-muted-foreground">{form.street}, {form.postalCode} {form.city}, {form.country}</p>
        <p className="text-muted-foreground">{form.email}{form.phone ? ` · ${form.phone}` : ""}</p>
      </div>
      <div className="space-y-1.5">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <ProductImage src={item.imageUrl} alt={item.name} emoji={item.imageEmoji} color={item.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" />
            <span className="min-w-0 flex-1 truncate pr-2 text-charcoal">{item.name} × {item.qty}</span>
            <span className="font-medium">{formatPrice(item.unitPrice * item.qty, locale)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-border pt-2 text-sm">
        <PriceLine label={t.cart.subtotal} value={intent ? formatPrice(intent.pricing.subtotal, locale) : formatPrice(subtotal, locale)} />
        {(intent?.pricing.promoDiscount ?? promoDiscount) > 0 ? <PriceLine label={t.cart.promo} value={`-${formatPrice(intent?.pricing.promoDiscount ?? promoDiscount, locale)}`} accent /> : null}
        <PriceLine label={t.cart.shipping} value={(intent?.pricing.shipping ?? shipFee) === 0 ? (locale === "fr" ? "Offerte" : "Free") : formatPrice(intent?.pricing.shipping ?? shipFee, locale)} />
        <PriceLine label={locale === "fr" ? "Transporteur estimé" : "Estimated carrier"} value={intent?.pricing.carrier || shipQuote?.carrier || "-"} muted />
        <PriceLine label={t.cart.totalWeight} value={formatWeight(weight, locale)} />
        <PriceLine label={t.cart.packages} value={`${intent?.pricing.packages || shipQuote?.packages || thermal.length || 1} · ${thermal.map((item) => thermalLabel(item, locale)).join(", ")}`} />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3"><span className="font-bold text-charcoal">{t.cart.total}</span><span className="text-xl font-extrabold text-terre">{formatPrice(displayTotal, locale)}</span></div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-forest/5 p-2 text-xs text-forest"><ShieldCheck className="h-4 w-4 shrink-0" />{t.checkout.securePayment}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="cart" className="mb-4" />
      <h1 className="jma-section-title mb-5">{t.checkout.title}</h1>
      <div className="mb-6 flex items-center gap-1.5" aria-label={locale === "fr" ? "Progression du paiement" : "Checkout progress"}>
        {steps.map((label, index) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index <= step ? "bg-terre text-cream" : "bg-muted text-muted-foreground"}`} aria-current={index === step ? "step" : undefined}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</div>
            <span className={`hidden truncate text-xs font-medium min-[390px]:block ${index <= step ? "text-charcoal" : "text-muted-foreground"}`}>{label}</span>
            {index < steps.length - 1 ? <div className={`h-0.5 min-w-2 flex-1 rounded ${index < step ? "bg-terre" : "bg-border"}`} /> : null}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-charcoal/10 bg-white p-4 sm:p-6">
        {step === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.checkout.firstName} value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} autoComplete="given-name" />
              <Field label={t.checkout.lastName} value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} autoComplete="family-name" />
            </div>
            <Field label={t.checkout.email} type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} autoComplete="email" />
            <Field label={t.checkout.phone} type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} autoComplete="tel" />
            <Field label={t.checkout.street} value={form.street} onChange={(value) => setForm({ ...form, street: value })} autoComplete="street-address" />
            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
              <Field label={t.checkout.postalCode} value={form.postalCode} onChange={(value) => setForm({ ...form, postalCode: value })} autoComplete="postal-code" />
              <Field label={t.checkout.city} value={form.city} onChange={(value) => setForm({ ...form, city: value })} autoComplete="address-level2" />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold text-charcoal">{t.checkout.deliverySlot}</Label>
              <RadioGroup value={slot} onValueChange={setSlot} className="space-y-2">
                {[["standard", t.checkout.standard], ["express", t.checkout.express], ["relay", t.checkout.relay]].map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-terre has-[:checked]:bg-terre/5"><RadioGroupItem value={value} /><Truck className="h-4 w-4 text-terre" />{label}</label>
                ))}
              </RadioGroup>
            </div>
            {paymentError ? <ErrorMessage>{paymentError}</ErrorMessage> : null}
            <Button onClick={preparePayment} disabled={!canContinue || preparingPayment || shipLoading || promotionLoading || !stripePromise} className="w-full bg-terre text-cream hover:bg-terre-dark">
              {preparingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.loading}</> : t.next}
            </Button>
            {!stripePromise ? <ErrorMessage>{locale === "fr" ? "Le paiement sécurisé doit être configuré avant l'ouverture des commandes." : "Secure payment must be configured before orders can open."}</ErrorMessage> : null}
          </motion.div>
        ) : intent && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret, locale, appearance: { theme: "stripe", variables: { colorPrimary: "#B74325", colorText: "#181A18", borderRadius: "8px", fontFamily: "Manrope, sans-serif" } } }}>
            <SecurePaymentStages step={step} setStep={setStep} clientSecret={intent.clientSecret} processing={processing} paymentError={paymentError} setPaymentError={setPaymentError} amount={displayTotal} locale={locale} review={review} onConfirm={finalizeOrder} />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}

function SecurePaymentStages({ step, setStep, clientSecret, processing, paymentError, setPaymentError, amount, locale, review, onConfirm }: {
  step: number;
  setStep: (step: number) => void;
  clientSecret: string;
  processing: boolean;
  paymentError: string;
  setPaymentError: (message: string) => void;
  amount: number;
  locale: "fr" | "en";
  review: ReactNode;
  onConfirm: (paymentIntentId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const t = dict[locale];
  const [confirming, setConfirming] = useState(false);
  const [confirmedPaymentIntentId, setConfirmedPaymentIntentId] = useState<string | null>(null);

  const reviewPayment = async () => {
    if (!elements) return;
    setPaymentError("");
    const result = await elements.submit();
    if (result.error) {
      setPaymentError(result.error.message || (locale === "fr" ? "Vérifiez les informations de paiement." : "Check your payment details."));
      return;
    }
    setStep(2);
  };

  const confirm = async () => {
    if (!stripe || !elements || confirming) return;
    setPaymentError("");
    setConfirming(true);
    try {
      if (confirmedPaymentIntentId) {
        await onConfirm(confirmedPaymentIntentId);
        return;
      }
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url: `${window.location.origin}/?view=orders` },
      });
      if (result.error) {
        setPaymentError(result.error.message || (locale === "fr" ? "Le paiement a été refusé." : "Payment was declined."));
        return;
      }
      if (!result.paymentIntent || result.paymentIntent.status !== "succeeded") {
        setPaymentError(locale === "fr" ? "Le paiement demande une validation supplémentaire." : "Payment requires additional validation.");
        return;
      }
      setConfirmedPaymentIntentId(result.paymentIntent.id);
      await onConfirm(result.paymentIntent.id);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className={step === 1 ? "space-y-4" : "hidden"} aria-hidden={step !== 1}>
        <div>
          <p className="mb-3 text-xs font-semibold text-charcoal">{t.checkout.paymentMethod}</p>
          <PaymentElement options={{ layout: "accordion", business: { name: "Je mange Africain" } }} />
        </div>
        <p className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground"><Lock className="mt-0.5 h-3 w-3 shrink-0" />{locale === "fr" ? "Les données bancaires sont chiffrées et traitées directement par Stripe." : "Bank details are encrypted and processed directly by Stripe."}</p>
      </div>
      {step === 2 ? review : null}
      {paymentError ? <ErrorMessage>{paymentError}</ErrorMessage> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(step === 1 ? 0 : 1)} disabled={processing} className="flex-1">{t.previous}</Button>
        {step === 1 ? (
          <Button onClick={reviewPayment} disabled={!stripe || !elements} className="flex-1 bg-terre text-cream hover:bg-terre-dark">{t.next}</Button>
        ) : (
          <Button onClick={confirm} disabled={processing || confirming || !stripe || !elements} className="flex-1 bg-terre text-cream hover:bg-terre-dark">
            {processing || confirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.checkout.processing}</> : <><CreditCard className="mr-2 h-4 w-4" />{t.checkout.placeOrder.replace("{amount}", amount.toFixed(2))}</>}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  const id = useId();
  return <div className="min-w-0"><Label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-charcoal">{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="h-11 min-w-0 border-charcoal/12 bg-white" /></div>;
}

function PriceLine({ label, value, accent = false, muted = false }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return <div className={`flex items-start justify-between gap-3 ${accent ? "text-forest" : muted ? "text-muted-foreground" : ""}`}><span>{label}</span><span className="max-w-[55%] text-right">{value}</span></div>;
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">{children}</p>;
}
