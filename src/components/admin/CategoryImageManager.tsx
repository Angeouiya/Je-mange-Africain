"use client";

import { useState } from "react";
import { Image as ReImage } from "reicon/icons/Image";
import { Refresh } from "reicon/icons/Refresh";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { ProductImage } from "@/components/shared/ProductImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { ADMIN_DATA_TTL_MS } from "@/lib/admin-prefetch";
import { clearFetchCache, useFetch } from "@/lib/use-fetch";
import { getCategoryPhoto } from "@/lib/market-media";

type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  productCount: number;
};

type Feedback = {
  categoryId: string;
  status: "success" | "error";
  text: string;
} | null;

export function CategoryImageManager({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const endpoint = `/api/admin/categories?locale=${locale}`;
  const request = useFetch<{ categories: CategoryRecord[] }>(endpoint, [locale], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const categories = request.data?.categories || [];

  const saveImage = async (category: CategoryRecord, imageUrl: string) => {
    setSavingId(category.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (isFr ? "Le rayon n'a pas pu être modifié." : "The department could not be updated."));
      clearFetchCache(endpoint);
      clearFetchCache(`/api/categories?locale=${locale}`);
      clearFetchCache(`/api/catalog?section=home&locale=${locale}`);
      request.refetch();
      setFeedback({
        categoryId: category.id,
        status: "success",
        text: imageUrl ? (isFr ? "Image du rayon enregistrée." : "Department image saved.") : (isFr ? "Image du rayon retirée." : "Department image removed."),
      });
    } catch (cause) {
      setFeedback({
        categoryId: category.id,
        status: "error",
        text: cause instanceof Error ? cause.message : (isFr ? "Modification impossible." : "Update failed."),
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="overflow-hidden border-y border-burgundy/10 bg-white" aria-labelledby="category-image-manager-title" data-testid="category-image-manager">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Rayons illustrés" : "Illustrated departments"}</p>
          <h2 id="category-image-manager-title" className="mt-0.5 text-sm font-black text-charcoal">{isFr ? "Images précises de chaque rayon" : "Precise image for each department"}</h2>
          <p className="mt-1 max-w-2xl text-[10px] leading-4 text-muted-foreground">
            {isFr ? "L'image chargée ici apparaît dans l'application client. Sans image, le rayon conserve son visuel par défaut." : "The image uploaded here appears in the customer app. Without one, the department keeps its default visual."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={request.refetch} className="h-9 border-burgundy/20 bg-white text-burgundy hover:bg-burgundy/[0.04] hover:text-burgundy">
          <ReiconGlyph icon={Refresh} className="h-4 w-4" />
          {isFr ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      {request.loading && !request.data ? (
        <div className="grid grid-cols-2 gap-2 border-t border-charcoal/8 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : null}

      {request.error && !request.data ? (
        <div className="border-t border-charcoal/8 px-4 py-4 text-xs font-bold text-destructive" role="alert">{request.error}</div>
      ) : null}

      {categories.length ? (
        <div className="grid grid-cols-1 gap-2 border-t border-charcoal/8 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const currentFeedback = feedback?.categoryId === category.id ? feedback : null;
            return (
              <article key={category.id} className="min-w-0 rounded-md border border-charcoal/8 bg-[#FFFCFA] p-2.5" data-testid="category-image-card">
                <div className="flex items-start gap-3">
                  <ProductImage src={category.imageUrl || getCategoryPhoto(category)} alt={category.name} emoji="" color={category.color || "#8A3042"} size="sm" className="h-16 w-16 shrink-0" rounded="rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <CategoryIcon slug={category.slug} label={category.name} color={category.color} className="h-7 w-7 shadow-none" />
                      <span className="min-w-0">
                        <strong className="block truncate text-xs text-charcoal">{category.name}</strong>
                        <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{category.slug}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="border-burgundy/20 bg-white text-[9px] text-burgundy">{category.productCount} {isFr ? "produit(s)" : "product(s)"}</Badge>
                      <Badge variant="outline" className={`bg-white text-[9px] ${category.imageUrl ? "border-burgundy/20 text-burgundy" : "border-gold/40 text-charcoal"}`}>
                        <ReiconGlyph icon={ReImage} className="h-3 w-3" />
                        {category.imageUrl ? (isFr ? "personnalisé" : "custom") : (isFr ? "par défaut" : "default")}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-charcoal/8 pt-3">
                  <MediaUploadField
                    value={category.imageUrl || ""}
                    onChange={(imageUrl) => void saveImage(category, imageUrl)}
                    kind="category"
                    locale={locale}
                    label={isFr ? `Image du rayon ${category.name}` : `${category.name} department image`}
                    aspect="landscape"
                    compactMobile
                  />
                  {savingId === category.id ? <p className="mt-2 text-[10px] font-bold text-burgundy" role="status">{isFr ? "Enregistrement du rayon..." : "Saving department..."}</p> : null}
                  {currentFeedback ? <p className={`mt-2 text-[10px] font-bold ${currentFeedback.status === "success" ? "text-burgundy" : "text-destructive"}`} role={currentFeedback.status === "success" ? "status" : "alert"}>{currentFeedback.text}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
