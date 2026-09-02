"use client";

import { FormEvent, useDeferredValue, useState } from "react";
import { Boxes, Check, ChevronRight, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MarketChannelSwitch } from "@/components/storefront/MarketChannelSwitch";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { ProductImage } from "@/components/shared/ProductImage";
import { useStore } from "@/lib/store";
import { formatPrice, formatUnitPrice } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import { getProductPhoto } from "@/lib/market-media";
import { wholesaleDiscountPercent, wholesalePriceForQuantity, type WholesaleTier } from "@/lib/wholesale";

type WholesaleProduct = {
  id: string;
  name: string;
  nameFr?: string;
  nameEn?: string;
  traditionalName: string;
  description: string;
  country: string;
  price: number;
  packaging: string;
  netWeightGrams: number;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  imageUrl?: string | null;
  imageColor: string;
  imageEmoji: string;
  wholesalePackLabel: string;
  wholesaleUnitsPerPack: number;
  wholesaleMinPacks: number;
  wholesaleAvailablePacks: number;
  wholesaleTiers: WholesaleTier[];
  category?: { id: string; name: string } | null;
};

type WholesaleResponse = {
  products: WholesaleProduct[];
  total: number;
  filters: { categories: Array<{ id: string; name: string }> };
};

export function WholesaleView() {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const url = `/api/catalog?channel=wholesale&locale=${locale}&pageSize=48&sort=popular${deferredQuery ? `&q=${encodeURIComponent(deferredQuery)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  const { data, loading, error, refetch } = useFetch<WholesaleResponse>(url, [locale, deferredQuery, category]);
  const isFr = locale === "fr";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="catalog" className="mb-2" />
      <header className="border-b border-charcoal/10 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3 sm:items-end">
          <div className="min-w-0">
            <p className="jma-eyebrow">{isFr ? "Distribution professionnelle" : "Professional distribution"}</p>
            <h1 className="jma-section-title mt-1">{isFr ? "Marché de gros" : "Wholesale market"}</h1>
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-5">{isFr ? "Commandez par carton ou par lot, profitez de prix dégressifs et conservez la traçabilité de la chaîne du froid." : "Order by case or lot, access tiered pricing and preserve cold-chain traceability."}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setQuoteOpen(true)} className="h-10 shrink-0 px-3 sm:px-4" aria-label={isFr ? "Demander un devis" : "Request a quote"}><Boxes className="mr-1.5 h-4 w-4 sm:mr-2" /><span className="sm:hidden">{isFr ? "Devis" : "Quote"}</span><span className="hidden sm:inline">{isFr ? "Demander un devis" : "Request a quote"}</span></Button>
        </div>
        <div className="mt-3 sm:mt-4"><MarketChannelSwitch channel="wholesale" /></div>
      </header>

      <section className="grid grid-cols-3 divide-x divide-charcoal/10 border-b border-charcoal/10" aria-label={isFr ? "Services du marché de gros" : "Wholesale services"}>
        <WholesalePromise icon={PackageCheck} title={isFr ? "Prix par volume" : "Volume pricing"} detail={isFr ? "Le meilleur palier s'applique automatiquement." : "The best tier applies automatically."} />
        <WholesalePromise icon={ShieldCheck} title={isFr ? "Lots traçables" : "Traceable batches"} detail={isFr ? "Réservation FEFO sur le stock réel." : "FEFO reservation against live stock."} />
        <WholesalePromise icon={Truck} title={isFr ? "Livraison Europe" : "European delivery"} detail={isFr ? "Ambiant, frais et surgelé séparés." : "Ambient, chilled and frozen separated."} />
      </section>

      <section className="py-3 sm:py-5" aria-labelledby="wholesale-products-title">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 bg-white pl-9" placeholder={isFr ? "Rechercher un produit de gros" : "Search wholesale products"} aria-label={isFr ? "Rechercher dans le marché de gros" : "Search the wholesale market"} />
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          {data?.filters.categories?.length ? (
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={isFr ? "Filtrer par rayon" : "Filter by category"}>
              <FilterButton active={!category} onClick={() => setCategory("")}>{isFr ? "Tous" : "All"}</FilterButton>
              {data.filters.categories.map((item) => <FilterButton key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</FilterButton>)}
            </div>
          ) : <div className="flex-1" />}
          <p className="shrink-0 text-[10px] font-bold text-muted-foreground"><span className="sm:hidden">{data ? `${data.total} ${isFr ? "offre(s) pro" : "pro offer(s)"}` : ""}</span><span className="hidden sm:inline">{data ? `${data.total} ${isFr ? "offre(s) professionnelle(s)" : "professional offer(s)"}` : ""}</span></p>
        </div>

        <h2 id="wholesale-products-title" className="sr-only">{isFr ? "Produits vendus en gros" : "Wholesale products"}</h2>
        {loading ? <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[3/5] rounded-md" />)}</div> : null}
        {!loading && error ? <div className="mt-5 border-y border-destructive/20 py-10 text-center"><p className="text-sm font-bold text-destructive">{error}</p><Button type="button" variant="outline" onClick={refetch} className="mt-3">{isFr ? "Réessayer" : "Try again"}</Button></div> : null}
        {!loading && !error && data?.products.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-5 md:grid-cols-3 md:gap-3 lg:grid-cols-4" data-testid="wholesale-product-grid">
            {data.products.map((product, index) => <WholesaleProductCard key={product.id} product={product} index={index} />)}
          </div>
        ) : null}
        {!loading && !error && data && !data.products.length ? (
          <div className="mt-5 border-y border-charcoal/10 py-12 text-center"><Boxes className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 text-base font-black text-charcoal">{isFr ? "Aucune offre dans cette sélection" : "No offer in this selection"}</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{isFr ? "Modifiez votre recherche ou consultez le marché au détail pendant la préparation des prochains lots." : "Change your search or browse retail while the next batches are being prepared."}</p><Button type="button" variant="outline" onClick={() => navigate("catalog")} className="mt-4">{isFr ? "Voir le marché au détail" : "Browse retail"}<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        ) : null}
      </section>
      <WholesaleQuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
}

function WholesaleProductCard({ product, index }: { product: WholesaleProduct; index: number }) {
  const locale = useStore((state) => state.locale);
  const addToCart = useStore((state) => state.addToCart);
  const [quantity, setQuantity] = useState(Math.max(1, product.wholesaleMinPacks));
  const [added, setAdded] = useState(false);
  const tiers = product.wholesaleTiers || [];
  const maxPacks = Math.min(99, product.wholesaleAvailablePacks);
  const unitPrice = wholesalePriceForQuantity(tiers, quantity);
  const retailPackPrice = product.price * product.wholesaleUnitsPerPack;
  const discount = wholesaleDiscountPercent(product.price, product.wholesaleUnitsPerPack, unitPrice);
  const outOfStock = maxPacks < product.wholesaleMinPacks || !unitPrice;
  const photo = product.imageUrl || getProductPhoto(product);
  const isFr = locale === "fr";

  const changeQuantity = (next: number) => setQuantity(Math.max(product.wholesaleMinPacks, Math.min(maxPacks || product.wholesaleMinPacks, next)));
  const add = () => {
    if (outOfStock) return;
    addToCart({
      productId: product.id,
      variantId: "wholesale",
      name: product.name,
      nameFr: product.nameFr || product.name,
      nameEn: product.nameEn || product.name,
      unitPrice,
      unitLabel: product.wholesalePackLabel,
      packWeightGrams: product.netWeightGrams * product.wholesaleUnitsPerPack,
      thermalClass: product.thermalClass,
      imageColor: product.imageColor,
      imageEmoji: product.imageEmoji,
      imageUrl: photo,
      qty: quantity,
      maxStock: maxPacks,
      salesChannel: "wholesale",
      minimumQty: product.wholesaleMinPacks,
      unitsPerPack: product.wholesaleUnitsPerPack,
      wholesaleTiers: tiers,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-md border border-charcoal/10 bg-white [contain-intrinsic-size:480px] [content-visibility:auto]" data-testid="wholesale-product-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
        <ProductImage src={photo} fallbackSrc={getProductPhoto({ ...product, imageUrl: null })} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="lg" priority={index < 2} className="h-full w-full" rounded="rounded-none" />
        {discount > 0 ? <span className="absolute left-2 top-2 rounded-md bg-destructive px-2 py-1 text-[10px] font-extrabold leading-none text-white">-{discount}%</span> : null}
        <span className="absolute bottom-2 left-2 rounded-md bg-charcoal/90 px-2 py-1 text-[9px] font-bold text-white">{product.country}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div><h3 className="line-clamp-2 min-h-7 break-words text-xs font-extrabold leading-tight text-charcoal">{product.name}</h3><p className="mt-0.5 line-clamp-2 min-h-8 text-[10px] leading-4 text-muted-foreground">{product.description}</p></div>
        <p className="line-clamp-1 text-[10px] font-bold text-forest">{product.wholesalePackLabel} · {product.wholesaleUnitsPerPack} {isFr ? "unités" : "units"}</p>
        <div className="mt-1">
          <div className="flex flex-wrap items-center gap-1"><span className="text-[10px] text-muted-foreground line-through">{formatPrice(retailPackPrice, locale)}</span>{discount > 0 ? <span className="text-[9px] font-bold text-destructive">-{discount}%</span> : null}</div>
          <p className="text-[15px] font-black text-terre">{formatPrice(unitPrice, locale)} <span className="text-[9px] font-semibold text-muted-foreground">/ {isFr ? "colis" : "case"}</span></p>
          <p className="text-[10px] text-muted-foreground">{formatUnitPrice(unitPrice / product.wholesaleUnitsPerPack, locale)} / {isFr ? "unité" : "unit"}</p>
        </div>
        {tiers.length > 1 ? (
          <label className="mt-1 block"><span className="sr-only">{isFr ? `Choisir un palier pour ${product.name}` : `Choose a tier for ${product.name}`}</span><select value={tiers.reduce((selected, tier) => quantity >= tier.minPacks ? tier.minPacks : selected, tiers[0].minPacks)} onChange={(event) => changeQuantity(Number(event.target.value))} className="h-8 w-full rounded-md border border-border bg-white px-2 text-[9px] font-bold text-charcoal">{tiers.map((tier) => <option key={tier.minPacks} value={tier.minPacks}>{tier.minPacks}+ {isFr ? "colis" : "cases"} · {formatPrice(tier.price, locale)}</option>)}</select></label>
        ) : <p className="mt-1 text-[9px] font-semibold text-muted-foreground">{isFr ? "Minimum" : "Minimum"} · {product.wholesaleMinPacks} {isFr ? "colis" : "case(s)"}</p>}
        <div className="mt-auto grid grid-cols-[2rem_minmax(0,1fr)_2rem] overflow-hidden rounded-md border border-border">
          <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= product.wholesaleMinPacks || outOfStock} className="grid h-8 place-items-center disabled:opacity-35" aria-label={isFr ? `Diminuer les colis de ${product.name}` : `Decrease cases of ${product.name}`}><Minus className="h-3.5 w-3.5" /></button>
          <span className="grid h-8 place-items-center border-x border-border text-[11px] font-black tabular-nums">{quantity}</span>
          <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= maxPacks || outOfStock} className="grid h-8 place-items-center disabled:opacity-35" aria-label={isFr ? `Augmenter les colis de ${product.name}` : `Increase cases of ${product.name}`}><Plus className="h-3.5 w-3.5" /></button>
        </div>
        <Button type="button" size="sm" onClick={add} disabled={outOfStock} className={`h-9 w-full text-[10px] ${added ? "bg-forest text-white hover:bg-forest" : "bg-terre text-white hover:bg-terre-dark"}`}>{added ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />}{outOfStock ? (isFr ? "Indisponible" : "Unavailable") : added ? (isFr ? "Ajouté" : "Added") : (isFr ? "Ajouter" : "Add")}</Button>
      </div>
    </article>
  );
}

function WholesalePromise({ icon: Icon, title, detail }: { icon: typeof PackageCheck; title: string; detail: string }) {
  return <div className="flex min-w-0 flex-col items-center px-1.5 py-2 text-center sm:flex-row sm:items-start sm:gap-3 sm:px-5 sm:py-4 sm:text-left"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-forest/10 text-forest sm:h-9 sm:w-9"><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span><div className="min-w-0"><h2 className="mt-1 break-words text-[9px] font-extrabold leading-3 text-charcoal sm:mt-0 sm:text-xs sm:leading-normal">{title}</h2><p className="mt-0.5 hidden text-[10px] leading-4 text-muted-foreground sm:block">{detail}</p></div></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-bold ${active ? "border-charcoal bg-charcoal text-white" : "border-border bg-white text-charcoal"}`}>{children}</button>;
}

function WholesaleQuoteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const locale = useStore((state) => state.locale);
  const customer = useStore((state) => state.customer);
  const [form, setForm] = useState({ company: "", name: customer ? `${customer.firstName} ${customer.lastName}` : "", email: customer?.email || "", phone: customer?.phone || "", volume: "", message: "" });
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [reference, setReference] = useState("");
  const isFr = locale === "fr";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("busy");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${form.name} · ${form.company}`, email: form.email, subject: isFr ? "Demande de devis marché de gros" : "Wholesale quote request", message: `${isFr ? "Téléphone" : "Phone"}: ${form.phone}\n${isFr ? "Volume souhaité" : "Requested volume"}: ${form.volume}\n\n${form.message}` }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Request failed");
      setReference(payload.reference || "JMA");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return <Dialog open={open} onOpenChange={(next) => status !== "busy" && onOpenChange(next)}><DialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto p-5 sm:max-w-lg sm:p-6"><DialogHeader><span className="grid h-11 w-11 place-items-center rounded-md bg-terre/10 text-terre"><Boxes className="h-5 w-5" /></span><DialogTitle>{isFr ? "Demande de devis professionnel" : "Professional quote request"}</DialogTitle><DialogDescription>{isFr ? "Décrivez votre besoin. L'équipe commerciale vous répondra avec les volumes, la logistique et les conditions applicables." : "Describe your needs. The sales team will respond with volumes, logistics and applicable terms."}</DialogDescription></DialogHeader>{status === "success" ? <div className="border-y border-forest/20 py-7 text-center"><Check className="mx-auto h-7 w-7 text-forest" /><p className="mt-3 text-sm font-black text-charcoal">{isFr ? "Demande enregistrée" : "Request recorded"}</p><p className="mt-1 text-xs text-muted-foreground">{isFr ? "Référence" : "Reference"} · {reference}</p><Button type="button" onClick={() => onOpenChange(false)} className="mt-5 bg-forest text-white hover:bg-forest/90">{isFr ? "Fermer" : "Close"}</Button></div> : <form onSubmit={submit} className="mt-2 grid gap-3 sm:grid-cols-2"><QuoteField id="quote-company" label={isFr ? "Entreprise" : "Company"} value={form.company} onChange={(company) => setForm({ ...form, company })} required /><QuoteField id="quote-name" label={isFr ? "Contact" : "Contact"} value={form.name} onChange={(name) => setForm({ ...form, name })} required /><QuoteField id="quote-email" label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required /><QuoteField id="quote-phone" label={isFr ? "Téléphone" : "Phone"} type="tel" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required /><div className="sm:col-span-2"><QuoteField id="quote-volume" label={isFr ? "Produits et volumes souhaités" : "Requested products and volumes"} value={form.volume} onChange={(volume) => setForm({ ...form, volume })} required /></div><div className="sm:col-span-2"><Label htmlFor="quote-message" className="mb-1.5 block text-xs font-bold">{isFr ? "Contraintes de livraison" : "Delivery requirements"}</Label><Textarea id="quote-message" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={4} minLength={10} required /></div>{status === "error" ? <p role="alert" className="text-xs font-semibold text-destructive sm:col-span-2">{isFr ? "La demande n'a pas pu être envoyée. Vérifiez les champs puis réessayez." : "The request could not be sent. Check the fields and try again."}</p> : null}<DialogFooter className="mt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={status === "busy"}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={status === "busy"} className="bg-terre text-white hover:bg-terre-dark">{status === "busy" ? (isFr ? "Envoi..." : "Sending...") : (isFr ? "Envoyer la demande" : "Send request")}</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function QuoteField({ id, label, value, onChange, type = "text", required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div><Label htmlFor={id} className="mb-1.5 block text-xs font-bold">{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>;
}
