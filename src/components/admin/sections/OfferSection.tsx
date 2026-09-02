"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChefHat, Clock3, Package, Search, Sparkles } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { ProductCreateDialog } from "@/components/admin/ProductCreateDialog";
import { RecipeCreateDialog } from "@/components/admin/RecipeCreateDialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, normalize, thermalColor, thermalLabel } from "@/lib/format";
import { ProductImage } from "@/components/shared/ProductImage";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { EditorialActionsDialog } from "@/components/admin/EditorialActionsDialog";

type Product = { id: string; name: string; nameFr: string; nameEn: string; descriptionFr: string; descriptionEn: string; traditionalName: string; sku: string; categoryId: string; packaging: string; costPrice?: number | null; profitMargin?: number | null; costSource?: "recorded" | "estimated"; price: number; promoPrice?: number | null; isWholesale?: boolean; wholesalePackLabel?: string | null; wholesaleUnitsPerPack?: number; wholesaleMinPacks?: number; wholesalePrice?: number | null; wholesaleTier2MinPacks?: number | null; wholesaleTier2Price?: number | null; wholesaleTier3MinPacks?: number | null; wholesaleTier3Price?: number | null; stockQty: number; alertThreshold?: number; netWeightGrams: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; aliases?: string[]; isNew?: boolean; isRecommended?: boolean; isBestseller?: boolean; status?: "draft" | "published" | "archived"; thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN"; storageType: "SEC" | "FRAIS" | "REFRIGERE" | "SURGELE" | "FUME" | "SECHE" | "CONSERVE"; country: string };
type Recipe = { id: string; title: string; description?: string; country: string; category: string; difficulty: string; timeMinutes: number; baseServings: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; isPopular: boolean; isNew?: boolean; isRecommended?: boolean; status?: string; ingredientCount: number };
type RecipeDetails = Recipe & { steps: string[]; ingredients: Array<{ recipeIngredientId: string; quantityPerBase: number; unit: string; optional: boolean; product: { id: string; traditionalName: string; emoji: string; imageUrl?: string | null; color?: string; nameFr: string; nameEn: string; stockQty: number } }> };

export default function OfferSection({ locale, workspace }: { locale: "fr" | "en"; workspace: "products" | "recipes" }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const productsRequest = useFetch<{ products: Product[]; total: number }>(workspace === "products" ? `/api/admin/products?locale=${locale}` : null, [locale, workspace]);
  const recipesRequest = useFetch<{ recipes: Recipe[] }>(workspace === "recipes" ? `/api/admin/recipes?locale=${locale}` : null, [locale, workspace]);
  const recipeDetailsRequest = useFetch<RecipeDetails>(selectedRecipe ? `/api/admin/recipes/${selectedRecipe.id}?locale=${locale}` : null, [selectedRecipe?.id, locale]);

  const products = productsRequest.data?.products || [];
  const recipes = recipesRequest.data?.recipes || [];
  const normalizedQuery = normalize(query);
  const filteredProducts = useMemo(() => products.filter((product) => normalize(`${product.name} ${product.traditionalName} ${product.sku} ${product.country}`).includes(normalizedQuery)), [products, normalizedQuery]);
  const filteredRecipes = useMemo(() => recipes.filter((recipe) => normalize(`${recipe.title} ${recipe.country} ${recipe.category}`).includes(normalizedQuery)), [recipes, normalizedQuery]);

  const activeRequest = workspace === "products" ? productsRequest : recipesRequest;
  if (activeRequest.loading && !activeRequest.data) return <AdminSectionLoading label={isFr ? "Ouverture de l'offre" : "Opening offer workspace"} />;
  if (activeRequest.error && !activeRequest.data) return <AdminErrorState message={activeRequest.error} onRetry={activeRequest.refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent={workspace === "products" ? "#2F6B4F" : "#D39B24"}
        icon={workspace === "products" ? <Package className="h-5 w-5" /> : <ChefHat className="h-5 w-5" />}
        eyebrow={workspace === "products" ? (isFr ? "Référentiel marchand" : "Commerce master data") : (isFr ? "Atelier culinaire" : "Culinary workshop")}
        title={workspace === "products" ? (isFr ? "Ce qui est réellement vendu" : "What is actually sold") : (isFr ? "Construire des recettes achetables" : "Build shoppable recipes")}
        description={workspace === "products" ? (isFr ? "Gérez chaque produit publié, son prix calculé, sa marge interne et sa disponibilité sans mélanger la logique éditoriale des recettes." : "Manage every published product, calculated price, internal margin and availability without mixing in recipe editorial work.") : (isFr ? "Ordonnez la préparation, reliez chaque ingrédient à un produit disponible et définissez précisément les portions proposées au client." : "Sequence preparation, link every ingredient to available stock and define the exact servings offered to customers.")}
        action={workspace === "products" ? <ProductCreateDialog locale={locale} onCreated={productsRequest.refetch} /> : <RecipeCreateDialog locale={locale} onCreated={recipesRequest.refetch} />}
      />

      <div className="flex flex-col gap-2 border-y border-black/8 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div><p className="text-[10px] font-extrabold uppercase text-muted-foreground">{workspace === "products" ? (isFr ? "Catalogue actif" : "Active catalogue") : (isFr ? "Recettes publiées" : "Published recipes")}</p><p className="mt-0.5 text-lg font-black tabular-nums text-charcoal">{workspace === "products" ? products.length : recipes.length}</p></div>
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-[#F7F7F4] pl-9" placeholder={workspace === "products" ? (isFr ? "Rechercher un produit ou un SKU" : "Search product or SKU") : (isFr ? "Rechercher une recette ou un pays" : "Search recipe or country")} />
        </label>
      </div>

      {workspace === "products" ? (
        filteredProducts.length ? (
          <div className="overflow-hidden rounded-lg border border-black/8 bg-white">
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader><TableRow><TableHead>{isFr ? "Produit" : "Product"}</TableHead><TableHead>SKU</TableHead><TableHead>{isFr ? "Origine" : "Origin"}</TableHead><TableHead>{isFr ? "Prix" : "Price"}</TableHead><TableHead>{isFr ? "Disponibilité" : "Availability"}</TableHead><TableHead>{isFr ? "Conservation" : "Storage"}</TableHead><TableHead><span className="sr-only">{isFr ? "Actions" : "Actions"}</span></TableHead></TableRow></TableHeader>
                <TableBody>{filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell><div className="flex items-center gap-3"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-charcoal">{product.name}</p><p className="truncate text-[10px] text-muted-foreground">{product.traditionalName}</p><div className="mt-1 flex gap-1">{product.isWholesale ? <Badge variant="outline" className="h-4 border-terre/25 bg-terre/[0.04] px-1 text-[8px] text-terre">{isFr ? "Gros" : "Wholesale"}</Badge> : null}{product.isNew ? <Badge variant="outline" className="h-4 px-1 text-[8px]">{isFr ? "Nouveau" : "New"}</Badge> : null}{product.isRecommended ? <Badge variant="outline" className="h-4 border-forest/25 px-1 text-[8px] text-forest">{isFr ? "Recommandé" : "Recommended"}</Badge> : null}{product.isBestseller ? <Badge variant="outline" className="h-4 border-gold/50 px-1 text-[8px] text-amber-700">{isFr ? "Populaire" : "Popular"}</Badge> : null}</div></div></div></TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-xs">{product.country}</TableCell>
                    <TableCell><p className="font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-0.5 whitespace-nowrap text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "de marge" : "margin"}{product.costSource === "estimated" ? ` · ${isFr ? "estimé" : "estimated"}` : ""}</p> : <p className="mt-0.5 text-[9px] text-muted-foreground">{isFr ? "Ventilation non renseignée" : "Breakdown not recorded"}</p>}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 whitespace-nowrap text-[9px] font-bold text-forest">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)} / {product.wholesalePackLabel}</p> : null}</TableCell>
                    <TableCell><Badge variant="outline" className={product.stockQty <= 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : product.stockQty <= (product.alertThreshold || 5) ? "border-amber-300 bg-amber-50 text-amber-800" : "border-forest/25 bg-forest/[0.04] text-forest"}>{product.stockQty <= 0 ? (isFr ? "Rupture" : "Out") : `${product.stockQty} ${isFr ? "en stock" : "in stock"}`}</Badge></TableCell>
                    <TableCell><span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${thermalColor(product.thermalClass)}`}>{thermalLabel(product.thermalClass, locale)}</span></TableCell>
                    <TableCell><div className="flex items-center justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border sm:hidden">{filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 [contain-intrinsic-size:76px] [content-visibility:auto]"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{product.name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.sku} · {thermalLabel(product.thermalClass, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-1 truncate text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "marge" : "margin"}</p> : null}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 truncate text-[9px] font-bold text-forest">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)}</p> : null}</div><div className="text-right"><p className="text-xs font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p><p className={`mt-1 text-[10px] font-bold ${product.stockQty ? "text-forest" : "text-destructive"}`}>{product.stockQty ? `${product.stockQty} dispo.` : (isFr ? "Rupture" : "Out")}</p><div className="mt-1 flex justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></div></div>
            ))}</div>
          </div>
        ) : <AdminEmptyState icon={<Package className="h-5 w-5" />} title={isFr ? "Aucun produit trouvé" : "No products found"} description={isFr ? "Modifiez la recherche ou enregistrez un nouveau produit." : "Change the search or add a new product."} />
      ) : (
        filteredRecipes.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredRecipes.map((recipe) => (
              <article key={recipe.id} className="group relative overflow-hidden rounded-lg border border-black/8 bg-white transition [contain-intrinsic-size:320px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-terre/30 hover:shadow-lg">
                <button type="button" onClick={() => setSelectedRecipe(recipe)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terre">
                  <div className="relative aspect-[16/7] overflow-hidden"><ProductImage src={recipe.imageUrl || getRecipePhoto(recipe)} alt={recipe.title} emoji={recipe.imageEmoji} color={recipe.imageColor} size="lg" className="h-full w-full" rounded="rounded-none" /><div className="absolute right-3 top-3 flex max-w-[72%] flex-wrap justify-end gap-1">{recipe.status === "draft" ? <Badge variant="outline" className="border-charcoal/15 bg-white text-charcoal">{isFr ? "Brouillon" : "Draft"}</Badge> : null}{recipe.isNew ? <Badge className="border-0 bg-gold text-charcoal">{isFr ? "Nouveau" : "New"}</Badge> : null}{recipe.isRecommended ? <Badge className="border-0 bg-forest text-white">{isFr ? "Recommandé" : "Recommended"}</Badge> : null}{recipe.isPopular ? <Badge className="border-0 bg-charcoal text-white"><Sparkles className="mr-1 h-3 w-3" /> {isFr ? "Populaire" : "Popular"}</Badge> : null}</div></div>
                  <div className="p-4"><p className="text-[10px] font-extrabold uppercase text-terre">{recipe.country} · {recipe.category}</p><h3 className="mt-1.5 truncate text-sm font-black text-charcoal">{recipe.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-[11px] leading-5 text-muted-foreground">{recipe.description}</p><div className="mt-3 flex items-center gap-3 border-t border-black/8 pt-3 text-[10px] font-bold text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {recipe.timeMinutes} min</span><span className="flex items-center gap-1"><ChefHat className="h-3.5 w-3.5" /> {recipe.ingredientCount} {isFr ? "ingr." : "ingr."}</span></div></div>
                </button>
                <div className="absolute left-3 top-3 z-10"><EditorialActionsDialog kind="recipe" entity={recipe} locale={locale} onUpdated={recipesRequest.refetch} /></div>
              </article>
            ))}
          </div>
        ) : <AdminEmptyState icon={<BookOpen className="h-5 w-5" />} title={isFr ? "Aucune recette trouvée" : "No recipes found"} description={isFr ? "Essayez un plat, un pays ou une catégorie différente." : "Try another dish, country or category."} />
      )}

      <Dialog open={Boolean(selectedRecipe)} onOpenChange={(open) => { if (!open) setSelectedRecipe(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-[10px] font-extrabold uppercase text-terre">{selectedRecipe?.country} · {selectedRecipe?.category}</p>
            <DialogTitle className="pr-8 text-xl font-black text-charcoal">{selectedRecipe?.title}</DialogTitle>
            <DialogDescription>{selectedRecipe?.description}</DialogDescription>
          </DialogHeader>
          {recipeDetailsRequest.loading ? <AdminSectionLoading label={isFr ? "Lecture de la recette" : "Reading recipe"} /> : recipeDetailsRequest.data ? (
            <div className="grid gap-6 px-5 py-6 md:grid-cols-[0.82fr_1.18fr] sm:px-6">
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Ingrédients liés" : "Linked ingredients"}</h4><div className="mt-3 divide-y divide-border border-y border-border">{recipeDetailsRequest.data.ingredients.map((ingredient) => <div key={ingredient.recipeIngredientId} className="flex items-center gap-3 py-3"><ProductImage src={ingredient.product.imageUrl} alt={isFr ? ingredient.product.nameFr : ingredient.product.nameEn} emoji={ingredient.product.emoji} color={ingredient.product.color} size="sm" className="h-9 w-9 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{isFr ? ingredient.product.nameFr : ingredient.product.nameEn}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{ingredient.quantityPerBase} {ingredient.unit}{ingredient.optional ? ` · ${isFr ? "optionnel" : "optional"}` : ""}</p></div><span className={`text-[10px] font-bold ${ingredient.product.stockQty > 0 ? "text-forest" : "text-destructive"}`}>{ingredient.product.stockQty} {isFr ? "dispo." : "avail."}</span></div>)}</div></section>
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Préparation publiée" : "Published preparation"}</h4><ol className="mt-3 space-y-3">{recipeDetailsRequest.data.steps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-charcoal text-[10px] font-black text-white">{index + 1}</span><p className="pt-1 text-xs leading-5 text-charcoal">{step}</p></li>)}</ol></section>
            </div>
          ) : <AdminErrorState message={recipeDetailsRequest.error} onRetry={recipeDetailsRequest.refetch} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
