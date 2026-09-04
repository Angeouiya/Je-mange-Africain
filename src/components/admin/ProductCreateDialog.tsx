"use client";

import { FormEvent, type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Calculator, Check, ChefHat, ImageIcon, LoaderCircle, PackagePlus, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useFetch } from "@/lib/use-fetch";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { ProductCardPreview, type ProductListItem } from "@/components/shared/ProductCard";

type ProductDraft = {
  nameFr: string;
  nameEn: string;
  traditionalName: string;
  sku: string;
  categoryId: string;
  country: string;
  packaging: string;
  descriptionFr: string;
  descriptionEn: string;
  costPrice: string;
  profitMargin: string;
  promoPrice: string;
  isWholesale: boolean;
  wholesalePackLabel: string;
  wholesaleUnitsPerPack: string;
  wholesaleMinPacks: string;
  wholesalePrice: string;
  wholesaleTier2MinPacks: string;
  wholesaleTier2Price: string;
  wholesaleTier3MinPacks: string;
  wholesaleTier3Price: string;
  stockQty: string;
  netWeightGrams: string;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  storageType: "SEC" | "FRAIS" | "REFRIGERE" | "SURGELE" | "FUME" | "SECHE" | "CONSERVE";
  aliases: string;
  imageUrl: string;
  status: "draft" | "published" | "archived";
  isNew: boolean;
  isRecommended: boolean;
  isBestseller: boolean;
};

type ProductStudioStep = "identity" | "pricing" | "logistics" | "publishing";

export type EditableProduct = {
  id: string;
  nameFr: string;
  nameEn: string;
  traditionalName: string;
  sku: string;
  categoryId: string;
  country: string;
  packaging: string;
  descriptionFr: string;
  descriptionEn: string;
  costPrice?: number | null;
  profitMargin?: number | null;
  promoPrice?: number | null;
  isWholesale?: boolean;
  wholesalePackLabel?: string | null;
  wholesaleUnitsPerPack?: number;
  wholesaleMinPacks?: number;
  wholesalePrice?: number | null;
  wholesaleTier2MinPacks?: number | null;
  wholesaleTier2Price?: number | null;
  wholesaleTier3MinPacks?: number | null;
  wholesaleTier3Price?: number | null;
  stockQty: number;
  netWeightGrams: number;
  thermalClass: ProductDraft["thermalClass"];
  storageType: ProductDraft["storageType"];
  aliases?: string[];
  imageUrl?: string | null;
  status?: ProductDraft["status"];
  isNew?: boolean;
  isRecommended?: boolean;
  isBestseller?: boolean;
};

const draftFor = (product?: EditableProduct): ProductDraft => ({
  nameFr: product?.nameFr || "",
  nameEn: product?.nameEn || "",
  traditionalName: product?.traditionalName || "",
  sku: product?.sku || "",
  categoryId: product?.categoryId || "",
  country: product?.country || "Côte d'Ivoire",
  packaging: product?.packaging || "",
  descriptionFr: product?.descriptionFr || "",
  descriptionEn: product?.descriptionEn || "",
  costPrice: product?.costPrice === null || product?.costPrice === undefined ? "" : String(product.costPrice),
  profitMargin: product?.profitMargin === null || product?.profitMargin === undefined ? "" : String(product.profitMargin),
  promoPrice: product?.promoPrice === null || product?.promoPrice === undefined ? "" : String(product.promoPrice),
  isWholesale: Boolean(product?.isWholesale),
  wholesalePackLabel: product?.wholesalePackLabel || "",
  wholesaleUnitsPerPack: String(product?.wholesaleUnitsPerPack || 6),
  wholesaleMinPacks: String(product?.wholesaleMinPacks || 1),
  wholesalePrice: product?.wholesalePrice === null || product?.wholesalePrice === undefined ? "" : String(product.wholesalePrice),
  wholesaleTier2MinPacks: product?.wholesaleTier2MinPacks === null || product?.wholesaleTier2MinPacks === undefined ? "" : String(product.wholesaleTier2MinPacks),
  wholesaleTier2Price: product?.wholesaleTier2Price === null || product?.wholesaleTier2Price === undefined ? "" : String(product.wholesaleTier2Price),
  wholesaleTier3MinPacks: product?.wholesaleTier3MinPacks === null || product?.wholesaleTier3MinPacks === undefined ? "" : String(product.wholesaleTier3MinPacks),
  wholesaleTier3Price: product?.wholesaleTier3Price === null || product?.wholesaleTier3Price === undefined ? "" : String(product.wholesaleTier3Price),
  stockQty: String(product?.stockQty ?? 0),
  netWeightGrams: String(product?.netWeightGrams ?? 0),
  thermalClass: product?.thermalClass || "AMBIANT",
  storageType: product?.storageType || "SEC",
  aliases: product?.aliases?.join(", ") || "",
  imageUrl: product?.imageUrl || "",
  status: product?.status || "published",
  isNew: product?.isNew ?? true,
  isRecommended: Boolean(product?.isRecommended),
  isBestseller: Boolean(product?.isBestseller),
});

export function ProductCreateDialog({ locale, onCreated, product }: { locale: "fr" | "en"; onCreated: () => void; product?: EditableProduct }) {
  const editing = Boolean(product);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftFor(product));
  const [activeStep, setActiveStep] = useState<ProductStudioStep>("identity");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [previewLocale, setPreviewLocale] = useState<"fr" | "en">(locale);
  const { data: categoriesData } = useFetch(`/api/categories?locale=${locale}`, [locale]);
  const productSignal = useDeferredValue(`${draft.nameFr} ${draft.nameEn} ${draft.traditionalName} ${draft.descriptionFr} ${draft.descriptionEn} ${draft.country}`.trim());
  const recommendationsUrl = productSignal.length >= 3
    ? `/api/dishes?locale=${locale}&product=${encodeURIComponent(productSignal)}&limit=6`
    : null;
  const { data: recommendationData, loading: recommendationsLoading } = useFetch(recommendationsUrl, [productSignal, locale]);
  const recommendations = recommendationData?.dishes || [];
  const salePrice = Math.round((Number(draft.costPrice || 0) + Number(draft.profitMargin || 0) + Number.EPSILON) * 100) / 100;
  const previewProduct = useMemo<ProductListItem>(() => {
    const category = categoriesData?.categories?.find((entry: { id: string }) => entry.id === draft.categoryId);
    const promoPrice = Number(draft.promoPrice);
    const netWeightGrams = Number(draft.netWeightGrams);
    const name = (previewLocale === "fr" ? draft.nameFr : draft.nameEn).trim()
      || draft.traditionalName.trim()
      || (previewLocale === "fr" ? "Nom du produit" : "Product name");

    return {
      id: "product-studio-preview",
      sku: draft.sku || "JMA-PREVIEW",
      traditionalName: draft.traditionalName || (previewLocale === "fr" ? "Nom traditionnel" : "Traditional name"),
      name,
      nameFr: draft.nameFr || name,
      nameEn: draft.nameEn || name,
      price: salePrice,
      promoPrice: promoPrice > 0 && promoPrice < salePrice ? promoPrice : null,
      pricePerKg: netWeightGrams > 0 ? salePrice / (netWeightGrams / 1000) : null,
      stockQty: Number(draft.stockQty || 0),
      country: draft.country,
      category: category ? { id: category.id, slug: category.slug, name: category.name, color: category.color } : null,
      description: (previewLocale === "fr" ? draft.descriptionFr : draft.descriptionEn).trim()
        || (previewLocale === "fr" ? "La description courte apparaîtra ici." : "The short description will appear here."),
      imageUrl: draft.imageUrl || null,
      imageColor: category?.color || "#C44725",
      imageEmoji: "📦",
      isBestseller: draft.isBestseller,
      isRecommended: draft.isRecommended,
      isNew: draft.isNew,
      isOnSale: promoPrice > 0 && promoPrice < salePrice,
      thermalClass: draft.thermalClass,
      packaging: draft.packaging,
    };
  }, [categoriesData?.categories, draft, previewLocale, salePrice]);
  const marginRate = salePrice > 0 ? (Number(draft.profitMargin || 0) / salePrice) * 100 : 0;
  const wholesalePackCost = Number(draft.costPrice || 0) * Number(draft.wholesaleUnitsPerPack || 1);
  const wholesalePackPrice = Number(draft.wholesalePrice || 0);
  const wholesaleMargin = wholesalePackPrice - wholesalePackCost;
  const wholesaleValid = !draft.isWholesale || Boolean(
    draft.wholesalePackLabel.trim().length >= 2
    && Number(draft.wholesaleUnitsPerPack) >= 1
    && Number(draft.wholesaleMinPacks) >= 1
    && wholesalePackPrice >= wholesalePackCost
    && wholesalePackPrice < salePrice * Number(draft.wholesaleUnitsPerPack)
    && tierIsValid(draft.wholesaleTier2MinPacks, draft.wholesaleTier2Price, draft.wholesaleMinPacks, draft.wholesalePrice, wholesalePackCost)
    && tierIsValid(draft.wholesaleTier3MinPacks, draft.wholesaleTier3Price, draft.wholesaleTier2MinPacks || draft.wholesaleMinPacks, draft.wholesaleTier2Price || draft.wholesalePrice, wholesalePackCost)
  );
  const hasRequiredFields = useMemo(
    () => Boolean(
      draft.nameFr.trim()
      && draft.nameEn.trim()
      && draft.traditionalName.trim()
      && draft.sku.trim()
      && draft.categoryId
      && draft.packaging.trim()
      && draft.descriptionFr.trim().length >= 10
      && draft.descriptionEn.trim().length >= 10
      && draft.imageUrl
      && Number(draft.costPrice) > 0
      && draft.profitMargin !== ""
      && Number(draft.profitMargin) >= 0
      && (!draft.promoPrice || (Number(draft.promoPrice) > 0 && Number(draft.promoPrice) < salePrice))
      && wholesaleValid
    ),
    [draft, salePrice, wholesaleValid]
  );
  const identityComplete = Boolean(draft.nameFr.trim() && draft.nameEn.trim() && draft.traditionalName.trim() && draft.sku.trim() && draft.categoryId && draft.packaging.trim() && draft.descriptionFr.trim().length >= 10 && draft.descriptionEn.trim().length >= 10);
  const pricingComplete = Boolean(Number(draft.costPrice) > 0 && draft.profitMargin !== "" && Number(draft.profitMargin) >= 0 && (!draft.promoPrice || (Number(draft.promoPrice) > 0 && Number(draft.promoPrice) < salePrice)) && wholesaleValid);
  const logisticsComplete = Number(draft.stockQty) >= 0 && Number(draft.netWeightGrams) > 0;
  const publishingComplete = Boolean(draft.imageUrl && draft.status);
  const studioSteps: Array<{ id: ProductStudioStep; icon: typeof PackagePlus; label: string; complete: boolean }> = [
    { id: "identity", icon: PackagePlus, label: locale === "fr" ? "Identité" : "Identity", complete: identityComplete },
    { id: "pricing", icon: Calculator, label: locale === "fr" ? "Prix" : "Pricing", complete: pricingComplete },
    { id: "logistics", icon: Boxes, label: locale === "fr" ? "Logistique" : "Logistics", complete: logisticsComplete },
    { id: "publishing", icon: ImageIcon, label: locale === "fr" ? "Publication" : "Publishing", complete: publishingComplete },
  ];
  const activeStepIndex = studioSteps.findIndex((step) => step.id === activeStep);
  const completedSteps = studioSteps.filter((step) => step.complete).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFor(product));

  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const handleOpen = (nextOpen: boolean) => {
    if (submitting) return;
    if (nextOpen) {
      setDraft(draftFor(product));
      setSubmitError("");
      setActiveStep("identity");
      setPreviewLocale(locale);
      setOpen(true);
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  };

  const discardChanges = () => {
    setDraft(draftFor(product));
    setSubmitError("");
    setDiscardOpen(false);
    setOpen(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasRequiredFields) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(editing ? `/api/admin/products/${product!.id}` : "/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          aliases: draft.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (locale === "fr" ? "Enregistrement impossible." : "Unable to save product."));
      setDraft(draftFor());
      setOpen(false);
      onCreated();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : (locale === "fr" ? "Enregistrement impossible." : "Unable to save product."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          {editing ? <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white" aria-label={locale === "fr" ? `Modifier la fiche ${product!.nameFr}` : `Edit ${product!.nameEn}`} title={locale === "fr" ? "Modifier la fiche complète" : "Edit full record"}><PencilLine className="h-4 w-4" /></Button> : <Button size="sm" className="bg-terre text-cream hover:bg-terre-dark"><PackagePlus className="mr-1.5 h-4 w-4" /> {locale === "fr" ? "Nouveau produit" : "New product"}</Button>}
        </DialogTrigger>
        <DialogContent closeLabel={locale === "fr" ? "Fermer" : "Close"} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-16 text-left sm:px-7 sm:pr-16">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre text-white">{editing ? <PencilLine className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}</span>
                <div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{locale === "fr" ? "Studio catalogue" : "Catalogue studio"}</p><DialogTitle className="mt-0.5 text-xl text-charcoal">{editing ? (locale === "fr" ? "Modifier la fiche produit" : "Edit product record") : (locale === "fr" ? "Enregistrer un produit" : "Register a product")}</DialogTitle><DialogDescription className="mt-1 text-xs leading-5">{editing ? (locale === "fr" ? "Mettez à jour les langues, les prix, le stock et la diffusion." : "Update languages, pricing, stock and publishing.") : (locale === "fr" ? "Créez une fiche bilingue, rentable et prête pour la boutique." : "Build a bilingual, profitable record ready for the storefront.")}</DialogDescription></div>
              </div>
            </DialogHeader>

            <nav className="shrink-0 border-b border-border bg-[#FFFCFA] px-3 py-2 sm:px-6" role="tablist" aria-label={locale === "fr" ? "Étapes de la fiche produit" : "Product record steps"} data-testid="product-studio-steps">
              <div className="grid grid-cols-4 gap-1">
                {studioSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const selected = activeStep === step.id;
                  return <button key={step.id} id={`product-step-${step.id}`} type="button" role="tab" aria-selected={selected} aria-controls={`product-panel-${step.id}`} onClick={() => setActiveStep(step.id)} className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-[8px] font-black leading-3 transition sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-1.5 sm:text-xs ${selected ? "bg-burgundy text-white shadow-sm" : "text-muted-foreground hover:bg-burgundy/[0.045] hover:text-charcoal"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded ${selected ? "bg-white/15" : step.complete ? "bg-burgundy/10 text-burgundy" : "bg-white"}`}>{step.complete && !selected ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}</span><span className="max-w-full text-center sm:truncate">{step.label}</span><span className={`absolute bottom-0.5 h-0.5 rounded-full transition-all ${selected ? "w-5 bg-gold" : "w-0"}`} /><span className="sr-only">{locale === "fr" ? `Étape ${index + 1} sur 4` : `Step ${index + 1} of 4`}</span></button>;
                })}
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-7" data-testid="product-studio-panel">
              {activeStep === "identity" ? (
                <section id="product-panel-identity" role="tabpanel" aria-labelledby="product-step-identity" className="space-y-5">
                  <StudioPanelHeading icon={PackagePlus} eyebrow={locale === "fr" ? "01 · Référentiel" : "01 · Record"} title={locale === "fr" ? "Identité commerciale bilingue" : "Bilingual commercial identity"} description={locale === "fr" ? "Nommez précisément le produit et rendez-le trouvable dans les deux langues." : "Name the product precisely and make it discoverable in both languages."} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={locale === "fr" ? "Nom commercial français" : "French product name"} required><Input value={draft.nameFr} onChange={(event) => update("nameFr", event.target.value)} placeholder="Attiéké frais premium" /></Field>
                    <Field label={locale === "fr" ? "Nom commercial anglais" : "English product name"} required><Input value={draft.nameEn} onChange={(event) => update("nameEn", event.target.value)} placeholder="Premium fresh attieke" /></Field>
                    <Field label={locale === "fr" ? "Nom traditionnel" : "Traditional name"} required><Input value={draft.traditionalName} onChange={(event) => update("traditionalName", event.target.value)} placeholder="Attiéké" /></Field>
                    <Field label="SKU" required><Input value={draft.sku} onChange={(event) => update("sku", event.target.value.toUpperCase())} placeholder="JMA-ATT-001" /></Field>
                    <Field label={locale === "fr" ? "Catégorie" : "Category"} required><select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"><option value="">{locale === "fr" ? "Sélectionner" : "Select"}</option>{categoriesData?.categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                    <Field label={locale === "fr" ? "Pays d'origine" : "Country of origin"} required><Input value={draft.country} onChange={(event) => update("country", event.target.value)} /></Field>
                    <Field label={locale === "fr" ? "Conditionnement" : "Packaging"} required><Input value={draft.packaging} onChange={(event) => update("packaging", event.target.value)} placeholder="Sachet 500 g" /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={locale === "fr" ? "Description française" : "French description"} required><Textarea value={draft.descriptionFr} onChange={(event) => update("descriptionFr", event.target.value)} rows={4} placeholder="Origine, goût, texture, usage et conservation..." /></Field>
                    <Field label={locale === "fr" ? "Description anglaise" : "English description"} required><Textarea value={draft.descriptionEn} onChange={(event) => update("descriptionEn", event.target.value)} rows={4} placeholder="Origin, flavour, texture, use and storage..." /></Field>
                  </div>
                </section>
              ) : null}

              {activeStep === "pricing" ? (
                <section id="product-panel-pricing" role="tabpanel" aria-labelledby="product-step-pricing" className="space-y-5">
                  <StudioPanelHeading icon={Calculator} eyebrow={locale === "fr" ? "02 · Rentabilité" : "02 · Profitability"} title={locale === "fr" ? "Prix, marge et marché de gros" : "Pricing, margin and wholesale"} description={locale === "fr" ? "Le coût et la marge restent internes. Le client voit uniquement le prix calculé." : "Cost and margin remain internal. Customers only see the calculated price."} />
                  <section className="overflow-hidden rounded-lg border border-terre/20 bg-terre/[0.035]">
                    <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1.05fr]">
                      <Field label={locale === "fr" ? "Coût brut d'achat (€)" : "Gross purchase cost (€)"} required><Input type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} placeholder={locale === "fr" ? "1,80" : "1.80"} /></Field>
                      <Field label={locale === "fr" ? "Marge bénéficiaire (€)" : "Profit margin (€)"} required><Input type="number" inputMode="decimal" min="0" max="10000" step="0.01" value={draft.profitMargin} onChange={(event) => update("profitMargin", event.target.value)} placeholder={locale === "fr" ? "1,20" : "1.20"} /></Field>
                      <div className="rounded-md border border-gold/55 bg-[#FFF7DF] px-4 py-3" aria-live="polite"><p className="text-[10px] font-bold uppercase text-burgundy">{locale === "fr" ? "Prix affiché au client" : "Customer price"}</p><p className="mt-1 text-2xl font-black text-terre-dark">{salePrice.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p><p className="mt-1 text-[10px] text-charcoal">{locale === "fr" ? "Coût + marge" : "Cost + margin"} · {marginRate.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })}% {locale === "fr" ? "de marge" : "margin"}</p></div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-lg border border-burgundy/20 bg-burgundy/[0.035]">
                    <div className="flex items-center gap-3 border-b border-burgundy/15 px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy text-white"><Boxes className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Marché de gros" : "Wholesale market"}</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Publiez un conditionnement professionnel et des prix dégressifs protégés." : "Publish professional packaging and protected tiered pricing."}</p></div><Switch checked={draft.isWholesale} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isWholesale: checked, wholesalePrice: checked && !current.wholesalePrice ? String(Math.round(salePrice * Number(current.wholesaleUnitsPerPack || 6) * 0.9 * 100) / 100) : current.wholesalePrice }))} aria-label={locale === "fr" ? "Activer la vente en gros" : "Enable wholesale sales"} /></div>
                    {draft.isWholesale ? <div className="space-y-4 p-4"><div className="grid gap-4 sm:grid-cols-3"><Field label={locale === "fr" ? "Conditionnement de gros" : "Wholesale packaging"} required><Input value={draft.wholesalePackLabel} onChange={(event) => update("wholesalePackLabel", event.target.value)} placeholder={locale === "fr" ? "Carton de 6 sachets" : "Case of 6 packs"} /></Field><Field label={locale === "fr" ? "Unités par colis" : "Units per case"} required><Input type="number" min="1" max="10000" value={draft.wholesaleUnitsPerPack} onChange={(event) => update("wholesaleUnitsPerPack", event.target.value)} /></Field><Field label={locale === "fr" ? "Minimum de colis" : "Minimum cases"} required><Input type="number" min="1" max="99" value={draft.wholesaleMinPacks} onChange={(event) => update("wholesaleMinPacks", event.target.value)} /></Field></div><div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.05fr]"><Field label={locale === "fr" ? "Prix par colis (€)" : "Price per case (€)"} required><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesalePrice} onChange={(event) => update("wholesalePrice", event.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label={locale === "fr" ? "Palier 2" : "Tier 2"}><Input type="number" min="2" placeholder={locale === "fr" ? "Colis" : "Cases"} value={draft.wholesaleTier2MinPacks} onChange={(event) => update("wholesaleTier2MinPacks", event.target.value)} /></Field><Field label={locale === "fr" ? "Prix (€)" : "Price (€)"}><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesaleTier2Price} onChange={(event) => update("wholesaleTier2Price", event.target.value)} /></Field></div><div className="rounded-md border border-burgundy/20 bg-white px-4 py-3" aria-live="polite"><p className="text-[10px] font-bold uppercase text-burgundy">{locale === "fr" ? "Marge par colis" : "Margin per case"}</p><p className={`mt-1 text-xl font-black ${wholesaleMargin >= 0 ? "text-terre-dark" : "text-destructive"}`}>{wholesaleMargin.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Coût brut du colis" : "Gross case cost"} · {wholesalePackCost.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p></div></div><div className="grid grid-cols-2 gap-2 sm:max-w-md"><Field label={locale === "fr" ? "Palier 3 (colis)" : "Tier 3 (cases)"}><Input type="number" min="3" value={draft.wholesaleTier3MinPacks} onChange={(event) => update("wholesaleTier3MinPacks", event.target.value)} /></Field><Field label={locale === "fr" ? "Prix palier 3 (€)" : "Tier 3 price (€)"}><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesaleTier3Price} onChange={(event) => update("wholesaleTier3Price", event.target.value)} /></Field></div>{!wholesaleValid ? <p role="alert" className="text-[11px] font-semibold leading-5 text-destructive">{locale === "fr" ? "Le prix doit couvrir le coût brut, rester inférieur au détail équivalent et diminuer à chaque palier complet." : "Prices must cover gross cost, stay below equivalent retail and decrease at every complete tier."}</p> : null}</div> : null}
                  </section>
                  <div className="max-w-sm"><Field label={locale === "fr" ? "Prix promotionnel (€)" : "Promotional price (€)"}><Input type="number" inputMode="decimal" min="0.01" max={salePrice || undefined} step="0.01" value={draft.promoPrice} onChange={(event) => update("promoPrice", event.target.value)} /><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Doit rester inférieur au prix client." : "Must remain below the customer price."}</p></Field></div>
                </section>
              ) : null}

              {activeStep === "logistics" ? (
                <section id="product-panel-logistics" role="tabpanel" aria-labelledby="product-step-logistics" className="space-y-5">
                  <StudioPanelHeading icon={Boxes} eyebrow={locale === "fr" ? "03 · Exécution" : "03 · Fulfilment"} title={locale === "fr" ? "Stock, poids et conservation" : "Stock, weight and storage"} description={locale === "fr" ? "Définissez les données utilisées pour la disponibilité et l'orchestration de la livraison." : "Set the data used for availability and delivery orchestration."} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={locale === "fr" ? "Stock disponible" : "Available stock"}><Input type="number" min="0" value={draft.stockQty} onChange={(event) => update("stockQty", event.target.value)} /></Field>
                    <Field label={locale === "fr" ? "Poids net (g)" : "Net weight (g)"} required><Input type="number" min="1" value={draft.netWeightGrams} onChange={(event) => update("netWeightGrams", event.target.value)} /></Field>
                    <Field label={locale === "fr" ? "Chaîne thermique" : "Thermal class"}><select aria-label={locale === "fr" ? "Chaîne thermique" : "Thermal class"} value={draft.thermalClass} onChange={(event) => update("thermalClass", event.target.value as ProductDraft["thermalClass"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"><option value="AMBIANT">{locale === "fr" ? "Ambiant" : "Ambient"}</option><option value="REFRIGERATED">{locale === "fr" ? "Réfrigéré" : "Refrigerated"}</option><option value="FROZEN">{locale === "fr" ? "Surgelé" : "Frozen"}</option></select></Field>
                    <Field label={locale === "fr" ? "Conservation" : "Storage"}><select aria-label={locale === "fr" ? "Conservation" : "Storage"} value={draft.storageType} onChange={(event) => update("storageType", event.target.value as ProductDraft["storageType"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"><option value="SEC">{locale === "fr" ? "Sec" : "Dry"}</option><option value="FRAIS">{locale === "fr" ? "Frais" : "Fresh"}</option><option value="REFRIGERE">{locale === "fr" ? "Réfrigéré" : "Refrigerated"}</option><option value="SURGELE">{locale === "fr" ? "Surgelé" : "Frozen"}</option><option value="FUME">{locale === "fr" ? "Fumé" : "Smoked"}</option><option value="SECHE">{locale === "fr" ? "Séché" : "Dried"}</option><option value="CONSERVE">{locale === "fr" ? "Conserve" : "Preserved"}</option></select></Field>
                  </div>
                  <Field label={locale === "fr" ? "Alias de recherche" : "Search aliases"}><Input value={draft.aliases} onChange={(event) => update("aliases", event.target.value)} placeholder={locale === "fr" ? "atchéké, couscous de manioc" : "attieke, cassava couscous"} /><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Séparez les variantes par une virgule." : "Separate variants with commas."}</p></Field>
                  <div className="grid grid-cols-3 divide-x divide-burgundy/10 rounded-lg border border-burgundy/12 bg-[#FFF9F6] py-4"><StudioFact label={locale === "fr" ? "Unités" : "Units"} value={draft.stockQty || "0"} /><StudioFact label={locale === "fr" ? "Poids" : "Weight"} value={`${draft.netWeightGrams || "0"} g`} /><StudioFact label={locale === "fr" ? "Température" : "Temperature"} value={draft.thermalClass === "AMBIANT" ? (locale === "fr" ? "Ambiant" : "Ambient") : draft.thermalClass === "REFRIGERATED" ? (locale === "fr" ? "Réfrigéré" : "Chilled") : (locale === "fr" ? "Surgelé" : "Frozen")} /></div>
                </section>
              ) : null}

              {activeStep === "publishing" ? (
                <section id="product-panel-publishing" role="tabpanel" aria-labelledby="product-step-publishing" className="space-y-5">
                  <StudioPanelHeading icon={ImageIcon} eyebrow={locale === "fr" ? "04 · Mise en vente" : "04 · Go live"} title={locale === "fr" ? "Image, visibilité et associations" : "Media, visibility and pairings"} description={locale === "fr" ? "Contrôlez exactement ce que le client verra et les recettes dans lesquelles le produit sera proposé." : "Control exactly what customers see and the recipes where this product will be suggested."} />
                  <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="border-y border-terre/20 bg-white px-1 py-4 sm:px-4"><MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => update("imageUrl", imageUrl)} kind="product" locale={locale} label={locale === "fr" ? "Photo principale du produit" : "Main product photo"} required /><div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3"><EditorialFlag checked={draft.isNew} onChange={(isNew) => update("isNew", isNew)} label={locale === "fr" ? "Nouveauté" : "New"} /><EditorialFlag checked={draft.isRecommended} onChange={(isRecommended) => update("isRecommended", isRecommended)} label={locale === "fr" ? "Recommandé" : "Recommended"} /><EditorialFlag checked={draft.isBestseller} onChange={(isBestseller) => update("isBestseller", isBestseller)} label={locale === "fr" ? "Populaire" : "Popular"} /></div><div className="mt-4 border-t border-border pt-4"><Field label={locale === "fr" ? "État de publication" : "Publishing status"}><select aria-label={locale === "fr" ? "État de publication" : "Publishing status"} value={draft.status} onChange={(event) => update("status", event.target.value as ProductDraft["status"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"><option value="published">{locale === "fr" ? "Publié dans la boutique" : "Published in store"}</option><option value="draft">{locale === "fr" ? "Brouillon interne" : "Internal draft"}</option><option value="archived">{locale === "fr" ? "Désactivé" : "Disabled"}</option></select></Field></div></section>
                    <div className="space-y-4">
                      <section className="rounded-lg border border-terre/20 bg-[#FFF9F6] p-4" data-testid="product-storefront-preview">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase text-terre">{locale === "fr" ? "Reflet client" : "Customer view"}</p>
                            <h3 className="truncate text-sm font-extrabold text-charcoal">{locale === "fr" ? "Aperçu boutique" : "Storefront preview"}</h3>
                          </div>
                          <div className="flex shrink-0 rounded-md border border-burgundy/15 bg-white p-0.5" role="group" aria-label={locale === "fr" ? "Langue de l'aperçu" : "Preview language"}>
                            {(["fr", "en"] as const).map((language) => <button key={language} type="button" aria-pressed={previewLocale === language} onClick={() => setPreviewLocale(language)} className={`h-7 min-w-9 rounded px-2 text-[10px] font-black uppercase transition ${previewLocale === language ? "bg-burgundy text-white" : "text-muted-foreground hover:text-charcoal"}`}>{language}</button>)}
                          </div>
                        </div>
                        <div className="mx-auto mt-4 w-full max-w-[220px]">
                          <ProductCardPreview product={previewProduct} locale={previewLocale} compact />
                        </div>
                      </section>

                      <section className="rounded-lg border border-burgundy/20 bg-burgundy/[0.04] p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy text-white"><Sparkles className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Plats proposés" : "Suggested dishes"}</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Les correspondances évoluent selon le nom, l'origine et la description." : "Matches update from the name, origin and description."}</p></div></div><div className="mt-4 space-y-2">{recommendationsLoading ? <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> {locale === "fr" ? "Analyse culinaire..." : "Analysing..."}</div> : null}{!recommendationsLoading && recommendations.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-white/70 p-5 text-center"><ChefHat className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">{locale === "fr" ? "Complétez l'identité pour obtenir des associations." : "Complete the identity to get matches."}</p></div> : null}{recommendations.map((dish: any) => <div key={dish.slug} className="rounded-md border border-border bg-white p-3"><div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{dish.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{dish.country} · {dish.categoryLabel} · {dish.timeMinutes} min</p></div>{dish.recommendationScore > 8 ? <Badge className="border-0 bg-burgundy/10 text-[9px] text-burgundy">{locale === "fr" ? "Fort" : "Strong"}</Badge> : null}</div></div>)}</div></section>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            <DialogFooter className="shrink-0 flex-row items-center border-t border-border bg-white px-3 py-3 sm:px-7">
              <div className="mr-auto min-w-0"><p className="text-[9px] font-black uppercase text-burgundy">{locale === "fr" ? `Étape ${activeStepIndex + 1} sur 4` : `Step ${activeStepIndex + 1} of 4`}</p><p className="hidden text-[10px] text-muted-foreground sm:block">{locale === "fr" ? `${completedSteps} section(s) prête(s)` : `${completedSteps} section(s) ready`}</p>{submitError ? <p role="alert" className="mt-1 max-w-sm truncate text-[10px] text-destructive">{submitError}</p> : null}</div>
              <Button type="button" variant="ghost" onClick={() => handleOpen(false)} className="hidden sm:inline-flex">{locale === "fr" ? "Annuler" : "Cancel"}</Button>
              {activeStepIndex > 0 ? <Button type="button" variant="outline" size="icon" onClick={() => setActiveStep(studioSteps[activeStepIndex - 1].id)} aria-label={locale === "fr" ? "Étape précédente" : "Previous step"}><ArrowLeft className="h-4 w-4" /></Button> : null}
              {activeStepIndex < studioSteps.length - 1 ? <Button type="button" onClick={() => setActiveStep(studioSteps[activeStepIndex + 1].id)} className="bg-terre text-white hover:bg-terre-dark">{locale === "fr" ? "Suivant" : "Next"}<ArrowRight className="ml-1.5 h-4 w-4" /></Button> : <Button type="submit" disabled={!hasRequiredFields || submitting} className="bg-terre text-white hover:bg-terre-dark">{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : editing ? <PencilLine className="mr-2 h-4 w-4" /> : <PackagePlus className="mr-2 h-4 w-4" />}{submitting ? (locale === "fr" ? "Enregistrement..." : "Saving...") : editing ? (locale === "fr" ? "Enregistrer" : "Save changes") : draft.status === "published" ? (locale === "fr" ? "Publier" : "Publish") : (locale === "fr" ? "Enregistrer" : "Save")}</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><Trash2 className="h-5 w-5" /></span><AlertDialogTitle>{locale === "fr" ? "Abandonner les modifications ?" : "Discard changes?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? "Les informations saisies dans cette fiche produit seront perdues. Le produit existant ne sera pas modifié." : "Information entered in this product record will be lost. The existing product will not be changed."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Continuer la fiche" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={discardChanges} className="bg-destructive text-white hover:bg-destructive/90">{locale === "fr" ? "Oui, abandonner" : "Yes, discard"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudioPanelHeading({ icon: Icon, eyebrow, title, description }: { icon: typeof PackagePlus; eyebrow: string; title: string; description: string }) {
  return <header className="flex items-start gap-3 border-b border-border pb-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{eyebrow}</p><h2 className="mt-0.5 text-base font-black text-charcoal">{title}</h2><p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">{description}</p></div></header>;
}

function StudioFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3 text-center"><p className="text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-sm font-medium leading-none text-charcoal">{label}{required ? <span className="ml-1 text-terre">*</span> : null}</span>{children}</label>;
}

function EditorialFlag({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[11px] font-bold text-charcoal"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-terre" />{label}</label>;
}

function tierIsValid(quantity: string, price: string, previousQuantity: string, previousPrice: string, packCost: number) {
  if (!quantity && !price) return true;
  return Boolean(quantity && price && Number(quantity) > Number(previousQuantity) && Number(price) < Number(previousPrice) && Number(price) >= packCost);
}
