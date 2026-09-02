"use client";

import { FormEvent, type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { BookOpen, Boxes, Calculator, ChefHat, LoaderCircle, PackagePlus, PencilLine, Sparkles } from "lucide-react";
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { data: categoriesData } = useFetch(`/api/categories?locale=${locale}`, [locale]);
  const productSignal = useDeferredValue(`${draft.nameFr} ${draft.nameEn} ${draft.traditionalName} ${draft.descriptionFr} ${draft.descriptionEn} ${draft.country}`.trim());
  const recommendationsUrl = productSignal.length >= 3
    ? `/api/dishes?locale=${locale}&product=${encodeURIComponent(productSignal)}&limit=6`
    : null;
  const { data: recommendationData, loading: recommendationsLoading } = useFetch(recommendationsUrl, [productSignal, locale]);
  const recommendations = recommendationData?.dishes || [];
  const salePrice = Math.round((Number(draft.costPrice || 0) + Number(draft.profitMargin || 0) + Number.EPSILON) * 100) / 100;
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

  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const handleOpen = (nextOpen: boolean) => {
    if (submitting) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(draftFor(product));
      setSubmitError("");
    }
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
      if (!response.ok) throw new Error(payload.error || "Enregistrement impossible.");
      setDraft(draftFor());
      setOpen(false);
      onCreated();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {editing ? <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white" aria-label={locale === "fr" ? `Modifier la fiche ${product!.nameFr}` : `Edit ${product!.nameEn}`} title={locale === "fr" ? "Modifier la fiche complète" : "Edit full record"}><PencilLine className="h-4 w-4" /></Button> : <Button size="sm" className="bg-terre text-cream hover:bg-terre-dark"><PackagePlus className="mr-1.5 h-4 w-4" /> {locale === "fr" ? "Nouveau produit" : "New product"}</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-7">
            <DialogTitle className="flex items-center gap-2 text-xl text-charcoal">{editing ? <PencilLine className="h-5 w-5 text-terre" /> : <PackagePlus className="h-5 w-5 text-terre" />} {editing ? (locale === "fr" ? "Modifier la fiche produit" : "Edit product record") : (locale === "fr" ? "Enregistrer un produit" : "Register a product")}</DialogTitle>
            <DialogDescription>{editing ? (locale === "fr" ? "Mettez à jour les deux langues, le prix interne, le stock et la publication depuis une seule fiche contrôlée." : "Update both languages, internal pricing, stock and publishing from one controlled record.") : (locale === "fr" ? "La bibliothèque culinaire analyse la fiche et propose immédiatement les plats dans lesquels ce produit peut être valorisé." : "The culinary library analyses the record and instantly suggests dishes where this product can be featured.")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-7 px-5 py-6 sm:px-7 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom commercial français" required><Input value={draft.nameFr} onChange={(event) => update("nameFr", event.target.value)} placeholder="Attiéké frais premium" /></Field>
                <Field label="English product name" required><Input value={draft.nameEn} onChange={(event) => update("nameEn", event.target.value)} placeholder="Premium fresh attieke" /></Field>
                <Field label={locale === "fr" ? "Nom traditionnel" : "Traditional name"} required><Input value={draft.traditionalName} onChange={(event) => update("traditionalName", event.target.value)} placeholder="Attiéké" /></Field>
                <Field label="SKU" required><Input value={draft.sku} onChange={(event) => update("sku", event.target.value.toUpperCase())} placeholder="JMA-ATT-001" /></Field>
                <Field label={locale === "fr" ? "Catégorie" : "Category"} required>
                  <select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                    <option value="">{locale === "fr" ? "Sélectionner" : "Select"}</option>
                    {categoriesData?.categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </Field>
                <Field label={locale === "fr" ? "Pays d'origine" : "Country of origin"} required><Input value={draft.country} onChange={(event) => update("country", event.target.value)} /></Field>
                <Field label={locale === "fr" ? "Conditionnement" : "Packaging"} required><Input value={draft.packaging} onChange={(event) => update("packaging", event.target.value)} placeholder="Sachet 500 g" /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Description française" required><Textarea value={draft.descriptionFr} onChange={(event) => update("descriptionFr", event.target.value)} rows={5} placeholder="Origine, goût, texture, usage et conservation..." /></Field>
                <Field label="English description" required><Textarea value={draft.descriptionEn} onChange={(event) => update("descriptionEn", event.target.value)} rows={5} placeholder="Origin, flavour, texture, use and storage..." /></Field>
              </div>

              <section className="overflow-hidden rounded-lg border border-terre/20 bg-terre/[0.035]">
                <div className="flex items-start gap-3 border-b border-terre/15 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre text-white"><Calculator className="h-4 w-4" /></span>
                  <div><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Construction du prix" : "Price composition"}</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Ces données restent internes. Le client voit uniquement le prix de vente calculé." : "These values remain internal. Customers only see the calculated selling price."}</p></div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1.05fr]">
                  <Field label={locale === "fr" ? "Coût brut d'achat (€)" : "Gross purchase cost (€)"} required><Input type="number" inputMode="decimal" min="0.01" max="10000" step="0.01" value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} placeholder="1,80" /></Field>
                  <Field label={locale === "fr" ? "Marge bénéficiaire (€)" : "Profit margin (€)"} required><Input type="number" inputMode="decimal" min="0" max="10000" step="0.01" value={draft.profitMargin} onChange={(event) => update("profitMargin", event.target.value)} placeholder="1,20" /></Field>
                  <div className="rounded-md bg-charcoal px-4 py-3 text-white" aria-live="polite">
                    <p className="text-[10px] font-bold uppercase text-white/60">{locale === "fr" ? "Prix affiché au client" : "Customer price"}</p>
                    <p className="mt-1 text-2xl font-black text-gold">{salePrice.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p>
                    <p className="mt-1 text-[10px] text-white/60">{locale === "fr" ? "Coût + marge" : "Cost + margin"} · {marginRate.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })}% {locale === "fr" ? "de marge" : "margin"}</p>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-lg border border-forest/20 bg-forest/[0.035]">
                <div className="flex items-center gap-3 border-b border-forest/15 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-forest text-white"><Boxes className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Marché de gros" : "Wholesale market"}</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Publiez un conditionnement professionnel et des prix dégressifs protégés au paiement." : "Publish professional packaging and tiered prices protected at checkout."}</p></div>
                  <Switch
                    checked={draft.isWholesale}
                    onCheckedChange={(checked) => setDraft((current) => ({
                      ...current,
                      isWholesale: checked,
                      wholesalePrice: checked && !current.wholesalePrice
                        ? String(Math.round(salePrice * Number(current.wholesaleUnitsPerPack || 6) * 0.9 * 100) / 100)
                        : current.wholesalePrice,
                    }))}
                    aria-label={locale === "fr" ? "Activer la vente en gros" : "Enable wholesale sales"}
                  />
                </div>
                {draft.isWholesale ? (
                  <div className="space-y-4 p-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label={locale === "fr" ? "Conditionnement de gros" : "Wholesale packaging"} required><Input value={draft.wholesalePackLabel} onChange={(event) => update("wholesalePackLabel", event.target.value)} placeholder={locale === "fr" ? "Carton de 6 sachets" : "Case of 6 packs"} /></Field>
                      <Field label={locale === "fr" ? "Unités par colis" : "Units per case"} required><Input type="number" min="1" max="10000" value={draft.wholesaleUnitsPerPack} onChange={(event) => update("wholesaleUnitsPerPack", event.target.value)} /></Field>
                      <Field label={locale === "fr" ? "Minimum de colis" : "Minimum cases"} required><Input type="number" min="1" max="99" value={draft.wholesaleMinPacks} onChange={(event) => update("wholesaleMinPacks", event.target.value)} /></Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.05fr]">
                      <Field label={locale === "fr" ? "Prix par colis (€)" : "Price per case (€)"} required><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesalePrice} onChange={(event) => update("wholesalePrice", event.target.value)} /></Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={locale === "fr" ? "Palier 2" : "Tier 2"}><Input type="number" min="2" placeholder={locale === "fr" ? "Colis" : "Cases"} value={draft.wholesaleTier2MinPacks} onChange={(event) => update("wholesaleTier2MinPacks", event.target.value)} /></Field>
                        <Field label={locale === "fr" ? "Prix (€)" : "Price (€)"}><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesaleTier2Price} onChange={(event) => update("wholesaleTier2Price", event.target.value)} /></Field>
                      </div>
                      <div className="rounded-md bg-charcoal px-4 py-3 text-white" aria-live="polite">
                        <p className="text-[10px] font-bold uppercase text-white/60">{locale === "fr" ? "Marge par colis" : "Margin per case"}</p>
                        <p className={`mt-1 text-xl font-black ${wholesaleMargin >= 0 ? "text-gold" : "text-red-300"}`}>{wholesaleMargin.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p>
                        <p className="mt-1 text-[10px] text-white/60">{locale === "fr" ? "Coût brut du colis" : "Gross case cost"} · {wholesalePackCost.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" })}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                      <Field label={locale === "fr" ? "Palier 3 (colis)" : "Tier 3 (cases)"}><Input type="number" min="3" value={draft.wholesaleTier3MinPacks} onChange={(event) => update("wholesaleTier3MinPacks", event.target.value)} /></Field>
                      <Field label={locale === "fr" ? "Prix palier 3 (€)" : "Tier 3 price (€)"}><Input type="number" inputMode="decimal" min={wholesalePackCost || 0.01} step="0.01" value={draft.wholesaleTier3Price} onChange={(event) => update("wholesaleTier3Price", event.target.value)} /></Field>
                    </div>
                    {!wholesaleValid ? <p role="alert" className="text-[11px] font-semibold leading-5 text-destructive">{locale === "fr" ? "Le prix doit couvrir le coût brut, rester inférieur au détail équivalent et diminuer à chaque palier complet." : "Prices must cover gross cost, stay below equivalent retail and decrease at every complete tier."}</p> : null}
                  </div>
                ) : null}
              </section>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label={locale === "fr" ? "Prix promotionnel (€)" : "Promotional price (€)"}><Input type="number" inputMode="decimal" min="0.01" max={salePrice || undefined} step="0.01" value={draft.promoPrice} onChange={(event) => update("promoPrice", event.target.value)} /><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Doit rester inférieur au prix client." : "Must remain below the customer price."}</p></Field>
                <Field label={locale === "fr" ? "Stock" : "Stock"}><Input type="number" min="0" value={draft.stockQty} onChange={(event) => update("stockQty", event.target.value)} /></Field>
                <Field label={locale === "fr" ? "Poids (g)" : "Weight (g)"}><Input type="number" min="0" value={draft.netWeightGrams} onChange={(event) => update("netWeightGrams", event.target.value)} /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={locale === "fr" ? "Chaîne thermique" : "Thermal class"}>
                  <select value={draft.thermalClass} onChange={(event) => update("thermalClass", event.target.value as ProductDraft["thermalClass"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                    <option value="AMBIANT">Ambiant</option><option value="REFRIGERATED">Réfrigéré</option><option value="FROZEN">Surgelé</option>
                  </select>
                </Field>
                <Field label={locale === "fr" ? "Conservation" : "Storage"}>
                  <select value={draft.storageType} onChange={(event) => update("storageType", event.target.value as ProductDraft["storageType"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                    <option value="SEC">Sec</option><option value="FRAIS">Frais</option><option value="REFRIGERE">Réfrigéré</option><option value="SURGELE">Surgelé</option><option value="FUME">Fumé</option><option value="SECHE">Séché</option><option value="CONSERVE">Conserve</option>
                  </select>
                </Field>
              </div>
              <Field label={locale === "fr" ? "État de publication" : "Publishing status"}>
                <select value={draft.status} onChange={(event) => update("status", event.target.value as ProductDraft["status"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                  <option value="published">{locale === "fr" ? "Publié dans la boutique" : "Published in store"}</option><option value="draft">{locale === "fr" ? "Brouillon interne" : "Internal draft"}</option><option value="archived">{locale === "fr" ? "Désactivé" : "Disabled"}</option>
                </select>
              </Field>
              <Field label={locale === "fr" ? "Alias de recherche" : "Search aliases"}><Input value={draft.aliases} onChange={(event) => update("aliases", event.target.value)} placeholder="atchéké, couscous de manioc" /><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Séparez les variantes par une virgule." : "Separate variants with commas."}</p></Field>
            </div>

            <aside className="h-fit space-y-5 lg:sticky lg:top-4">
              <section className="border-y border-terre/20 bg-white px-4 py-4">
                <MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => update("imageUrl", imageUrl)} kind="product" locale={locale} label={locale === "fr" ? "Photo principale du produit" : "Main product photo"} required />
                <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <EditorialFlag checked={draft.isNew} onChange={(isNew) => update("isNew", isNew)} label={locale === "fr" ? "Nouveauté" : "New"} />
                  <EditorialFlag checked={draft.isRecommended} onChange={(isRecommended) => update("isRecommended", isRecommended)} label={locale === "fr" ? "Recommandé" : "Recommended"} />
                  <EditorialFlag checked={draft.isBestseller} onChange={(isBestseller) => update("isBestseller", isBestseller)} label={locale === "fr" ? "Populaire" : "Popular"} />
                </div>
              </section>
              <section className="rounded-lg border border-forest/20 bg-forest/[0.04] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest text-white"><Sparkles className="h-4 w-4" /></span>
                <div><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Plats proposés" : "Suggested dishes"}</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Les correspondances évoluent à mesure que la fiche est renseignée." : "Matches update as the product record is completed."}</p></div>
              </div>

              <div className="mt-4 space-y-2">
                {recommendationsLoading ? <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> {locale === "fr" ? "Analyse culinaire..." : "Analysing..."}</div> : null}
                {!recommendationsLoading && recommendations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-white/70 p-5 text-center"><ChefHat className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">{locale === "fr" ? "Saisissez le nom et la description pour obtenir des associations." : "Enter a name and description to get matches."}</p></div>
                ) : null}
                {recommendations.map((dish: any) => (
                  <div key={dish.slug} className="rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{dish.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{dish.country} · {dish.categoryLabel} · {dish.timeMinutes} min</p></div>{dish.recommendationScore > 8 ? <Badge className="border-0 bg-forest/10 text-[9px] text-forest">{locale === "fr" ? "Fort" : "Strong"}</Badge> : null}</div>
                  </div>
                ))}
              </div>
              </section>
            </aside>
          </div>

          <DialogFooter className="border-t border-border px-5 py-4 sm:px-7">
            {submitError ? <p role="alert" className="mr-auto self-center text-xs text-destructive">{submitError}</p> : null}
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={!hasRequiredFields || submitting} className="bg-terre text-white hover:bg-terre-dark">{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : editing ? <PencilLine className="mr-2 h-4 w-4" /> : <PackagePlus className="mr-2 h-4 w-4" />}{submitting ? (locale === "fr" ? "Enregistrement..." : "Saving...") : editing ? (locale === "fr" ? "Enregistrer les modifications" : "Save changes") : draft.status === "published" ? (locale === "fr" ? "Publier le produit" : "Publish product") : (locale === "fr" ? "Enregistrer le produit" : "Save product")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
