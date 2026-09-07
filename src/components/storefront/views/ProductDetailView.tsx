"use client";

import { useEffect, useState } from "react";
import type { IconFunction } from "reicon/createIcon";
import { Activity } from "reicon/icons/Activity";
import { Barcode } from "reicon/icons/Barcode";
import { CartAdd } from "reicon/icons/CartAdd";
import { ChefHat } from "reicon/icons/ChefHat";
import { FileText } from "reicon/icons/FileText";
import { Fridge } from "reicon/icons/Fridge";
import { Heart } from "reicon/icons/Heart";
import { Login } from "reicon/icons/Login";
import { Minus } from "reicon/icons/Minus";
import { Plus } from "reicon/icons/Plus";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { Snowflake } from "reicon/icons/Snowflake";
import { Truck } from "reicon/icons/Truck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/shared/ProductImage";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { absoluteUrl, ClientSeo } from "@/components/shared/ClientSeo";
import { MobileActionDock } from "@/components/storefront/MobileActionDock";
import { StorefrontUnavailableState } from "@/components/storefront/StorefrontUnavailableState";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useStore } from "@/lib/store";
import { dict, type Locale } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, formatUnitPrice, thermalColor, thermalLabel } from "@/lib/format";
import { getProductCommercialLine, getProductGallery } from "@/lib/market-media";
import { productEditorialHighlight } from "@/lib/editorial-flags";
import { resolveProductPricing } from "@/lib/product-pricing";
import { STOREFRONT_DETAIL_TTL_MS } from "@/lib/storefront-prefetch";

export function ProductDetailView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const addToCart = useStore((s) => s.addToCart);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const pushRecentlyViewed = useStore((s) => s.pushRecentlyViewed);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];

  const productId = params.productId;
  const { data: product, loading, error, refetch } = useFetch(productId ? `/api/products/${productId}?locale=${locale}` : null, [productId, locale], {}, { cache: true, ttlMs: STOREFRONT_DETAIL_TTL_MS });

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

  if (loading) return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-7 md:py-10 lg:px-8" aria-busy="true" aria-label={locale === "fr" ? "Chargement de la fiche produit" : "Loading product details"}>
      <PageBackButton fallbackView="catalog" className="mb-3 md:mb-4" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="space-y-4 pt-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-4/5" /><Skeleton className="h-5 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-12 w-full" /></div>
      </div>
    </div>
  );
  if (error || !product) return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="catalog" className="mb-3 md:mb-4" />
      <StorefrontUnavailableState surface="product" locale={locale} onRetry={refetch} className="overflow-hidden rounded-lg border" />
    </div>
  );

  const variant = product.variants?.find((v: any) => v.id === variantId) || product.variants?.[0];
  const { listPrice, promotionalRate, price, discountPercent, saving } = resolveProductPricing(product, variant?.price);
  const isFav = favorites.includes(product.id);
  const outOfStock = product.stockQty <= 0;
  const lowStock = product.stockQty > 0 && product.stockQty <= (product.alertThreshold || 5);
  const activePricePerKg = variant?.weightGrams ? price / (Number(variant.weightGrams) / 1000) : product.pricePerKg;
  const gallery = getProductGallery(product);
  const heroPhoto = selectedPhoto || gallery[0];
  const commercialLine = getProductCommercialLine(product, locale);
  const editorialHighlight = productEditorialHighlight(product);
  const editorialLabel = editorialHighlight === "bestseller"
    ? t.bestseller
    : editorialHighlight === "recommended"
      ? (locale === "fr" ? "Recommandé" : "Recommended")
      : editorialHighlight === "new"
        ? t.new
        : "";
  const lineTotal = price * qty;
  const canonicalPath = `/?view=product&productId=${encodeURIComponent(product.id)}`;
  const seoDescription = (product.description || commercialLine).trim();
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(canonicalPath)}#product`,
    name: product.name,
    description: seoDescription,
    image: gallery.map(absoluteUrl),
    sku: product.sku || undefined,
    gtin: product.barcode || undefined,
    brand: { "@type": "Brand", name: product.brand?.name || "Je mange Africain" },
    category: product.category?.name,
    countryOfOrigin: product.country ? { "@type": "Country", name: product.country } : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(canonicalPath),
      priceCurrency: "EUR",
      price: price.toFixed(2),
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Je mange Africain" },
    },
  };
  const productTabs = productTabDescriptors(locale);

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
    <>
      <ClientSeo
        id={`product-${product.id}`}
        title={`${product.name} | Je mange Africain`}
        description={seoDescription}
        canonicalPath={canonicalPath}
        image={heroPhoto}
        structuredData={productStructuredData}
      />
      <div data-testid="product-detail-page" className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-4 pb-28 pt-4 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="catalog" className="mb-3 md:mb-4" />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* visual */}
        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-lg border border-charcoal/10 bg-[#FFFCFA] shadow-[0_18px_50px_-42px_rgba(90,38,50,0.74)] sm:aspect-square">
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
          {gallery.length > 1 ? <div className="grid min-w-0 grid-cols-3 gap-2">
            {gallery.map((photo, index) => (
              <button
                type="button"
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
          </div> : null}
          <div className="flex flex-wrap gap-2">
            {product.variants?.map((v: any) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVariantId(v.id)}
                aria-pressed={variantId === v.id}
                className={`inline-flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  variantId === v.id ? "border-terre bg-terre/5 text-terre" : "border-border text-charcoal hover:bg-muted"
                }`}
              >
                <span>{v.label}</span><span className="text-[10px] font-black">{formatPrice(Math.round(Number(v.price) * promotionalRate * 100) / 100, locale)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* info */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${thermalColor(product.thermalClass)}`}>
              <ReiconGlyph icon={Snowflake} className="mr-1 h-3 w-3" /> {thermalLabel(product.thermalClass, locale)}
            </span>
            {discountPercent > 0 && <Badge className="bg-destructive text-white border-0">-{discountPercent}%</Badge>}
            {editorialHighlight ? <Badge className={`border-0 ${editorialHighlight === "new" ? "bg-gold text-charcoal" : editorialHighlight === "recommended" ? "bg-terre text-white" : "bg-burgundy text-cream"}`}>{editorialLabel}</Badge> : null}
            {product.isOnSale && discountPercent === 0 && <Badge className="bg-destructive text-white border-0">{t.promo}</Badge>}
          </div>
          <div>
            <h1 className="break-words font-display text-3xl font-semibold leading-tight text-charcoal md:text-4xl">{product.name}</h1>
            <p className="break-words text-sm text-muted-foreground">{product.traditionalName} · {product.country}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-terre">{commercialLine}</p>
          </div>

          {/* price */}
          <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-1">
            {discountPercent > 0 && <span className="text-lg text-muted-foreground line-through">{formatPrice(listPrice, locale)}</span>}
            <span className="whitespace-nowrap text-3xl font-extrabold text-terre">{formatPrice(price, locale)}</span>
            {activePricePerKg && <span className="min-w-0 break-words pb-1 text-xs text-muted-foreground">≈ {formatUnitPrice(Number(activePricePerKg), locale)}{t.perKg}</span>}
          </div>
          {saving > 0 && (
            <p className="w-fit rounded-md bg-burgundy/10 px-3 py-1 text-xs font-semibold text-burgundy">
              {locale === "fr" ? "Économie immédiate" : "Instant saving"} : {formatPrice(saving, locale)}
            </p>
          )}

          {/* stock */}
          <div className="flex items-center gap-2 text-sm" aria-live="polite">
            {outOfStock ? <span className="font-medium text-destructive">{t.outOfStock}</span>
              : lowStock ? <span className="font-medium text-gold">{t.lowStock} · {product.stockQty} {locale === "fr" ? "en stock" : "in stock"}</span>
              : <span className="font-medium text-burgundy">{t.inStock}</span>}
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
          <PurchaseControls
            productName={product.name}
            qty={qty}
            maxQty={product.stockQty || 99}
            onQtyChange={setQty}
            onAdd={handleAdd}
            outOfStock={outOfStock}
            addLabel={t.product.addToCart}
            lineTotal={lineTotal}
            isFavourite={isFav}
            onToggleFavourite={() => toggleFavorite(product.id)}
            isAuthenticated={Boolean(customer)}
            locale={locale}
          />
          <PurchaseControls
            mobile
            productName={product.name}
            qty={qty}
            maxQty={product.stockQty || 99}
            onQtyChange={setQty}
            onAdd={handleAdd}
            outOfStock={outOfStock}
            addLabel={t.product.addToCart}
            lineTotal={lineTotal}
            isFavourite={isFav}
            onToggleFavourite={() => toggleFavorite(product.id)}
            isAuthenticated={Boolean(customer)}
            locale={locale}
          />

          {/* trust badges */}
          <div className="grid min-w-0 grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <ReiconGlyph icon={Truck} className="h-4 w-4 text-terre" /> {locale === "fr" ? "Livraison suivie" : "Tracked delivery"}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <ReiconGlyph icon={Snowflake} className="h-4 w-4 text-burgundy" /> {locale === "fr" ? "Chaîne du froid" : "Cold chain"}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 text-[11px] leading-tight text-muted-foreground">
              <ReiconGlyph icon={ShieldCheck} className="h-4 w-4 text-gold" /> {locale === "fr" ? "Traçabilité" : "Traceability"}
            </div>
          </div>

          <section className="border-y border-border py-4" aria-labelledby="product-facts-title">
            <h2 id="product-facts-title" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {locale === "fr" ? "Repères produit" : "Product details"}
            </h2>
            <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 text-xs sm:grid-cols-4">
              <ProductFact label={locale === "fr" ? "Origine" : "Origin"} value={product.country || "—"} />
              <ProductFact label={locale === "fr" ? "Format" : "Pack"} value={variant?.label || product.packaging || "—"} />
              <ProductFact label={locale === "fr" ? "Conservation" : "Storage"} value={thermalLabel(product.thermalClass, locale)} />
              <ProductFact label={locale === "fr" ? "Référence" : "Reference"} value={product.sku || "—"} icon={<ReiconGlyph icon={Barcode} className="h-3.5 w-3.5" />} />
            </dl>
          </section>

          {/* tabs */}
          <Tabs defaultValue="desc" className="mt-2 min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-md border border-burgundy/10 bg-[#FBF7F5] p-1">
              {productTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="group min-h-[4.2rem] min-w-0 justify-start gap-2 overflow-hidden rounded-md px-2 py-2 text-left data-[state=active]:bg-white data-[state=active]:shadow-[0_10px_26px_-24px_rgba(90,38,50,0.75)]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre transition-colors group-data-[state=active]:bg-terre group-data-[state=active]:text-white">
                    <ReiconGlyph icon={tab.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-full whitespace-normal break-words text-[11px] font-black leading-3.5 text-charcoal sm:text-xs">{tab.label}</span>
                    <span className="mt-0.5 block line-clamp-2 whitespace-normal text-[8px] font-semibold leading-3.5 text-muted-foreground sm:text-[9px]">{tab.detail}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="desc" className="mt-3">
              <ProductInsightPanel icon={FileText} eyebrow={locale === "fr" ? "Lecture rapide" : "Quick read"} title={locale === "fr" ? "Comprendre le produit" : "Understand the product"}>
                <p>{product.description || commercialLine}</p>
                {product.ingredients && <p className="mt-3"><span className="font-semibold">{t.product.ingredients} :</span> {product.ingredients}</p>}
                {product.allergens && <p className="mt-1"><span className="font-semibold">{t.product.allergens} :</span> {product.allergens}</p>}
              </ProductInsightPanel>
            </TabsContent>
            <TabsContent value="nutri" className="mt-3">
              <ProductInsightPanel icon={Activity} eyebrow={locale === "fr" ? "Repères alimentaires" : "Food markers"} title={t.product.nutritionFacts}>
                {product.nutrition ? (
                  <div className="overflow-hidden rounded-md border border-border bg-white">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(product.nutrition).map(([k, v]: [string, any]) => (
                          <tr key={k} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 capitalize text-muted-foreground">{nutriLabel(k, locale)}</td>
                            <td className="px-3 py-2 text-right font-medium text-charcoal">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-muted-foreground">—</p>}
              </ProductInsightPanel>
            </TabsContent>
            <TabsContent value="prep" className="mt-3">
              <ProductInsightPanel icon={ChefHat} eyebrow={locale === "fr" ? "En cuisine" : "In the kitchen"} title={locale === "fr" ? "Préparer sans hésiter" : "Prepare with confidence"}>
                {product.preparation || "—"}
              </ProductInsightPanel>
            </TabsContent>
            <TabsContent value="store" className="mt-3">
              <ProductInsightPanel icon={Fridge} eyebrow={locale === "fr" ? "Qualité conservée" : "Quality preserved"} title={locale === "fr" ? "Stockage et chaîne thermique" : "Storage and thermal chain"}>
                {product.storage || "—"} {product.storageTempC && `· ${product.storageTempC}`}
              </ProductInsightPanel>
            </TabsContent>
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
    </>
  );
}

function PurchaseControls({ productName, qty, maxQty, onQtyChange, onAdd, outOfStock, addLabel, lineTotal, isFavourite, onToggleFavourite, isAuthenticated, locale, mobile = false }: {
  productName: string;
  qty: number;
  maxQty: number;
  onQtyChange: (quantity: number) => void;
  onAdd: () => void;
  outOfStock: boolean;
  addLabel: string;
  lineTotal: number;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  isAuthenticated: boolean;
  locale: Locale;
  mobile?: boolean;
}) {
  const protectedAddLabel = isAuthenticated ? addLabel : (locale === "fr" ? "Se connecter" : "Sign in");
  const protectedAddAria = isAuthenticated
    ? `${addLabel}, ${formatPrice(lineTotal, locale)}`
    : (locale === "fr" ? `Connectez-vous pour ajouter ${productName} au panier` : `Sign in to add ${productName} to the basket`);
  const controls = (
    <div className={`flex min-w-0 items-center gap-2 ${mobile ? "mx-auto max-w-xl" : "w-full"}`}>
      <div className="inline-flex shrink-0 items-center rounded-md border border-charcoal/12 bg-white">
        <button type="button" onClick={() => onQtyChange(Math.max(1, qty - 1))} disabled={!isAuthenticated || qty <= 1} className={`${mobile ? "h-10 w-8" : "h-11 w-10"} grid place-items-center rounded-md text-charcoal hover:bg-muted disabled:text-muted-foreground`} aria-label={locale === "fr" ? `Diminuer la quantité de ${productName}` : `Decrease ${productName} quantity`}><ReiconGlyph icon={Minus} className="h-4 w-4" /></button>
        <span className={`${mobile ? "min-w-7" : "min-w-10"} text-center text-sm font-black tabular-nums text-charcoal`}>{qty}</span>
        <button type="button" onClick={() => onQtyChange(Math.min(Math.max(1, maxQty), qty + 1))} disabled={!isAuthenticated || outOfStock || qty >= maxQty} className={`${mobile ? "h-10 w-8" : "h-11 w-10"} grid place-items-center rounded-md text-charcoal hover:bg-muted disabled:text-muted-foreground`} aria-label={locale === "fr" ? `Augmenter la quantité de ${productName}` : `Increase ${productName} quantity`}><ReiconGlyph icon={Plus} className="h-4 w-4" /></button>
      </div>
      <Button onClick={onAdd} disabled={outOfStock} size="lg" aria-label={protectedAddAria} className={`${mobile ? "h-11 px-3 text-xs" : "h-11 px-4 text-sm"} min-w-0 flex-1 justify-between gap-2 whitespace-normal bg-terre text-center leading-tight text-cream shadow-md hover:bg-terre-dark`}>
        <span className="inline-flex min-w-0 items-center"><ReiconGlyph icon={isAuthenticated ? CartAdd : Login} className="mr-1 h-4 w-4 shrink-0" />{mobile && isAuthenticated ? (locale === "fr" ? "Ajouter" : "Add") : protectedAddLabel}</span>
        {isAuthenticated ? <span className="shrink-0 border-l border-white/25 pl-2 font-black tabular-nums">{formatPrice(lineTotal, locale)}</span> : null}
      </Button>
      <Button variant="outline" size="icon" onClick={onToggleFavourite} aria-pressed={isFavourite} aria-label={!isAuthenticated ? (locale === "fr" ? `Connectez-vous pour enregistrer ${productName}` : `Sign in to save ${productName}`) : isFavourite ? (locale === "fr" ? `Retirer ${productName} des favoris` : `Remove ${productName} from favourites`) : (locale === "fr" ? `Ajouter ${productName} aux favoris` : `Add ${productName} to favourites`)} className={`${mobile ? "h-10 w-10" : "h-11 w-11"} shrink-0 border-charcoal/12 bg-white`}>
        <ReiconGlyph icon={Heart} weight={isFavourite ? "Filled" : "Outline"} className={`h-5 w-5 ${isFavourite ? "text-terre" : "text-charcoal"}`} />
      </Button>
    </div>
  );

  if (!mobile) return <div className="hidden min-w-0 md:flex">{controls}</div>;
  return (
    <MobileActionDock testId="product-purchase-dock">
      {controls}
    </MobileActionDock>
  );
}

function ProductFact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l-2 border-terre/15 pl-2.5">
      <dt className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">{icon}{label}</dt>
      <dd className="mt-1 break-words font-semibold leading-snug text-charcoal">{value}</dd>
    </div>
  );
}

function ProductInsightPanel({ icon, eyebrow, title, children }: { icon: IconFunction; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-y border-burgundy/12 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(255,248,244,0.82),rgba(255,245,230,0.56))] px-3.5 py-4 text-sm leading-6 text-charcoal">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy text-white shadow-[0_12px_24px_-18px_rgba(90,38,50,0.86)]">
          <ReiconGlyph icon={icon} weight="Filled" className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[9px] font-black uppercase text-terre">{eyebrow}</span>
          <span className="mt-0.5 block break-words text-sm font-black leading-5 text-charcoal">{title}</span>
        </span>
      </div>
      <div className="break-words text-muted-foreground">{children}</div>
    </section>
  );
}

function productTabDescriptors(locale: Locale) {
  const t = dict[locale];
  return locale === "fr"
    ? [
        { value: "desc", label: t.product.description, detail: "Origine, ingrédients et usages", icon: FileText },
        { value: "nutri", label: t.product.nutrition, detail: "Valeurs, repères et équilibre", icon: Activity },
        { value: "prep", label: t.product.preparation, detail: "Conseils cuisine et service", icon: ChefHat },
        { value: "store", label: t.product.storage, detail: "Conservation et chaîne thermique", icon: Fridge },
      ]
    : [
        { value: "desc", label: t.product.description, detail: "Origin, ingredients and uses", icon: FileText },
        { value: "nutri", label: t.product.nutrition, detail: "Values, markers and balance", icon: Activity },
        { value: "prep", label: t.product.preparation, detail: "Cooking and serving guidance", icon: ChefHat },
        { value: "store", label: t.product.storage, detail: "Storage and thermal chain", icon: Fridge },
      ];
}

function nutriLabel(k: string, locale: Locale) {
  const map: Record<string, [string, string]> = {
    energy: ["Énergie", "Energy"], fat: ["Matières grasses", "Fat"], saturated: ["dont saturées", "of which saturates"],
    carbs: ["Glucides", "Carbohydrates"], sugars: ["dont sucres", "of which sugars"], protein: ["Protéines", "Protein"], salt: ["Sel", "Salt"],
  };
  return (map[k] || [k, k])[locale === "en" ? 1 : 0];
}
