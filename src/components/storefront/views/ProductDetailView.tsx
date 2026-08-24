"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Minus, ChevronLeft, Star, Truck, ShieldCheck, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatWeight, thermalColor, thermalLabel } from "@/lib/format";
import { toast } from "sonner";

export function ProductDetailView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const addToCart = useStore((s) => s.addToCart);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const pushRecentlyViewed = useStore((s) => s.pushRecentlyViewed);
  const t = dict[locale];

  const { data: product, loading } = useFetch(`/api/products/${params.productId}?locale=${locale}`, [params.productId, locale]);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Initialize default variant + track recently viewed when product loads.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (product) {
      setVariantId(product.variants?.find((v: any) => v.isDefault)?.id || product.variants?.[0]?.id || null);
      pushRecentlyViewed(product.id);
    }
  }, [product?.id, pushRecentlyViewed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!product) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Produit introuvable.</div>;

  const variant = product.variants?.find((v: any) => v.id === variantId) || product.variants?.[0];
  const price = product.promoPrice ?? product.price;
  const isFav = favorites.includes(product.id);
  const outOfStock = product.stockQty <= 0;
  const lowStock = product.stockQty > 0 && product.stockQty <= (product.alertThreshold || 5);

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      nameFr: product.name,
      nameEn: product.name,
      unitPrice: price,
      unitLabel: variant?.label || product.packaging,
      packWeightGrams: variant?.weightGrams || product.netWeightGrams || 0,
      thermalClass: product.thermalClass,
      maxStock: product.stockQty,
    });
    toast.success(t.product.addedToCart);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
      <button onClick={() => navigate("catalog")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-terre">
        <ChevronLeft className="h-4 w-4" /> {t.back}
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* visual */}
        <div className="space-y-3">
          <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-card p-8">
            <ProductImage emoji={product.imageEmoji} color={product.imageColor} size="xl" className="w-full h-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {product.variants?.map((v: any) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  variantId === v.id ? "border-terre bg-terre/5 text-terre" : "border-border text-charcoal hover:bg-muted"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${thermalColor(product.thermalClass)}`}>
              <Snowflake className="mr-1 h-3 w-3" /> {thermalLabel(product.thermalClass, locale)}
            </span>
            {product.isBestseller && <Badge className="bg-forest text-cream border-0">{t.bestseller}</Badge>}
            {product.isNew && <Badge className="bg-gold text-charcoal border-0">{t.new}</Badge>}
            {product.isOnSale && <Badge className="bg-destructive text-white border-0">{t.promo}</Badge>}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal md:text-3xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.traditionalName} · {product.country}</p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {[1,2,3,4,5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-gold text-gold" />)}
              <span className="ml-1 text-muted-foreground">(4.8 · 124 {locale === "fr" ? "avis" : "reviews"})</span>
            </div>
          </div>

          {/* price */}
          <div className="flex items-end gap-3">
            {product.promoPrice && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price, locale)}</span>}
            <span className="text-3xl font-extrabold text-terre">{formatPrice(price, locale)}</span>
            {product.pricePerKg && <span className="pb-1 text-xs text-muted-foreground">≈ {formatPrice(Number(product.pricePerKg), locale)}{t.perKg}</span>}
          </div>

          {/* stock */}
          <div className="flex items-center gap-2 text-sm">
            {outOfStock ? <span className="font-medium text-destructive">{t.outOfStock}</span>
              : lowStock ? <span className="font-medium text-gold">{t.lowStock} · {product.stockQty} {locale === "fr" ? "en stock" : "in stock"}</span>
              : <span className="font-medium text-forest">{t.inStock}</span>}
          </div>

          {/* aliases */}
          {product.aliases?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t.product.synonyms} :</span>
              {product.aliases.slice(0, 6).map((a: string) => (
                <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-charcoal">{a}</span>
              ))}
            </div>
          )}

          {/* qty + add */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted" aria-label="Diminuer"><Minus className="h-4 w-4" /></button>
              <span className="min-w-10 text-center font-semibold tabular-nums">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stockQty || 99, qty + 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted" aria-label="Augmenter"><Plus className="h-4 w-4" /></button>
            </div>
            <Button onClick={handleAdd} disabled={outOfStock} size="lg" className="flex-1 bg-terre text-cream hover:bg-terre-dark shadow-md">
              <Plus className="mr-1 h-4 w-4" /> {t.product.addToCart}
            </Button>
            <Button variant="outline" size="icon" onClick={() => toggleFavorite(product.id)} aria-label="Favori" className="h-11 w-11">
              <Heart className={`h-5 w-5 ${isFav ? "fill-terre text-terre" : "text-charcoal"}`} />
            </Button>
          </div>

          {/* trust badges */}
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <Truck className="h-4 w-4 text-terre" /> {locale === "fr" ? "Livraison 48h" : "48h delivery"}
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <Snowflake className="h-4 w-4 text-forest" /> {locale === "fr" ? "Chaîne du froid" : "Cold chain"}
            </div>
            <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-gold" /> {locale === "fr" ? "Authentique" : "Authentic"}
            </div>
          </div>

          {/* tabs */}
          <Tabs defaultValue="desc" className="mt-2">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="desc">{t.product.description}</TabsTrigger>
              <TabsTrigger value="nutri">{t.product.nutrition}</TabsTrigger>
              <TabsTrigger value="prep">{t.product.preparation}</TabsTrigger>
              <TabsTrigger value="store">{t.product.storage}</TabsTrigger>
            </TabsList>
            <TabsContent value="desc" className="text-sm leading-relaxed text-charcoal">
              <p>{product.description}</p>
              {product.ingredients && <p className="mt-3"><span className="font-semibold">{t.product.ingredients} :</span> {product.ingredients}</p>}
              {product.allergens && <p className="mt-1"><span className="font-semibold">{t.product.allergens} :</span> {product.allergens}</p>}
            </TabsContent>
            <TabsContent value="nutri">
              {product.nutrition ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border bg-muted"><td className="px-3 py-2 font-semibold" colSpan={2}>{t.product.nutritionFacts}</td></tr>
                      {Object.entries(product.nutrition).map(([k, v]: [string, any]) => (
                        <tr key={k} className="border-b border-border last:border-0">
                          <td className="px-3 py-1.5 capitalize text-muted-foreground">{nutriLabel(k, locale)}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </TabsContent>
            <TabsContent value="prep" className="text-sm text-charcoal">{product.preparation || "—"}</TabsContent>
            <TabsContent value="store" className="text-sm text-charcoal">{product.storage || "—"} {product.storageTempC && `· ${product.storageTempC}`}</TabsContent>
          </Tabs>
        </div>
      </div>

      {/* related */}
      {product.related?.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-charcoal">{t.product.alternatives}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {product.related.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
      {product.relatedRecipes?.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-charcoal">{t.product.relatedRecipes}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.relatedRecipes.map((r: any, i: number) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function nutriLabel(k: string, locale: Locale) {
  const map: Record<string, [string, string]> = {
    energy: ["Énergie", "Energy"], fat: ["Matières grasses", "Fat"], saturated: ["dont saturées", "of which saturates"],
    carbs: ["Glucides", "Carbohydrates"], sugars: ["dont sucres", "of which sugars"], protein: ["Protéines", "Protein"], salt: ["Sel", "Salt"],
  };
  return (map[k] || [k, k])[locale === "en" ? 1 : 0];
}

import type { Locale } from "@/lib/i18n";
