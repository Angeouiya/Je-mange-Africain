"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, MapPinCheck, MapPinned, Snowflake, Truck, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEstimatedArrival } from "@/lib/delivery-experience";
import { EUROPEAN_COUNTRIES, europeanCountryLabel, europeanCountryOptions, europeanCountryValue } from "@/lib/european-countries";
import { formatPrice } from "@/lib/format";
import { type ThermalClass, useStore } from "@/lib/store";
import { postJSON } from "@/lib/use-fetch";

type DeliveryService = "standard" | "express" | "relay";

type DeliveryOption = {
  service: DeliveryService;
  fee: number;
  carrier: string;
  packages: number;
  minDelayHours: number;
  maxDelayHours: number;
  available: boolean;
  unavailableReason: "cold_chain" | null;
};

type ShippingQuoteResponse = DeliveryOption & { options: DeliveryOption[] };

export function DeliveryDestinationDialog({ children, weightGrams, thermalClasses }: { children: ReactNode; weightGrams: number; thermalClasses: ThermalClass[] }) {
  const locale = useStore((state) => state.locale);
  const country = useStore((state) => state.country);
  const postalCode = useStore((state) => state.postalCode);
  const setDeliveryContext = useStore((state) => state.setDeliveryContext);
  const [open, setOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftPostalCode, setDraftPostalCode] = useState(postalCode);
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const thermalKey = thermalClasses.join("|");
  const normalizedPostalCode = draftPostalCode.trim().toUpperCase().replace(/\s+/g, " ");
  const isFr = locale === "fr";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftCountry(europeanCountryValue(country) || "France");
      setDraftPostalCode(postalCode);
    }
  };

  useEffect(() => {
    if (!open || normalizedPostalCode.length < 2) {
      setOptions([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      postJSON<ShippingQuoteResponse>("/api/shipping/quote", {
        country: draftCountry,
        postalCode: normalizedPostalCode,
        weightGrams,
        thermalClasses: thermalKey ? thermalKey.split("|") : [],
      }).then((quote) => {
        if (cancelled) return;
        setOptions(quote.options || [quote]);
        setStatus("ready");
      }).catch(() => {
        if (cancelled) return;
        setOptions([]);
        setStatus("error");
      });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draftCountry, normalizedPostalCode, open, thermalKey, weightGrams]);

  const applyDestination = (event: FormEvent) => {
    event.preventDefault();
    if (status !== "ready" || normalizedPostalCode.length < 2) return;
    setDeliveryContext(europeanCountryValue(draftCountry) || draftCountry, normalizedPostalCode);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent closeLabel={isFr ? "Fermer" : "Close"} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl" data-testid="delivery-destination-dialog">
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <DialogHeader className="shrink-0 border-b border-charcoal/8 px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[linear-gradient(145deg,rgba(185,71,43,0.13),rgba(242,169,0,0.08))] text-terre"><MapPinned className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Livraison européenne" : "European delivery"}</p>
              <DialogTitle className="mt-1">{isFr ? "Où livrer votre panier ?" : "Where should we deliver?"}</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">{isFr ? "Comparez les services réellement disponibles pour votre destination." : "Compare the services actually available for your destination."}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={applyDestination} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]" aria-labelledby="delivery-destination-fields">
              <h2 id="delivery-destination-fields" className="sr-only">{isFr ? "Destination" : "Destination"}</h2>
              <div>
                <Label htmlFor="delivery-destination-country" className="mb-1.5 block text-xs font-bold text-charcoal">{isFr ? "Pays de livraison" : "Delivery country"}</Label>
                <select id="delivery-destination-country" value={draftCountry} onChange={(event) => setDraftCountry(event.target.value)} autoComplete="country-name" className="h-11 w-full rounded-md border border-charcoal/12 bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">
                  {europeanCountryOptions(locale).map((option) => <option key={option.code} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="delivery-destination-postal" className="mb-1.5 block text-xs font-bold text-charcoal">{isFr ? "Code postal" : "Postcode"}</Label>
                <Input id="delivery-destination-postal" value={draftPostalCode} onChange={(event) => setDraftPostalCode(event.target.value)} minLength={2} maxLength={20} autoComplete="postal-code" inputMode="text" className="h-11 border-charcoal/12 bg-white uppercase focus:border-terre" required />
              </div>
            </section>

            <div className="mt-4 flex items-center justify-between gap-3 border-y border-charcoal/8 bg-[#F8F7F4] px-3 py-2.5 text-[10px]">
              <span className="flex min-w-0 items-center gap-2 font-bold text-charcoal"><MapPinCheck className="h-3.5 w-3.5 shrink-0 text-terre" />{europeanCountryLabel(draftCountry, locale)} · {normalizedPostalCode || "—"}</span>
              <span className="shrink-0 font-black text-burgundy">{EUROPEAN_COUNTRIES.length} {isFr ? "pays" : "countries"}</span>
            </div>

            <section className="mt-5" aria-labelledby="delivery-services-preview" aria-live="polite">
              <div className="flex items-end justify-between gap-3">
                <div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Options calculées" : "Calculated options"}</p><h2 id="delivery-services-preview" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Choisissez en connaissance de cause" : "Choose with confidence"}</h2></div>
                {status === "loading" ? <span role="status" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />{isFr ? "Calcul" : "Calculating"}</span> : null}
              </div>

              {status === "loading" || status === "idle" ? <div className="mt-3 grid gap-2 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[7.5rem] animate-pulse rounded-lg bg-muted" />)}</div> : null}
              {status === "error" ? <div className="mt-3 flex items-start gap-3 border-y border-destructive/20 bg-destructive/[0.035] px-3 py-4 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>{isFr ? "Les options ne peuvent pas être calculées pour le moment. Vérifiez la destination puis réessayez." : "Options cannot be calculated right now. Check the destination and try again."}</p></div> : null}
              {status === "ready" ? <div className="mt-3 grid gap-2 sm:grid-cols-3">{options.map((option) => <DeliveryServicePreview key={option.service} option={option} locale={locale} hasColdChain={thermalClasses.some((thermal) => thermal !== "AMBIANT")} />)}</div> : null}
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-charcoal/8 bg-white px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{isFr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={status !== "ready" || normalizedPostalCode.length < 2} className="bg-terre text-white hover:bg-terre-dark"><CheckCircle2 className="mr-1.5 h-4 w-4" />{isFr ? "Utiliser cette destination" : "Use this destination"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryServicePreview({ option, locale, hasColdChain }: { option: DeliveryOption; locale: "fr" | "en"; hasColdChain: boolean }) {
  const isFr = locale === "fr";
  const presentation: Record<DeliveryService, { icon: LucideIcon; label: string }> = {
    standard: { icon: Truck, label: isFr ? "Standard" : "Standard" },
    express: { icon: Zap, label: isFr ? "Express" : "Express" },
    relay: { icon: MapPinCheck, label: isFr ? "Point relais" : "Collection point" },
  };
  const { icon: Icon, label } = presentation[option.service];
  const unavailable = !option.available;

  return (
    <article className={`min-w-0 rounded-lg border p-3 ${unavailable ? "border-charcoal/8 bg-muted/35" : "border-terre/12 bg-white"}`}>
      <div className="flex items-start justify-between gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${unavailable ? "bg-charcoal/5 text-muted-foreground" : "bg-terre/[0.08] text-terre"}`}><Icon className="h-3.5 w-3.5" /></span><strong className={`text-xs tabular-nums ${unavailable ? "text-muted-foreground" : "text-terre"}`}>{unavailable ? "—" : formatPrice(option.fee, locale)}</strong></div>
      <h3 className="mt-2 text-xs font-black text-charcoal">{label}</h3>
      <p className="mt-0.5 truncate text-[9px] font-bold text-muted-foreground">{option.carrier}</p>
      <p className={`mt-2 min-h-8 text-[9px] leading-4 ${unavailable ? "text-destructive" : "text-muted-foreground"}`}>{unavailable ? (isFr ? "Indisponible avec la chaîne du froid" : "Unavailable for cold-chain items") : formatEstimatedArrival(option, locale)}</p>
      {hasColdChain && option.available ? <p className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase text-burgundy"><Snowflake className="h-3 w-3" />{isFr ? "Froid suivi" : "Cold chain"}</p> : null}
    </article>
  );
}
