"use client";

import { useEffect, useState } from "react";
import { Heart, Plus, Minus, Truck, ShieldCheck, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatUnitPrice, thermalColor, thermalLabel } from "@/lib/format";
import { getDiscountPercent, getProductCommercialLine, getProductGallery } from "@/lib/market-media";

export function ProductDetailView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const addToCart = useStore((s) => s.addToCart);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const pushRecentlyViewed = useStore((s) => s.pushRecentlyViewed);
  const t = dict[locale];

  const productId = params.productId;
  const { data: product, loading } = useFetch(productId ? `/api/products/${productId}?locale=${locale}` : null, [productId, locale]);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Initialize default variant + track recently viewed when product loads.
  useEffect(() => {
    if (product) {
      setVariantId(product.variants?.find((v: any) => v.isDefault)?.id || product.variants?.[0]?.id || null);
      setSelectedPhoto(null);
      pushRecentlyViewed(product.id);
    }
  }, [product?.id, pushRecentlyViewed]);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96 rounded-lg" /></div>;
  if (!product) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Produit introuvable.</div>;

  const variant = product.variants?.find((v: any) => v.id === variantId) || product.variants?.[0];
  const price = product.promoPrice ?? product.price;
  const isFav = favorites.includes(product.id);
  const outOfStock = product.stockQty <= 0;
  const lowStock = product.stockQty > 0 && product.stockQty <= (product.alertThreshold || 5);
  const discountPercent = getDiscountPercent(product.price, product.promoPrice);
  const saving = product.promoPrice ? product.price - product.promoPrice : 0;
  const gallery = getProductGallery(product);
  const heroPhoto = selectedPhoto || gallery[0];
  const commercialLine = getProductCommercialLine(product, locale);

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      nameFr: product.nameFr || product.name,
      nameEn: product.nameEn || product.name,
      unitPrice: price,
      unitLabel: variant?.label || product.packaging,
      packWeightGrams: variant?.weightGrams || product.netWeightGrams || 0,
      thermalClass: product.thermalClass,
      imageColor: product.imageColor,
      imageEmoji: product.imageEmoji,
      imageUrl: heroPhoto,
      qty,
      maxStock: product.stockQty,
    });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-4 py-7 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="catalog" className="mb-4" />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* visual */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="relative -mx-4 flex aspect-[4/3] items-center justify-center overflow-hidden border-y border-border bg-card sm:mx-0 sm:aspect-square sm:rounded-lg sm:border">
            <ProductImage
              src={heroPhoto}
              alt={product.name}
              emoji={product.imageEmoji}
              color={product.imageColor}
              size="xl"
              priority
              className="h-full w-full"
              rounded="rounded-none"
            />
            {discountPercent > 0 && (
              <span className="absolute left-4 top-4 rounded-md bg-destructive px-3 py-2 text-sm font-extrabold text-white shadow-lg">
                -{discountPercent}%
              </span>
            )}
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2">
            {gallery.map((photo, index) => (
              <button
                key={photo}
                onClick={() => setSelectedPhoto(photo)}
                className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition ${
                  heroPhoto === photo ? "border-terre shadow-sm" : "border-border hover:border-terre/50"
                }`}
                aria-label={`${locale === "fr" ? "Voir la photo" : "View photo"} ${index + 1}`}
              >
                <ProductImage src={photo} alt="" emoji={product.imageEmoji} color={product.imageColor} size="md" className="h-full w-full" rounded="rounded-none" />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {product.variants?.map((v: any) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVariantId(v.id)}
                aria-pressed={variantId === v.id}
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
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${thermalColor(product.thermalClass)}`}>
              <Snowflake className="mr-1 h-3 w-3" /> {thermalLabel(product.thermalClass, locale)}
            </span>
            {discountPercent > 0 && <Badge className="bg-destructive text-white border-0">-{discountPercent}%</Badge>}
            {product.isBestseller && <Badge className="bg-forest text-cream border-0">{t.bestseller}</Badge>}
            {product.isNew && <Badge className="bg-gold text-charcoal border-0">{t.new}</Badge>}
            {product.isOnSale && discountPercent === 0 && <Badge className="bg-destructive text-white border-0">{t.promo}</Badge>}
          </div>
          <div>
            <h1 className="break-words font-display text-3xl font-semibold leading-tight text-charcoal md:text-4xl">{product.name}</h1>
            <p className="break-words text-sm text-muted-foreground">{product.traditionalName} · {product.country}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-terre">{commercialLine}</p>
          </div>

          {/* price */}
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
            {product.promoPrice && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price, locale)}</span>}
            <span className="whitespace-nowrap text-3xl font-extrabold text-terre">{formatPrice(price, locale)}</span>
            {product.pricePerKg && <span className="min-w-0 break-words pb-1 text-xs text-muted-foreground">≈ {formatUnitPrice(Number(product.pricePerKg), locale)}{t.perKg}</span>}
          </div>
          {saving > 0 && (
            <p className="w-fit rounded-md bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
              {locale === "fr" ? "Économie immédiate" : "Instant saving"} : {formatPrice(saving, locale)}
            </p>
          )}

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
                <span key={a} className="max-w-full break-words rounded-md bg-muted px-2 py-0.5 text-[11px] text-charcoal">{a}</span>
              ))}
            </div>
          )}

          {/* qty + add */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="inline-flex shrink-0 items-center rounded-lg border border-border">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted" aria-label={locale === "fr" ? `Diminuer la quantité de ${product.name}` : `Decrease ${product.name} quantity`}><Minus className="h-4 w-4" /></button>
              <span className="min-w-10 text-center font-semibold tabular-nums">{qty}</span>
              <button type="button" onClick={() => setQty(Math.min(product.stockQty || 99, qty + 1))} className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted" aria-label={locale === "fr" ? `Augmenter la quantité de ${product.name}` : `Increase ${product.name} quantity`}><Plus className="h-4 w-4" /></button>
            </div>
            <Button onClick={handleAdd} disabled={outOfStock} size="lg" className="order-last w-full whitespace-normal bg-terre text-center leading-tight text-cream shadow-md hover:bg-terre-dark sm:order-none sm:min-w-0 sm:flex-1">
              <Plus className="mr-1 h-4 w-4" /> {t.product.addToCart}
            </Button>
            <Button variant="outline" size="icon" onClick={() => toggleFavorite(product.id)} aria-pressed={isFav} aria-label={isFav ? (locale === "fr" ? `Retirer ${product.name} des favoris` : `Remove ${product.name} from favourites`) : (locale === "fr" ? `Ajouter ${product.name} aux favoris` : `Add ${product.name} to favourites`)} className="ml-auto h-11 w-11 shrink-0 sm:ml-0">
              <Heart className={`h-5 w-5 ${isFav ? "fill-terre text-terre" : "text-charcoal"}`} />
            </Button>
          </div>

          {/* trust badges */}
          <div className="grid min-w-0 grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <Truck className="h-4 w-4 text-terre" /> {locale === "fr" ? "Livraison 48h" : "48h delivery"}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <Snowflake className="h-4 w-4 text-forest" /> {locale === "fr" ? "Chaîne du froid" : "Cold chain"}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-gold" /> {locale === "fr" ? "Authentique" : "Authentic"}
            </div>
          </div>

          <section className="border-y border-border py-4" aria-labelledby="product-facts-title">
            <h2 id="product-facts-title" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {locale === "fr" ? "Repères produit" : "Product details"}
            </h2>
            <dl className="mt-3 grid min-w-0 grid-cols-3 divide-x divide-border text-xs">
              <ProductFact label={locale === "fr" ? "Origine" : "Origin"} value={product.country || "—"} />
              <ProductFact label={locale === "fr" ? "Format" : "Pack"} value={variant?.label || product.packaging || "—"} />
              <ProductFact label={locale === "fr" ? "Conservation" : "Storage"} value={thermalLabel(product.thermalClass, locale)} />
            </dl>
          </section>

          {/* tabs */}
          <Tabs defaultValue="desc" className="mt-2 min-w-0">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="desc" className="shrink-0">{t.product.description}</TabsTrigger>
              <TabsTrigger value="nutri" className="shrink-0">{t.product.nutrition}</TabsTrigger>
              <TabsTrigger value="prep" className="shrink-0">{t.product.preparation}</TabsTrigger>
              <TabsTrigger value="store" className="shrink-0">{t.product.storage}</TabsTrigger>
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
          <h2 className="jma-section-title mb-4">{t.product.alternatives}</h2>
          <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 [&>*]:min-w-0">
            {product.related.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} compact />)}
          </div>
        </section>
      )}
      {product.relatedRecipes?.length > 0 && (
        <section className="mt-8">
          <h2 className="jma-section-title mb-4">{t.product.relatedRecipes}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.relatedRecipes.map((r: any, i: number) => (
              <RecipeCard key={r.id} recipe={r} index={i} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 first:pl-0 last:pr-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold leading-snug text-charcoal">{value}</dd>
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
