"use client";

import { useMemo, useState } from "react";
import { BookOpen, BookOpenCheck, ChefHat, ChevronRight, Clock3, Package, Sparkles, UsersRound } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { ProductCreateDialog } from "@/components/admin/ProductCreateDialog";
import { RecipeCreateDialog } from "@/components/admin/RecipeCreateDialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, normalize, thermalColor, thermalLabel } from "@/lib/format";
import { ProductImage } from "@/components/shared/ProductImage";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { EditorialActionsDialog } from "@/components/admin/EditorialActionsDialog";

type Product = { id: string; name: string; nameFr: string; nameEn: string; descriptionFr: string; descriptionEn: string; traditionalName: string; sku: string; categoryId: string; packaging: string; costPrice?: number | null; profitMargin?: number | null; costSource?: "recorded" | "estimated"; price: number; promoPrice?: number | null; isWholesale?: boolean; wholesalePackLabel?: string | null; wholesaleUnitsPerPack?: number; wholesaleMinPacks?: number; wholesalePrice?: number | null; wholesaleTier2MinPacks?: number | null; wholesaleTier2Price?: number | null; wholesaleTier3MinPacks?: number | null; wholesaleTier3Price?: number | null; stockQty: number; alertThreshold?: number; netWeightGrams: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; aliases?: string[]; isNew?: boolean; isRecommended?: boolean; isBestseller?: boolean; status?: "draft" | "published" | "archived"; thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN"; storageType: "SEC" | "FRAIS" | "REFRIGERE" | "SURGELE" | "FUME" | "SECHE" | "CONSERVE"; country: string };
type Recipe = { id: string; title: string; description?: string; country: string; category: string; difficulty: string; timeMinutes: number; baseServings: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; isPopular: boolean; isNew?: boolean; isRecommended?: boolean; status?: string; ingredientCount: number; requiredIngredientCount?: number; availableIngredientCount?: number; stockCoverageRate?: number; needsAttention?: boolean; stepCount?: number; updatedAt?: string };
type RecipeDetails = Recipe & { steps: string[]; ingredients: Array<{ recipeIngredientId: string; quantityPerBase: number; unit: string; optional: boolean; product: { id: string; traditionalName: string; emoji: string; imageUrl?: string | null; color?: string; nameFr: string; nameEn: string; stockQty: number } }> };

export default function OfferSection({ locale, workspace }: { locale: "fr" | "en"; workspace: "products" | "recipes" }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeFilter, setRecipeFilter] = useState<"all" | "published" | "draft" | "attention">("all");
  const productsRequest = useFetch<{ products: Product[]; total: number }>(workspace === "products" ? `/api/admin/products?locale=${locale}` : null, [locale, workspace]);
  const recipesRequest = useFetch<{ recipes: Recipe[] }>(workspace === "recipes" ? `/api/admin/recipes?locale=${locale}` : null, [locale, workspace]);
  const recipeDetailsRequest = useFetch<RecipeDetails>(selectedRecipe ? `/api/admin/recipes/${selectedRecipe.id}?locale=${locale}` : null, [selectedRecipe?.id, locale]);

  const products = productsRequest.data?.products || [];
  const recipes = recipesRequest.data?.recipes || [];
  const normalizedQuery = normalize(query);
  const filteredProducts = useMemo(() => products.filter((product) => normalize(`${product.name} ${product.traditionalName} ${product.sku} ${product.country}`).includes(normalizedQuery)), [products, normalizedQuery]);
  const recipeStats = useMemo(() => ({
    published: recipes.filter((recipe) => recipe.status === "published").length,
    draft: recipes.filter((recipe) => recipe.status === "draft").length,
    ready: recipes.filter((recipe) => !(recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100))).length,
    attention: recipes.filter((recipe) => recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100)).length,
  }), [recipes]);
  const filteredRecipes = useMemo(() => recipes.filter((recipe) => {
    const matchesQuery = normalize(`${recipe.title} ${recipe.country} ${recipe.category}`).includes(normalizedQuery);
    const needsAttention = recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100);
    const matchesFilter = recipeFilter === "all" || (recipeFilter === "attention" ? needsAttention : recipe.status === recipeFilter);
    return matchesQuery && matchesFilter;
  }), [recipes, normalizedQuery, recipeFilter]);

  const activeRequest = workspace === "products" ? productsRequest : recipesRequest;
  if (activeRequest.loading && !activeRequest.data) return <AdminSectionLoading label={isFr ? "Ouverture de l'offre" : "Opening offer workspace"} />;
  if (activeRequest.error && !activeRequest.data) return <AdminErrorState message={activeRequest.error} onRetry={activeRequest.refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent={workspace === "products" ? "#8A3042" : "#F2A900"}
        icon={workspace === "products" ? <Package className="h-5 w-5" /> : <ChefHat className="h-5 w-5" />}
        eyebrow={workspace === "products" ? (isFr ? "Référentiel marchand" : "Commerce master data") : (isFr ? "Atelier culinaire" : "Culinary workshop")}
        title={workspace === "products" ? (isFr ? "Ce qui est réellement vendu" : "What is actually sold") : (isFr ? "Construire des recettes achetables" : "Build shoppable recipes")}
        description={workspace === "products" ? (isFr ? "Gérez chaque produit publié, son prix calculé, sa marge interne et sa disponibilité sans mélanger la logique éditoriale des recettes." : "Manage every published product, calculated price, internal margin and availability without mixing in recipe editorial work.") : (isFr ? "Ordonnez la préparation, reliez chaque ingrédient à un produit disponible et définissez précisément les portions proposées au client." : "Sequence preparation, link every ingredient to available stock and define the exact servings offered to customers.")}
        action={workspace === "products" ? <ProductCreateDialog locale={locale} onCreated={productsRequest.refetch} /> : <RecipeCreateDialog locale={locale} onCreated={recipesRequest.refetch} />}
      />

      <div className="flex flex-col gap-3 border-y border-charcoal/8 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {workspace === "products" ? <div><p className="text-[10px] font-extrabold uppercase text-muted-foreground">{isFr ? "Catalogue actif" : "Active catalogue"}</p><p className="mt-0.5 text-lg font-black tabular-nums text-charcoal">{products.length}</p></div> : <div className="grid grid-cols-3 divide-x divide-charcoal/8"><RecipeRegisterMetric label={isFr ? "Publiées" : "Published"} value={recipeStats.published} /><RecipeRegisterMetric label={isFr ? "Prêtes" : "Ready"} value={recipeStats.ready} /><RecipeRegisterMetric label={isFr ? "À vérifier" : "Review"} value={recipeStats.attention} attention={recipeStats.attention > 0} /></div>}
        <AdminSearchField
          value={query}
          onChange={setQuery}
          label={workspace === "products" ? (isFr ? "Rechercher un produit" : "Search products") : (isFr ? "Rechercher une recette" : "Search recipes")}
          placeholder={workspace === "products" ? (isFr ? "Produit, SKU ou origine" : "Product, SKU or origin") : (isFr ? "Recette, pays ou catégorie" : "Recipe, country or category")}
          resultCount={workspace === "products" ? filteredProducts.length : filteredRecipes.length}
          totalCount={workspace === "products" ? products.length : recipes.length}
          locale={locale}
          surface="muted"
          className="w-full sm:max-w-sm"
        />
      </div>

      {workspace === "recipes" ? <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={isFr ? "Filtrer le registre des recettes" : "Filter recipe register"}>
        <RecipeFilterButton active={recipeFilter === "all"} onClick={() => setRecipeFilter("all")}>{isFr ? "Toutes" : "All"} · {recipes.length}</RecipeFilterButton>
        <RecipeFilterButton active={recipeFilter === "published"} onClick={() => setRecipeFilter("published")}>{isFr ? "Publiées" : "Published"} · {recipeStats.published}</RecipeFilterButton>
        <RecipeFilterButton active={recipeFilter === "draft"} onClick={() => setRecipeFilter("draft")}>{isFr ? "Brouillons" : "Drafts"} · {recipeStats.draft}</RecipeFilterButton>
        <RecipeFilterButton active={recipeFilter === "attention"} onClick={() => setRecipeFilter("attention")}>{isFr ? "À vérifier" : "Review"} · {recipeStats.attention}</RecipeFilterButton>
      </div> : null}

      {workspace === "products" ? (
        filteredProducts.length ? (
          <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader><TableRow><TableHead>{isFr ? "Produit" : "Product"}</TableHead><TableHead>SKU</TableHead><TableHead>{isFr ? "Origine" : "Origin"}</TableHead><TableHead>{isFr ? "Prix" : "Price"}</TableHead><TableHead>{isFr ? "Disponibilité" : "Availability"}</TableHead><TableHead>{isFr ? "Conservation" : "Storage"}</TableHead><TableHead><span className="sr-only">{isFr ? "Actions" : "Actions"}</span></TableHead></TableRow></TableHeader>
                <TableBody>{filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell><div className="flex items-center gap-3"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-charcoal">{product.name}</p><p className="truncate text-[10px] text-muted-foreground">{product.traditionalName}</p><div className="mt-1 flex gap-1">{product.isWholesale ? <Badge variant="outline" className="h-4 border-terre/25 bg-terre/[0.04] px-1 text-[8px] text-terre">{isFr ? "Gros" : "Wholesale"}</Badge> : null}{product.isNew ? <Badge variant="outline" className="h-4 px-1 text-[8px]">{isFr ? "Nouveau" : "New"}</Badge> : null}{product.isRecommended ? <Badge variant="outline" className="h-4 border-burgundy/25 px-1 text-[8px] text-burgundy">{isFr ? "Recommandé" : "Recommended"}</Badge> : null}{product.isBestseller ? <Badge variant="outline" className="h-4 border-gold/50 bg-gold/[0.08] px-1 text-[8px] text-charcoal">{isFr ? "Populaire" : "Popular"}</Badge> : null}</div></div></div></TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-xs">{product.country}</TableCell>
                    <TableCell><p className="font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-0.5 whitespace-nowrap text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "de marge" : "margin"}{product.costSource === "estimated" ? ` · ${isFr ? "estimé" : "estimated"}` : ""}</p> : <p className="mt-0.5 text-[9px] text-muted-foreground">{isFr ? "Ventilation non renseignée" : "Breakdown not recorded"}</p>}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 whitespace-nowrap text-[9px] font-bold text-burgundy">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)} / {product.wholesalePackLabel}</p> : null}</TableCell>
                    <TableCell><Badge variant="outline" className={product.stockQty <= 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : product.stockQty <= (product.alertThreshold || 5) ? "border-gold/40 bg-gold/[0.09] text-charcoal" : "border-burgundy/25 bg-burgundy/[0.04] text-burgundy"}>{product.stockQty <= 0 ? (isFr ? "Rupture" : "Out") : `${product.stockQty} ${isFr ? "en stock" : "in stock"}`}</Badge></TableCell>
                    <TableCell><span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${thermalColor(product.thermalClass)}`}>{thermalLabel(product.thermalClass, locale)}</span></TableCell>
                    <TableCell><div className="flex items-center justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border sm:hidden">{filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 [contain-intrinsic-size:76px] [content-visibility:auto]"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{product.name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.sku} · {thermalLabel(product.thermalClass, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-1 truncate text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "marge" : "margin"}</p> : null}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 truncate text-[9px] font-bold text-burgundy">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)}</p> : null}</div><div className="text-right"><p className="text-xs font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p><p className={`mt-1 text-[10px] font-bold ${product.stockQty ? "text-burgundy" : "text-destructive"}`}>{product.stockQty ? `${product.stockQty} dispo.` : (isFr ? "Rupture" : "Out")}</p><div className="mt-1 flex justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></div></div>
            ))}</div>
          </div>
        ) : <AdminEmptyState icon={<Package className="h-5 w-5" />} title={isFr ? "Aucun produit trouvé" : "No products found"} description={isFr ? "Modifiez la recherche ou enregistrez un nouveau produit." : "Change the search or add a new product."} />
      ) : (
        filteredRecipes.length ? (
          <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" data-testid="admin-recipe-register">
            <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Recette" : "Recipe"}</TableHead><TableHead>{isFr ? "Publication" : "Publication"}</TableHead><TableHead>{isFr ? "Couverture ingrédients" : "Ingredient coverage"}</TableHead><TableHead>{isFr ? "Format" : "Format"}</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{filteredRecipes.map((recipe, index) => <TableRow key={recipe.id} data-testid="admin-recipe-row"><TableCell><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Inspecter ${recipe.title}` : `Inspect ${recipe.title}`} className="flex max-w-md items-center gap-3 text-left"><ProductImage src={recipe.imageUrl || getRecipePhoto(recipe)} alt={recipe.title} emoji={recipe.imageEmoji} color={recipe.imageColor} size="sm" className="h-12 w-16 shrink-0" rounded="rounded-md" priority={index === 0} /><span className="min-w-0"><span className="block truncate text-xs font-black text-charcoal">{recipe.title}</span><span className="mt-0.5 block truncate text-[9px] font-bold uppercase text-terre">{recipe.country} · {recipe.category}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{recipe.description}</span></span></button></TableCell><TableCell><RecipeStatusBadge recipe={recipe} locale={locale} /></TableCell><TableCell><RecipeCoverage recipe={recipe} locale={locale} /></TableCell><TableCell><RecipeFormat recipe={recipe} locale={locale} /></TableCell><TableCell><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Voir la fiche ${recipe.title}` : `View ${recipe.title}`} className="grid h-9 w-9 place-items-center rounded-md border border-border text-terre transition hover:border-terre"><ChevronRight className="h-4 w-4" /></button><EditorialActionsDialog kind="recipe" entity={recipe} locale={locale} onUpdated={recipesRequest.refetch} /></div></TableCell></TableRow>)}</TableBody></Table></div>
            <div className="divide-y divide-border md:hidden">{filteredRecipes.map((recipe, index) => <article key={recipe.id} className="p-3 [contain-intrinsic-size:142px] [content-visibility:auto]" data-testid="admin-recipe-row"><div className="flex items-start gap-3"><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Inspecter ${recipe.title}` : `Inspect ${recipe.title}`} className="flex min-w-0 flex-1 items-start gap-3 text-left"><ProductImage src={recipe.imageUrl || getRecipePhoto(recipe)} alt={recipe.title} emoji={recipe.imageEmoji} color={recipe.imageColor} size="sm" className="h-16 w-20 shrink-0" rounded="rounded-md" priority={index === 0} /><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-black uppercase text-terre">{recipe.country} · {recipe.category}</span><span className="mt-1 block line-clamp-2 text-sm font-black leading-4 text-charcoal">{recipe.title}</span><span className="mt-1 block line-clamp-1 text-[10px] text-muted-foreground">{recipe.description}</span></span></button><EditorialActionsDialog kind="recipe" entity={recipe} locale={locale} onUpdated={recipesRequest.refetch} /></div><div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-charcoal/8 pt-3"><RecipeStatusBadge recipe={recipe} locale={locale} compact /><RecipeCoverage recipe={recipe} locale={locale} compact /><RecipeFormat recipe={recipe} locale={locale} compact /></div></article>)}</div>
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
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Ingrédients liés" : "Linked ingredients"}</h4><div className="mt-3 divide-y divide-border border-y border-border">{recipeDetailsRequest.data.ingredients.map((ingredient) => <div key={ingredient.recipeIngredientId} className="flex items-center gap-3 py-3"><ProductImage src={ingredient.product.imageUrl} alt={isFr ? ingredient.product.nameFr : ingredient.product.nameEn} emoji={ingredient.product.emoji} color={ingredient.product.color} size="sm" className="h-9 w-9 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{isFr ? ingredient.product.nameFr : ingredient.product.nameEn}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{ingredient.quantityPerBase} {ingredient.unit}{ingredient.optional ? ` · ${isFr ? "optionnel" : "optional"}` : ""}</p></div><span className={`text-[10px] font-bold ${ingredient.product.stockQty > 0 ? "text-burgundy" : "text-destructive"}`}>{ingredient.product.stockQty} {isFr ? "dispo." : "avail."}</span></div>)}</div></section>
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Préparation publiée" : "Published preparation"}</h4><ol className="mt-3 space-y-3">{recipeDetailsRequest.data.steps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-terre text-[10px] font-black text-white">{index + 1}</span><p className="pt-1 text-xs leading-5 text-charcoal">{step}</p></li>)}</ol></section>
            </div>
          ) : <AdminErrorState message={recipeDetailsRequest.error} onRetry={recipeDetailsRequest.refetch} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecipeRegisterMetric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="min-w-[4.5rem] px-3 first:pl-0"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className={`mt-0.5 text-base font-black tabular-nums ${attention ? "text-destructive" : "text-charcoal"}`}>{value}</p></div>;
}

function RecipeFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-black transition ${active ? "border-burgundy bg-burgundy text-white" : "border-border bg-white text-charcoal hover:border-burgundy/30"}`}>{children}</button>;
}

function RecipeStatusBadge({ recipe, locale, compact = false }: { recipe: Recipe; locale: "fr" | "en"; compact?: boolean }) {
  if (recipe.status === "draft") return <Badge variant="outline" className="border-gold/50 bg-gold/[0.09] text-[9px] text-charcoal">{locale === "fr" ? "Brouillon" : "Draft"}</Badge>;
  if (recipe.status === "archived") return <Badge variant="outline" className="border-charcoal/15 bg-white text-[9px] text-muted-foreground">{locale === "fr" ? "Archivée" : "Archived"}</Badge>;
  if (compact) {
    const highlights = Number(Boolean(recipe.isNew)) + Number(Boolean(recipe.isRecommended)) + Number(Boolean(recipe.isPopular));
    return <div className="flex flex-col items-start gap-1"><Badge variant="outline" className="border-burgundy/25 bg-burgundy/[0.04] text-[9px] text-burgundy">{locale === "fr" ? "Publiée" : "Published"}</Badge>{highlights > 0 ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-[8px] font-bold text-terre"><Sparkles className="h-3 w-3" />{highlights} {locale === "fr" ? "mise(s) en avant" : "highlight(s)"}</span> : null}</div>;
  }
  return <div className="flex flex-wrap gap-1"><Badge variant="outline" className="border-burgundy/25 bg-burgundy/[0.04] text-[9px] text-burgundy">{locale === "fr" ? "Publiée" : "Published"}</Badge>{recipe.isRecommended ? <Badge className="border-0 bg-burgundy text-[8px] text-white">{locale === "fr" ? "Recommandée" : "Recommended"}</Badge> : null}{recipe.isPopular ? <Badge variant="outline" className="border-terre/25 bg-terre/[0.05] text-[8px] text-terre"><Sparkles className="mr-1 h-3 w-3" />{locale === "fr" ? "Populaire" : "Popular"}</Badge> : null}</div>;
}

function RecipeCoverage({ recipe, locale, compact = false }: { recipe: Recipe; locale: "fr" | "en"; compact?: boolean }) {
  const required = recipe.requiredIngredientCount ?? recipe.ingredientCount;
  const available = recipe.availableIngredientCount ?? required;
  const rate = recipe.stockCoverageRate ?? (required > 0 ? Math.round((available / required) * 100) : 0);
  const attention = recipe.needsAttention ?? rate < 100;
  return <div className={compact ? "min-w-0" : "w-36"}><div className="flex items-center justify-between gap-2 text-[9px] font-bold"><span className={`truncate ${attention ? "text-destructive" : "text-burgundy"}`}>{attention ? (locale === "fr" ? "Stock à compléter" : "Stock gap") : (locale === "fr" ? "Prête à vendre" : "Ready to sell")}</span><span className="shrink-0 tabular-nums text-charcoal">{available}/{required}</span></div><div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} aria-label={locale === "fr" ? `Couverture ingrédients ${rate} %` : `Ingredient coverage ${rate}%`} className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${attention ? "bg-gold" : "bg-burgundy"}`} style={{ width: `${Math.max(0, Math.min(100, rate))}%` }} /></div></div>;
}

function RecipeFormat({ recipe, locale, compact = false }: { recipe: Recipe; locale: "fr" | "en"; compact?: boolean }) {
  return <div className={`flex ${compact ? "flex-col items-end gap-0.5" : "flex-wrap gap-x-3 gap-y-1"} text-[9px] font-bold text-muted-foreground`}><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{recipe.timeMinutes} min</span><span className="inline-flex items-center gap-1"><UsersRound className="h-3 w-3" />{recipe.baseServings} {locale === "fr" ? "pers." : "people"}</span><span className="inline-flex items-center gap-1"><BookOpenCheck className="h-3 w-3" />{recipe.stepCount ?? "—"} {locale === "fr" ? "étapes" : "steps"}</span></div>;
}
