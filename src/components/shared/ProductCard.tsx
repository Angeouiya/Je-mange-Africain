"use client";

import { motion } from "framer-motion";
import { Heart } from "reicon/icons/Heart";
import { Login } from "reicon/icons/Login";
import { Plus } from "reicon/icons/Plus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { formatPrice, formatUnitPrice, thermalColor, thermalLabel } from "@/lib/format";
import { getProductCommercialLine, getProductPhoto } from "@/lib/market-media";
import { productEditorialHighlight } from "@/lib/editorial-flags";
import { resolveProductPricing } from "@/lib/product-pricing";
import { prefetchStorefrontData } from "@/lib/storefront-prefetch";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

export interface ProductListItem {
  id: string;
  sku: string;
  traditionalName: string;
  name: string;
  nameFr?: string;
  nameEn?: string;
  price: number;
  promoPrice: number | null;
  pricePerKg?: number | null;
  stockQty: number;
  alertThreshold?: number;
  country?: string;
  brandName?: string | null;
  category?: { id?: string; slug?: string; name?: string; color?: string | null } | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  description?: string;
  photoUrl?: string | null;
  imageUrl?: string | null;
  imageColor: string;
  imageEmoji: string;
  isBestseller?: boolean;
  isRecommended?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  thermalClass: string;
  packaging?: string;
  unit?: string;
  variants?: { id: string; label: string; weightGrams: number; price: number; pricePerKg?: number | null; isDefault: boolean }[];
}

type ProductCardSurfaceProps = {
  product: ProductListItem;
  locale: "fr" | "en";
  compact: boolean;
  index?: number;
  isFav?: boolean;
  onAdd?: (event: React.MouseEvent) => void;
  onFavorite?: (event: React.MouseEvent) => void;
  isAuthenticated?: boolean;
};

const productCardFrame = (compact: boolean, interactive: boolean) =>
  `group relative flex min-w-0 flex-col overflow-hidden bg-white transition-all ${interactive ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre focus-visible:ring-offset-2" : ""} ${compact ? "rounded-md border border-charcoal/8 shadow-[0_12px_28px_-26px_rgba(90,38,50,0.56)] hover:border-burgundy/20 hover:shadow-[0_22px_42px_-34px_rgba(90,38,50,0.62)]" : "rounded-lg border border-charcoal/10 hover:border-burgundy/25 hover:shadow-[0_24px_56px_-38px_rgba(63,41,48,0.62)]"}`;

const comparableText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function ProductCard({ product, index = 0, compact = false }: { product: ProductListItem; index?: number; compact?: boolean }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const addToCart = useStore((s) => s.addToCart);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const requestCustomerAuth = useStore((s) => s.requestCustomerAuth);
  const customer = useStore((s) => s.customer);
  const isFav = favorites.includes(product.id);
  const photoUrl = product.imageUrl || product.photoUrl || getProductPhoto(product);
  const outOfStock = product.stockQty <= 0;

  const defaultVariant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];
  const { price } = resolveProductPricing(product, defaultVariant?.price);
  const warmProduct = () => {
    if (!customer) return;
    void prefetchStorefrontData("product", { productId: product.id }, locale);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    if (!customer) {
      requestCustomerAuth({ view: "product", params: { productId: product.id } });
      return;
    }
    addToCart({
      productId: product.id,
      variantId: defaultVariant?.id,
      name: product.name,
      nameFr: product.nameFr || product.name,
      nameEn: product.nameEn || product.name,
      unitPrice: price,
      unitLabel: product.packaging || defaultVariant?.label || "",
      packWeightGrams: defaultVariant?.weightGrams || 0,
      thermalClass: product.thermalClass as any,
      imageColor: product.imageColor,
      imageEmoji: product.imageEmoji,
      imageUrl: photoUrl,
      maxStock: product.stockQty,
    });
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customer) {
      requestCustomerAuth({ view: "product", params: { productId: product.id } });
      return;
    }
    toggleFavorite(product.id);
  };

  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => navigate("product", { productId: product.id })}
      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); navigate("product", { productId: product.id }); } }}
      onPointerEnter={warmProduct}
      onFocus={warmProduct}
      onTouchStart={warmProduct}
      role="link"
      tabIndex={0}
      aria-label={locale === "fr" ? `Voir ${product.name}` : `View ${product.name}`}
      className={productCardFrame(compact, true)}
    >
      <ProductCardSurface product={product} locale={locale} compact={compact} index={index} isFav={isFav} isAuthenticated={Boolean(customer)} onAdd={handleAdd} onFavorite={handleFav} />
    </motion.div>
  );
}

export function ProductCardPreview({ product, locale, compact = true }: { product: ProductListItem; locale: "fr" | "en"; compact?: boolean }) {
  return (
    <div className={productCardFrame(compact, false)} data-testid="storefront-product-card-preview">
      <ProductCardSurface product={product} locale={locale} compact={compact} />
    </div>
  );
}

function ProductCardSurface({ product, locale, compact, index = 0, isFav = false, isAuthenticated = false, onAdd, onFavorite }: ProductCardSurfaceProps) {
  const t = dict[locale];
  const defaultVariant = product.variants?.find((variant) => variant.isDefault) || product.variants?.[0];
  const { listPrice, price, discountPercent, saving } = resolveProductPricing(product, defaultVariant?.price);
  const unitPricePerKg = defaultVariant?.weightGrams
    ? price / (defaultVariant.weightGrams / 1000)
    : defaultVariant?.pricePerKg ?? product.pricePerKg;
  const photoUrl = product.imageUrl || product.photoUrl || getProductPhoto(product);
  const fallbackPhotoUrl = getProductPhoto({ ...product, imageUrl: null, photoUrl: null });
  const commercialLine = getProductCommercialLine(product, locale);
  const lowStock = product.stockQty > 0 && product.stockQty <= (product.alertThreshold || 5);
  const outOfStock = product.stockQty <= 0;
  const editorialHighlight = productEditorialHighlight(product);
  const traditionalName = comparableText(product.traditionalName) === comparableText(product.name) ? "" : product.traditionalName;
  const metaLine = traditionalName || product.country || product.category?.name || "";
  const editorialLabel = editorialHighlight === "bestseller"
    ? t.bestseller
    : editorialHighlight === "recommended"
      ? (locale === "fr" ? "Recommandé" : "Recommended")
      : editorialHighlight === "new"
        ? t.new
        : "";
  const interactive = Boolean(onAdd && onFavorite);

  return (
    <>
      <div className="relative">
        <div className={`relative flex w-full items-center justify-center bg-muted/40 ${compact ? "aspect-[4/3] rounded-md" : "aspect-[4/3]"}`}>
          <ProductImage
            src={photoUrl}
            fallbackSrc={fallbackPhotoUrl}
            alt={product.name}
            emoji={product.imageEmoji}
            color={product.imageColor}
            size="lg"
            priority={index < 2}
            className="h-full w-full"
            rounded="rounded-none"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(180deg,transparent,rgba(63,41,48,0.28))]" aria-hidden="true" />
        </div>
        <div className="absolute left-2 top-2 flex max-w-[74%] flex-col gap-1">
          {discountPercent > 0 && (
            <span className="w-fit rounded-md bg-burgundy px-2 py-1 text-[10px] font-extrabold leading-none text-white shadow-[0_8px_18px_-12px_rgba(90,38,50,0.8)]">
              -{discountPercent}%
            </span>
          )}
          {editorialHighlight ? <Badge className={`border-0 shadow-sm ${editorialHighlight === "new" ? "bg-gold text-charcoal" : editorialHighlight === "recommended" ? "bg-terre text-white" : "bg-burgundy text-cream"}`}>{editorialLabel}</Badge> : null}
          {product.isOnSale && discountPercent === 0 && <Badge className="bg-destructive text-white border-0 shadow-sm">{t.promo}</Badge>}
        </div>
        {interactive ? (
          <button
            type="button"
            onClick={onFavorite}
            aria-pressed={isFav}
            aria-label={!isAuthenticated
              ? (locale === "fr" ? `Connectez-vous pour enregistrer ${product.name}` : `Sign in to save ${product.name}`)
              : isFav
              ? (locale === "fr" ? `Retirer ${product.name} des favoris` : `Remove ${product.name} from favourites`)
              : (locale === "fr" ? `Ajouter ${product.name} aux favoris` : `Add ${product.name} to favourites`)}
            className={`absolute right-2 top-2 grid place-items-center border border-charcoal/10 bg-white/95 text-burgundy shadow-sm backdrop-blur transition hover:border-terre/30 hover:bg-white hover:text-terre ${compact ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-full"}`}
          >
            <ReiconGlyph icon={Heart} weight={isFav ? "Filled" : "Outline"} className="h-4 w-4" />
          </button>
        ) : (
          <span aria-hidden="true" className={`absolute right-2 top-2 grid place-items-center border border-charcoal/10 bg-white/95 text-burgundy shadow-sm backdrop-blur ${compact ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-full"}`}><ReiconGlyph icon={Heart} className="h-4 w-4" /></span>
        )}
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-1 p-2" : "gap-2.5 p-3.5"}`}>
        <div className={`items-center gap-1.5 ${compact && !lowStock && !outOfStock ? "hidden" : "flex"}`}>
          {!compact ? <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${thermalColor(product.thermalClass)}`}>
            {thermalLabel(product.thermalClass, locale)}
          </span> : null}
          {lowStock && <span className="text-[10px] font-semibold text-gold">{t.lowStock}</span>}
          {outOfStock && <span className="text-[10px] font-semibold text-destructive">{t.outOfStock}</span>}
        </div>
        <div>
          <h3 className={`line-clamp-2 break-words font-extrabold leading-tight text-charcoal ${compact ? "min-h-7 text-[11px]" : "text-sm"}`}>{product.name}</h3>
          {metaLine ? <p className={`${compact ? "text-[9px]" : "text-[11px]"} mt-0.5 line-clamp-1 font-medium text-muted-foreground`}>{metaLine}</p> : null}
        </div>
        <p className={`${compact ? "line-clamp-1 min-h-4 text-[9px] leading-4" : "line-clamp-2 min-h-[2.2rem] text-[11px] leading-relaxed"} text-muted-foreground`}>
          {compact ? (product.description || commercialLine) : commercialLine}
        </p>
        <div className="mt-auto flex min-w-0 items-end justify-between gap-1.5 pt-1">
          <div className="min-w-0">
            {discountPercent > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground line-through">{formatPrice(listPrice, locale)}</span>
                {saving > 0 && (
                  <span className="text-[10px] font-semibold text-burgundy">
                    {locale === "fr" ? "éco." : "save"} {formatPrice(saving, locale)}
                  </span>
                )}
              </div>
            )}
            <span className={`${compact ? "text-[13px]" : "text-base"} block whitespace-nowrap font-black text-terre`}>{formatPrice(price, locale)}</span>
            {unitPricePerKg && !compact && <span className="block truncate text-[10px] text-muted-foreground">{formatUnitPrice(unitPricePerKg, locale)} / kg</span>}
          </div>
          {interactive ? (
            <Button
              size="sm"
              onClick={onAdd}
              disabled={outOfStock}
              className={`${compact ? "h-8 w-8 rounded-md" : "h-9 w-9 rounded-full"} bg-terre p-0 text-white shadow-sm hover:bg-terre-dark`}
              aria-label={isAuthenticated ? t.product.addToCart : (locale === "fr" ? "Connectez-vous pour ajouter au panier" : "Sign in to add to basket")}
            >
              <ReiconGlyph icon={isAuthenticated ? Plus : Login} weight="Filled" className="h-4 w-4" />
            </Button>
          ) : (
            <span aria-hidden="true" className={`${compact ? "h-8 w-8 rounded-md" : "h-9 w-9 rounded-full"} grid place-items-center bg-terre text-white shadow-sm ${outOfStock ? "opacity-50" : ""}`}><ReiconGlyph icon={Plus} weight="Filled" className="h-4 w-4" /></span>
          )}
        </div>
      </div>
    </>
  );
}
