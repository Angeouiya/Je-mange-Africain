"use client";

import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { formatPrice, formatUnitPrice, thermalColor, thermalLabel } from "@/lib/format";
import { getDiscountPercent, getProductCommercialLine, getProductPhoto } from "@/lib/market-media";

export interface ProductListItem {
  id: string;
  sku: string;
  traditionalName: string;
  name: string;
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
  imageColor: string;
  imageEmoji: string;
  isBestseller?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  thermalClass: string;
  packaging?: string;
  unit?: string;
  variants?: { id: string; label: string; weightGrams: number; price: number; isDefault: boolean }[];
}

export function ProductCard({ product, index = 0 }: { product: ProductListItem; index?: number }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const addToCart = useStore((s) => s.addToCart);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const t = dict[locale];
  const isFav = favorites.includes(product.id);
  const price = product.promoPrice ?? product.price;
  const discountPercent = getDiscountPercent(product.price, product.promoPrice);
  const saving = product.promoPrice ? product.price - product.promoPrice : 0;
  const photoUrl = product.photoUrl || getProductPhoto(product);
  const commercialLine = getProductCommercialLine(product, locale);
  const lowStock = product.stockQty > 0 && product.stockQty <= (product.alertThreshold || 5);
  const outOfStock = product.stockQty <= 0;

  const defaultVariant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    addToCart({
      productId: product.id,
      variantId: defaultVariant?.id,
      name: product.name,
      nameFr: product.name,
      nameEn: product.name,
      unitPrice: price,
      unitLabel: product.packaging || defaultVariant?.label || "",
      packWeightGrams: defaultVariant?.weightGrams || 0,
      thermalClass: product.thermalClass as any,
      imageColor: product.imageColor,
      imageEmoji: product.imageEmoji,
      maxStock: product.stockQty,
    });
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => navigate("product", { productId: product.id })}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative">
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/40">
          <ProductImage
            src={photoUrl}
            alt={product.name}
            emoji={product.imageEmoji}
            color={product.imageColor}
            size="lg"
            className="h-full w-full"
          />
        </div>
        <div className="absolute left-2 top-2 flex max-w-[74%] flex-col gap-1">
          {discountPercent > 0 && (
            <span className="w-fit rounded-md bg-destructive px-2 py-1 text-[11px] font-extrabold leading-none text-white shadow-md">
              -{discountPercent}%
            </span>
          )}
          {product.isBestseller && <Badge className="bg-forest text-cream border-0 shadow-sm">{t.bestseller}</Badge>}
          {product.isNew && <Badge className="bg-gold text-charcoal border-0 shadow-sm">{t.new}</Badge>}
          {product.isOnSale && discountPercent === 0 && <Badge className="bg-destructive text-white border-0 shadow-sm">{t.promo}</Badge>}
        </div>
        <button
          onClick={handleFav}
          aria-label="Favori"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur transition hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-terre text-terre" : "text-charcoal"}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${thermalColor(product.thermalClass)}`}>
            {thermalLabel(product.thermalClass, locale)}
          </span>
          {lowStock && <span className="text-[10px] font-semibold text-gold">{t.lowStock}</span>}
          {outOfStock && <span className="text-[10px] font-semibold text-destructive">{t.outOfStock}</span>}
        </div>
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-charcoal">{product.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-terre">{product.traditionalName}</p>
        </div>
        <p className="line-clamp-2 min-h-[2.2rem] text-[11px] leading-relaxed text-muted-foreground">{commercialLine}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            {product.promoPrice && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price, locale)}</span>
                {saving > 0 && (
                  <span className="text-[10px] font-semibold text-forest">
                    {locale === "fr" ? "éco." : "save"} {formatPrice(saving, locale)}
                  </span>
                )}
              </div>
            )}
            <span className="text-base font-extrabold text-terre">{formatPrice(price, locale)}</span>
            {product.pricePerKg && <span className="ml-1 text-[10px] text-muted-foreground">/ {formatUnitPrice(product.pricePerKg, locale)} kg</span>}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={outOfStock}
            className="h-8 w-8 rounded-full bg-terre p-0 text-cream shadow-sm hover:bg-terre-dark"
            aria-label={t.product.addToCart}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
