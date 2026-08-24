"use client";

import { FormEvent, type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { BookOpen, ChefHat, LoaderCircle, PackagePlus, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";

type ProductDraft = {
  name: string;
  traditionalName: string;
  sku: string;
  categoryId: string;
  country: string;
  packaging: string;
  description: string;
  price: string;
  promoPrice: string;
  stockQty: string;
  netWeightGrams: string;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  storageType: "SEC" | "FRAIS" | "REFRIGERE" | "SURGELE" | "FUME" | "SECHE" | "CONSERVE";
  aliases: string;
};

const initialDraft: ProductDraft = {
  name: "",
  traditionalName: "",
  sku: "",
  categoryId: "",
  country: "Côte d'Ivoire",
  packaging: "",
  description: "",
  price: "",
  promoPrice: "",
  stockQty: "0",
  netWeightGrams: "0",
  thermalClass: "AMBIANT",
  storageType: "SEC",
  aliases: "",
};

export function ProductCreateDialog({ locale, onCreated }: { locale: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { data: categoriesData } = useFetch(`/api/categories?locale=${locale}`, [locale]);
  const productSignal = useDeferredValue(`${draft.name} ${draft.traditionalName} ${draft.description} ${draft.country}`.trim());
  const recommendationsUrl = productSignal.length >= 3
    ? `/api/dishes?locale=${locale}&product=${encodeURIComponent(productSignal)}&limit=6`
    : null;
  const { data: recommendationData, loading: recommendationsLoading } = useFetch(recommendationsUrl, [productSignal, locale]);
  const recommendations = recommendationData?.dishes || [];
  const hasRequiredFields = useMemo(
    () => Boolean(draft.name.trim() && draft.traditionalName.trim() && draft.sku.trim() && draft.categoryId && draft.packaging.trim() && draft.description.trim() && Number(draft.price) > 0),
    [draft]
  );

  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasRequiredFields) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          aliases: draft.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Enregistrement impossible.");
      setDraft(initialDraft);
      setOpen(false);
      onCreated();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-terre text-cream hover:bg-terre-dark"><PackagePlus className="mr-1.5 h-4 w-4" /> {locale === "fr" ? "Nouveau produit" : "New product"}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto p-0">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-7">
            <DialogTitle className="flex items-center gap-2 text-xl text-charcoal"><PackagePlus className="h-5 w-5 text-terre" /> {locale === "fr" ? "Enregistrer un produit" : "Register a product"}</DialogTitle>
            <DialogDescription>{locale === "fr" ? "La bibliothèque culinaire analyse la fiche et propose immédiatement les plats dans lesquels ce produit peut être valorisé." : "The culinary library analyses the record and instantly suggests dishes where this product can be featured."}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-7 px-5 py-6 sm:px-7 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={locale === "fr" ? "Nom commercial" : "Product name"} required><Input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Attiéké frais premium" /></Field>
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

              <Field label={locale === "fr" ? "Description client" : "Customer description"} required>
                <Textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} placeholder={locale === "fr" ? "Origine, goût, texture, usage et conservation..." : "Origin, flavour, texture, use and storage..."} />
              </Field>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label={locale === "fr" ? "Prix (€)" : "Price (€)"} required><Input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => update("price", event.target.value)} /></Field>
                <Field label={locale === "fr" ? "Promo (€)" : "Promo (€)"}><Input type="number" min="0.01" step="0.01" value={draft.promoPrice} onChange={(event) => update("promoPrice", event.target.value)} /></Field>
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
              <Field label={locale === "fr" ? "Alias de recherche" : "Search aliases"}><Input value={draft.aliases} onChange={(event) => update("aliases", event.target.value)} placeholder="atchéké, couscous de manioc" /><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Séparez les variantes par une virgule." : "Separate variants with commas."}</p></Field>
            </div>

            <aside className="h-fit rounded-lg border border-forest/20 bg-forest/[0.04] p-4 lg:sticky lg:top-4">
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
            </aside>
          </div>

          <DialogFooter className="border-t border-border px-5 py-4 sm:px-7">
            {submitError ? <p role="alert" className="mr-auto self-center text-xs text-destructive">{submitError}</p> : null}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={!hasRequiredFields || submitting} className="bg-terre text-white hover:bg-terre-dark">{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}{submitting ? (locale === "fr" ? "Publication..." : "Publishing...") : (locale === "fr" ? "Publier le produit" : "Publish product")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}{required ? <span className="ml-1 text-terre">*</span> : null}</Label>{children}</div>;
}
