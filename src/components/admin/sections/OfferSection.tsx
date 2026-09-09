"use client";

import { useMemo, useState } from "react";
import { Archive, BookOpen, BookOpenCheck, Boxes, ChefHat, ChevronRight, Clock3, Package, PackageX, PencilLine, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import type { IconFunction } from "reicon/createIcon";
import { ArrowSwapHorizontal as ReArrowSwapHorizontal } from "reicon/icons/ArrowSwapHorizontal";
import { BasketShopping as ReBasketShopping } from "reicon/icons/BasketShopping";
import { BookOpen as ReBookOpen } from "reicon/icons/BookOpen";
import { BoxTick as ReBoxTick } from "reicon/icons/BoxTick";
import { ChefHatHeart as ReChefHatHeart } from "reicon/icons/ChefHatHeart";
import { Image as ReImage } from "reicon/icons/Image";
import { MagicWand as ReMagicWand } from "reicon/icons/MagicWand";
import { ShieldCheck as ReShieldCheck } from "reicon/icons/ShieldCheck";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminRefreshNotice, AdminSearchField, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import { ProductCreateDialog } from "@/components/admin/ProductCreateDialog";
import { RecipeCreateDialog } from "@/components/admin/RecipeCreateDialog";
import { CategoryImageManager } from "@/components/admin/CategoryImageManager";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useFetch } from "@/lib/use-fetch";
import { ADMIN_DATA_TTL_MS } from "@/lib/admin-prefetch";
import { formatPrice, normalize, thermalColor, thermalLabel } from "@/lib/format";
import { ProductImage } from "@/components/shared/ProductImage";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { EditorialActionsDialog } from "@/components/admin/EditorialActionsDialog";

type Product = { id: string; name: string; nameFr: string; nameEn: string; descriptionFr: string; descriptionEn: string; traditionalName: string; sku: string; categoryId: string; packaging: string; costPrice?: number | null; profitMargin?: number | null; costSource?: "recorded" | "estimated"; price: number; promoPrice?: number | null; isWholesale?: boolean; wholesalePackLabel?: string | null; wholesaleUnitsPerPack?: number; wholesaleMinPacks?: number; wholesalePrice?: number | null; wholesaleTier2MinPacks?: number | null; wholesaleTier2Price?: number | null; wholesaleTier3MinPacks?: number | null; wholesaleTier3Price?: number | null; stockQty: number; reservedQty?: number; availableQty?: number; alertThreshold?: number; netWeightGrams: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; aliases?: string[]; isNew?: boolean; isRecommended?: boolean; isBestseller?: boolean; status?: "draft" | "published" | "archived"; thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN"; storageType: "SEC" | "FRAIS" | "REFRIGERE" | "SURGELE" | "FUME" | "SECHE" | "CONSERVE"; country: string };
type Recipe = { id: string; title: string; description?: string; country: string; category: string; difficulty: string; timeMinutes: number; baseServings: number; imageColor: string; imageEmoji: string; imageUrl?: string | null; galleryUrls?: string[]; isPopular: boolean; isNew?: boolean; isRecommended?: boolean; status?: string; ingredientCount: number; requiredIngredientCount?: number; availableIngredientCount?: number; unpublishedIngredientCount?: number; stockCoverageRate?: number; needsAttention?: boolean; stepCount?: number; updatedAt?: string };
type RecipeDetails = Recipe & { steps: string[]; ingredients: Array<{ recipeIngredientId: string; quantityPerBase: number; unit: string; optional: boolean; product: { id: string; traditionalName: string; emoji: string; imageUrl?: string | null; color?: string; nameFr: string; nameEn: string; stockQty: number; reservedQty?: number; availableQty?: number; status?: "draft" | "published" | "archived" } }> };
type ProductFilter = "all" | "published" | "depleted" | "draft" | "archived" | "wholesale";
type RecipeFilter = "all" | "published" | "draft" | "archived" | "attention";
type OfferPilotAction = { key: string; label: string; detail: string; value: number; icon: LucideIcon; tone: "burgundy" | "terre" | "gold" | "destructive"; active: boolean; onClick: () => void };
type RecipeStats = { published: number; draft: number; archived: number; ready: number; attention: number };

export default function OfferSection({ locale, workspace }: { locale: "fr" | "en"; workspace: "products" | "recipes" }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const productsRequest = useFetch<{ products: Product[]; total: number }>(workspace === "products" ? `/api/admin/products?locale=${locale}` : null, [locale, workspace], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });
  const recipesRequest = useFetch<{ recipes: Recipe[] }>(workspace === "recipes" ? `/api/admin/recipes?locale=${locale}` : null, [locale, workspace], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });
  const recipeDetailsRequest = useFetch<RecipeDetails>(selectedRecipe ? `/api/admin/recipes/${selectedRecipe.id}?locale=${locale}` : null, [selectedRecipe?.id, locale], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });

  const products = productsRequest.data?.products || [];
  const recipes = recipesRequest.data?.recipes || [];
  const normalizedQuery = normalize(query);
  const productStats = useMemo(() => ({
    published: products.filter((product) => product.status === "published").length,
    draft: products.filter((product) => product.status === "draft").length,
    archived: products.filter((product) => product.status === "archived").length,
    depleted: products.filter((product) => productAvailableQty(product) <= 0).length,
    wholesale: products.filter((product) => product.isWholesale).length,
  }), [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = normalize(`${product.name} ${product.traditionalName} ${product.sku} ${product.country}`).includes(normalizedQuery);
    const matchesFilter = productFilter === "all"
      || (productFilter === "depleted" ? productAvailableQty(product) <= 0 : productFilter === "wholesale" ? Boolean(product.isWholesale) : product.status === productFilter);
    return matchesQuery && matchesFilter;
  }), [products, normalizedQuery, productFilter]);
  const recipeStats = useMemo<RecipeStats>(() => ({
    published: recipes.filter((recipe) => recipe.status === "published").length,
    draft: recipes.filter((recipe) => recipe.status === "draft").length,
    archived: recipes.filter((recipe) => recipe.status === "archived").length,
    ready: recipes.filter((recipe) => !(recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100))).length,
    attention: recipes.filter((recipe) => recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100)).length,
  }), [recipes]);
  const filteredRecipes = useMemo(() => recipes.filter((recipe) => {
    const matchesQuery = normalize(`${recipe.title} ${recipe.country} ${recipe.category}`).includes(normalizedQuery);
    const needsAttention = recipe.needsAttention ?? ((recipe.stockCoverageRate ?? 100) < 100);
    const matchesFilter = recipeFilter === "all" || (recipeFilter === "attention" ? needsAttention : recipe.status === recipeFilter);
    return matchesQuery && matchesFilter;
  }), [recipes, normalizedQuery, recipeFilter]);
  const productPilotScore = products.length ? Math.round((productStats.published / products.length) * 100) : 0;
  const recipePilotScore = recipes.length ? Math.round((recipeStats.ready / recipes.length) * 100) : 0;
  const productPilotActions: OfferPilotAction[] = [
    { key: "depleted", label: isFr ? "Ruptures" : "Stock outs", detail: isFr ? "Bloquer panier, préparer réassort" : "Block basket, prepare replenishment", value: productStats.depleted, icon: PackageX, tone: "destructive", active: productFilter === "depleted", onClick: () => setProductFilter("depleted") },
    { key: "draft", label: isFr ? "Brouillons" : "Drafts", detail: isFr ? "Compléter fiche, photo et marge" : "Complete record, photo and margin", value: productStats.draft, icon: PencilLine, tone: "gold", active: productFilter === "draft", onClick: () => setProductFilter("draft") },
    { key: "archived", label: isFr ? "Désactivés" : "Disabled", detail: isFr ? "Hors boutique, historique conservé" : "Off store, history preserved", value: productStats.archived, icon: Archive, tone: "terre", active: productFilter === "archived", onClick: () => setProductFilter("archived") },
    { key: "wholesale", label: isFr ? "Gros" : "Wholesale", detail: isFr ? "Lots, cartons et prix dégressifs" : "Packs, cases and tiered prices", value: productStats.wholesale, icon: Boxes, tone: "burgundy", active: productFilter === "wholesale", onClick: () => setProductFilter("wholesale") },
  ];
  const recipePilotActions: OfferPilotAction[] = [
    { key: "attention", label: isFr ? "À vérifier" : "Review", detail: isFr ? "Stock, produit ou préparation à corriger" : "Fix stock, product or preparation", value: recipeStats.attention, icon: PackageX, tone: "destructive", active: recipeFilter === "attention", onClick: () => setRecipeFilter("attention") },
    { key: "published", label: isFr ? "Publiées" : "Published", detail: isFr ? "Disponibles dans l'app client" : "Available in the customer app", value: recipeStats.published, icon: BookOpenCheck, tone: "burgundy", active: recipeFilter === "published", onClick: () => setRecipeFilter("published") },
    { key: "draft", label: isFr ? "Brouillons" : "Drafts", detail: isFr ? "Enrichir étapes, portions et visuels" : "Improve steps, servings and visuals", value: recipeStats.draft, icon: PencilLine, tone: "gold", active: recipeFilter === "draft", onClick: () => setRecipeFilter("draft") },
    { key: "archived", label: isFr ? "Désactivées" : "Disabled", detail: isFr ? "Retirées sans perte de traçabilité" : "Removed without losing traceability", value: recipeStats.archived, icon: Archive, tone: "terre", active: recipeFilter === "archived", onClick: () => setRecipeFilter("archived") },
  ];

  const activeRequest = workspace === "products" ? productsRequest : recipesRequest;
  if (activeRequest.loading && !activeRequest.data) return <AdminSectionLoading label={isFr ? "Ouverture de l'offre" : "Opening offer workspace"} />;
  if (activeRequest.error && !activeRequest.data) return <AdminErrorState locale={locale} message={activeRequest.error} onRetry={activeRequest.refetch} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent={workspace === "products" ? "#8A3042" : "#F2A900"}
        icon={workspace === "products" ? <Package className="h-5 w-5" /> : <ChefHat className="h-5 w-5" />}
        eyebrow={workspace === "products" ? (isFr ? "Référentiel marchand" : "Commerce master data") : (isFr ? "Atelier culinaire" : "Culinary workshop")}
        title={workspace === "products" ? (isFr ? "Ce qui est réellement vendu" : "What is actually sold") : (isFr ? "Construire des recettes achetables" : "Build shoppable recipes")}
        description={workspace === "products" ? (isFr ? "Pilotez les fiches, prix, marges et disponibilités produit." : "Control product records, prices, margins and availability.") : (isFr ? "Ordonnez les étapes, reliez le stock et maîtrisez les portions." : "Sequence steps, link stock and control customer servings.")}
        signals={workspace === "products" ? [
          { label: isFr ? "Publiés" : "Published", value: String(productStats.published), icon: <BookOpenCheck className="h-3.5 w-3.5" />, tone: "burgundy" },
          { label: isFr ? "Ruptures" : "Stock outs", value: String(productStats.depleted), icon: <PackageX className="h-3.5 w-3.5" />, tone: productStats.depleted ? "gold" : "earth" },
          { label: isFr ? "Gros" : "Wholesale", value: String(productStats.wholesale), icon: <Boxes className="h-3.5 w-3.5" />, tone: "earth" },
        ] : [
          { label: isFr ? "Publiées" : "Published", value: String(recipeStats.published), icon: <BookOpenCheck className="h-3.5 w-3.5" />, tone: "burgundy" },
          { label: isFr ? "Prêtes" : "Ready", value: String(recipeStats.ready), icon: <ChefHat className="h-3.5 w-3.5" />, tone: "gold" },
          { label: isFr ? "À vérifier" : "Review", value: String(recipeStats.attention), icon: <PackageX className="h-3.5 w-3.5" />, tone: recipeStats.attention ? "gold" : "earth" },
        ]}
        flow={workspace === "products" ? [
          { label: isFr ? "Ficher" : "Record", detail: isFr ? "Photo, nom, origine" : "Photo, name, origin", icon: <ReiconGlyph icon={ReImage} weight="Filled" className="h-3.5 w-3.5" />, tone: "burgundy", active: productFilter === "draft" },
          { label: isFr ? "Chiffrer" : "Price", detail: isFr ? "Coût brut, marge, prix" : "Cost, margin, price", icon: <ReiconGlyph icon={ReShieldCheck} weight="Filled" className="h-3.5 w-3.5" />, tone: "earth", active: productFilter === "published" },
          { label: isFr ? "Publier" : "Publish", detail: isFr ? "Client, stock, gros" : "Retail, stock, wholesale", icon: <ReiconGlyph icon={ReBasketShopping} weight="Filled" className="h-3.5 w-3.5" />, tone: "gold", active: productFilter === "wholesale" },
          { label: isFr ? "Arbitrer" : "Control", detail: isFr ? "Rupture ou désactivation" : "Stock out or disable", icon: <ReiconGlyph icon={ReBoxTick} weight="Filled" className="h-3.5 w-3.5" />, tone: "coral", active: productFilter === "depleted" || productFilter === "archived" },
        ] : [
          { label: isFr ? "Composer" : "Compose", detail: isFr ? "Ingrédients liés" : "Linked ingredients", icon: <ReiconGlyph icon={ReChefHatHeart} weight="Filled" className="h-3.5 w-3.5" />, tone: "burgundy", active: recipeFilter === "draft" },
          { label: isFr ? "Remplacer" : "Substitute", detail: isFr ? "Options de panier" : "Basket options", icon: <ReiconGlyph icon={ReArrowSwapHorizontal} weight="Filled" className="h-3.5 w-3.5" />, tone: "earth", active: recipeFilter === "attention" },
          { label: isFr ? "Détailler" : "Guide", detail: isFr ? "Étapes et portions" : "Steps and servings", icon: <ReiconGlyph icon={ReMagicWand} weight="Filled" className="h-3.5 w-3.5" />, tone: "gold", active: recipeFilter === "published" },
          { label: isFr ? "Rendre achetable" : "Make shoppable", detail: isFr ? "Panier modifiable" : "Editable basket", icon: <ReiconGlyph icon={ReBookOpen} weight="Filled" className="h-3.5 w-3.5" />, tone: "coral", active: recipeFilter === "all" },
        ]}
        flowDensity="compact"
        signalsMobile={false}
        action={workspace === "products" ? <ProductCreateDialog locale={locale} onCreated={productsRequest.refetch} /> : <RecipeCreateDialog locale={locale} onCreated={recipesRequest.refetch} />}
      />

      {activeRequest.error && activeRequest.data ? <AdminRefreshNotice locale={locale} message={activeRequest.error} onRetry={activeRequest.refetch} /> : null}

      {workspace === "products" ? <CategoryImageManager locale={locale} /> : null}

      <div className="flex flex-col gap-3 border-y border-charcoal/8 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {workspace === "products" ? <div className="grid grid-cols-4 divide-x divide-charcoal/8"><RegisterMetric label={isFr ? "Publiés" : "Published"} value={productStats.published} /><RegisterMetric label={isFr ? "Rupture" : "Out"} value={productStats.depleted} attention={productStats.depleted > 0} /><RegisterMetric label={isFr ? "Brouillons" : "Drafts"} value={productStats.draft} /><RegisterMetric label={isFr ? "Désactivés" : "Disabled"} value={productStats.archived} /></div> : <div className="grid grid-cols-4 divide-x divide-charcoal/8"><RegisterMetric label={isFr ? "Publiées" : "Published"} value={recipeStats.published} /><RegisterMetric label={isFr ? "Prêtes" : "Ready"} value={recipeStats.ready} /><RegisterMetric label={isFr ? "À vérifier" : "Review"} value={recipeStats.attention} attention={recipeStats.attention > 0} /><RegisterMetric label={isFr ? "Désactivées" : "Disabled"} value={recipeStats.archived} /></div>}
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

      {workspace === "products" ? <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={isFr ? "Filtrer le registre des produits" : "Filter product register"}>
        <RegisterFilterButton active={productFilter === "all"} onClick={() => setProductFilter("all")}>{isFr ? "Tous" : "All"} · {products.length}</RegisterFilterButton>
        <RegisterFilterButton active={productFilter === "published"} onClick={() => setProductFilter("published")}>{isFr ? "Publiés" : "Published"} · {productStats.published}</RegisterFilterButton>
        <RegisterFilterButton active={productFilter === "depleted"} onClick={() => setProductFilter("depleted")}>{isFr ? "Stock épuisé" : "Out of stock"} · {productStats.depleted}</RegisterFilterButton>
        <RegisterFilterButton active={productFilter === "draft"} onClick={() => setProductFilter("draft")}>{isFr ? "Brouillons" : "Drafts"} · {productStats.draft}</RegisterFilterButton>
        <RegisterFilterButton active={productFilter === "archived"} onClick={() => setProductFilter("archived")}>{isFr ? "Désactivés" : "Disabled"} · {productStats.archived}</RegisterFilterButton>
        <RegisterFilterButton active={productFilter === "wholesale"} onClick={() => setProductFilter("wholesale")}>{isFr ? "Gros" : "Wholesale"} · {productStats.wholesale}</RegisterFilterButton>
      </div> : null}

      {workspace === "recipes" ? <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={isFr ? "Filtrer le registre des recettes" : "Filter recipe register"}>
        <RegisterFilterButton active={recipeFilter === "all"} onClick={() => setRecipeFilter("all")}>{isFr ? "Toutes" : "All"} · {recipes.length}</RegisterFilterButton>
        <RegisterFilterButton active={recipeFilter === "published"} onClick={() => setRecipeFilter("published")}>{isFr ? "Publiées" : "Published"} · {recipeStats.published}</RegisterFilterButton>
        <RegisterFilterButton active={recipeFilter === "draft"} onClick={() => setRecipeFilter("draft")}>{isFr ? "Brouillons" : "Drafts"} · {recipeStats.draft}</RegisterFilterButton>
        <RegisterFilterButton active={recipeFilter === "archived"} onClick={() => setRecipeFilter("archived")}>{isFr ? "Désactivées" : "Disabled"} · {recipeStats.archived}</RegisterFilterButton>
        <RegisterFilterButton active={recipeFilter === "attention"} onClick={() => setRecipeFilter("attention")}>{isFr ? "À vérifier" : "Review"} · {recipeStats.attention}</RegisterFilterButton>
      </div> : null}

      {workspace === "recipes" ? (
        <RecipeClientMirror locale={locale} recipes={recipes} stats={recipeStats} onFilter={setRecipeFilter} />
      ) : null}

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="order-2 sm:order-1">
          <OfferPilotStrip
            locale={locale}
            title={workspace === "products" ? (isFr ? "Pilotage marchand" : "Commerce cockpit") : (isFr ? "Pilotage culinaire" : "Culinary cockpit")}
            scoreLabel={workspace === "products" ? (isFr ? "Fiches publiées" : "Published records") : (isFr ? "Recettes prêtes" : "Ready recipes")}
            score={workspace === "products" ? productPilotScore : recipePilotScore}
            scoreDetail={workspace === "products"
              ? (isFr ? `${productStats.published}/${products.length || 0} produits visibles côté client` : `${productStats.published}/${products.length || 0} products visible to customers`)
              : (isFr ? `${recipeStats.ready}/${recipes.length || 0} recettes achetables sans alerte` : `${recipeStats.ready}/${recipes.length || 0} recipes shoppable without alerts`)}
            actions={workspace === "products" ? productPilotActions : recipePilotActions}
            hasActiveFilter={workspace === "products" ? productFilter !== "all" : recipeFilter !== "all"}
            resetLabel={workspace === "products" ? (isFr ? "Voir tous les produits" : "View all products") : (isFr ? "Voir toutes les recettes" : "View all recipes")}
            onReset={() => { if (workspace === "products") setProductFilter("all"); else setRecipeFilter("all"); }}
          />
        </div>

        <div className="order-1 sm:order-2">
          {workspace === "products" ? (
        filteredProducts.length ? (
          <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader><TableRow><TableHead>{isFr ? "Produit" : "Product"}</TableHead><TableHead>SKU</TableHead><TableHead>{isFr ? "Origine" : "Origin"}</TableHead><TableHead>{isFr ? "Prix" : "Price"}</TableHead><TableHead>{isFr ? "Disponibilité" : "Availability"}</TableHead><TableHead>{isFr ? "Conservation" : "Storage"}</TableHead><TableHead><span className="sr-only">{isFr ? "Actions" : "Actions"}</span></TableHead></TableRow></TableHeader>
                <TableBody>{filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell><div className="flex items-center gap-3"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-charcoal">{product.name}</p><p className="truncate text-[10px] text-muted-foreground">{product.traditionalName}</p><div className="mt-1 flex flex-wrap gap-1"><ProductStatusBadge product={product} locale={locale} />{product.isWholesale ? <Badge variant="outline" className="h-4 border-terre/25 bg-terre/[0.04] px-1 text-[8px] text-terre">{isFr ? "Gros" : "Wholesale"}</Badge> : null}{product.isNew ? <Badge variant="outline" className="h-4 px-1 text-[8px]">{isFr ? "Nouveau" : "New"}</Badge> : null}{product.isRecommended ? <Badge variant="outline" className="h-4 border-burgundy/25 px-1 text-[8px] text-burgundy">{isFr ? "Recommandé" : "Recommended"}</Badge> : null}{product.isBestseller ? <Badge variant="outline" className="h-4 border-gold/50 bg-gold/[0.08] px-1 text-[8px] text-charcoal">{isFr ? "Populaire" : "Popular"}</Badge> : null}</div></div></div></TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-xs">{product.country}</TableCell>
                    <TableCell><p className="font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-0.5 whitespace-nowrap text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "de marge" : "margin"}{product.costSource === "estimated" ? ` · ${isFr ? "estimé" : "estimated"}` : ""}</p> : <p className="mt-0.5 text-[9px] text-muted-foreground">{isFr ? "Ventilation non renseignée" : "Breakdown not recorded"}</p>}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 whitespace-nowrap text-[9px] font-bold text-burgundy">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)} / {product.wholesalePackLabel}</p> : null}</TableCell>
                    <TableCell><ProductAvailability product={product} locale={locale} /></TableCell>
                    <TableCell><span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${thermalColor(product.thermalClass)}`}>{thermalLabel(product.thermalClass, locale)}</span></TableCell>
                    <TableCell><div className="flex items-center justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="divide-y divide-border sm:hidden">{filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 [contain-intrinsic-size:86px] [content-visibility:auto]"><ProductImage src={product.imageUrl || getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate text-sm font-extrabold">{product.name}</p><ProductStatusBadge product={product} locale={locale} /></div><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.sku} · {thermalLabel(product.thermalClass, locale)}</p>{product.costPrice !== null && product.costPrice !== undefined && product.profitMargin !== null && product.profitMargin !== undefined ? <p className="mt-1 truncate text-[9px] text-muted-foreground">{formatPrice(product.costPrice, locale)} + {formatPrice(product.profitMargin, locale)} {isFr ? "marge" : "margin"}</p> : null}{product.isWholesale && product.wholesalePrice ? <p className="mt-1 truncate text-[9px] font-bold text-burgundy">{isFr ? "Gros" : "Wholesale"} · {formatPrice(product.wholesalePrice, locale)}</p> : null}</div><div className="text-right"><p className="text-xs font-extrabold text-terre">{formatPrice(product.promoPrice || product.price, locale)}</p><ProductAvailability product={product} locale={locale} compact /><div className="mt-1 flex justify-end gap-1"><ProductCreateDialog locale={locale} product={product} onCreated={productsRequest.refetch} /><EditorialActionsDialog kind="product" entity={{ ...product, title: product.name }} locale={locale} onUpdated={productsRequest.refetch} /></div></div></div>
            ))}</div>
          </div>
        ) : <AdminEmptyState icon={<Package className="h-5 w-5" />} title={isFr ? "Aucun produit trouvé" : "No products found"} description={isFr ? "Modifiez la recherche ou enregistrez un nouveau produit." : "Change the search or add a new product."} />
      ) : (
        filteredRecipes.length ? (
          <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" data-testid="admin-recipe-register">
            <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Recette" : "Recipe"}</TableHead><TableHead>{isFr ? "Publication" : "Publication"}</TableHead><TableHead>{isFr ? "Couverture ingrédients" : "Ingredient coverage"}</TableHead><TableHead>{isFr ? "Format" : "Format"}</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{filteredRecipes.map((recipe, index) => <TableRow key={recipe.id} data-testid="admin-recipe-row"><TableCell><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Inspecter ${recipe.title}` : `Inspect ${recipe.title}`} className="flex max-w-md items-center gap-3 text-left"><ProductImage src={recipe.imageUrl || getRecipePhoto(recipe)} alt={recipe.title} emoji={recipe.imageEmoji} color={recipe.imageColor} size="sm" className="h-12 w-16 shrink-0" rounded="rounded-md" priority={index === 0} /><span className="min-w-0"><span className="block truncate text-xs font-black text-charcoal">{recipe.title}</span><span className="mt-0.5 block truncate text-[9px] font-bold uppercase text-terre">{recipe.country} · {recipe.category}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{recipe.description}</span></span></button></TableCell><TableCell><RecipeStatusBadge recipe={recipe} locale={locale} /></TableCell><TableCell><RecipeCoverage recipe={recipe} locale={locale} /></TableCell><TableCell><RecipeFormat recipe={recipe} locale={locale} /></TableCell><TableCell><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Voir la fiche ${recipe.title}` : `View ${recipe.title}`} className="grid h-9 w-9 place-items-center rounded-md border border-border text-terre transition hover:border-terre"><ChevronRight className="h-4 w-4" /></button><RecipeCreateDialog locale={locale} recipe={recipe} onCreated={recipesRequest.refetch} /><EditorialActionsDialog kind="recipe" entity={recipe} locale={locale} onUpdated={recipesRequest.refetch} /></div></TableCell></TableRow>)}</TableBody></Table></div>
            <div className="divide-y divide-border md:hidden">{filteredRecipes.map((recipe, index) => <article key={recipe.id} className="p-3 [contain-intrinsic-size:142px] [content-visibility:auto]" data-testid="admin-recipe-row"><div className="flex items-start gap-3"><button type="button" onClick={() => setSelectedRecipe(recipe)} aria-label={isFr ? `Inspecter ${recipe.title}` : `Inspect ${recipe.title}`} className="flex min-w-0 flex-1 items-start gap-3 text-left"><ProductImage src={recipe.imageUrl || getRecipePhoto(recipe)} alt={recipe.title} emoji={recipe.imageEmoji} color={recipe.imageColor} size="sm" className="h-16 w-20 shrink-0" rounded="rounded-md" priority={index === 0} /><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-black uppercase text-terre">{recipe.country} · {recipe.category}</span><span className="mt-1 block line-clamp-2 text-sm font-black leading-4 text-charcoal">{recipe.title}</span><span className="mt-1 block line-clamp-1 text-[10px] text-muted-foreground">{recipe.description}</span></span></button><div className="flex shrink-0 gap-1"><RecipeCreateDialog locale={locale} recipe={recipe} onCreated={recipesRequest.refetch} /><EditorialActionsDialog kind="recipe" entity={recipe} locale={locale} onUpdated={recipesRequest.refetch} /></div></div><div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-charcoal/8 pt-3"><RecipeStatusBadge recipe={recipe} locale={locale} compact /><RecipeCoverage recipe={recipe} locale={locale} compact /><RecipeFormat recipe={recipe} locale={locale} compact /></div></article>)}</div>
          </div>
        ) : <AdminEmptyState icon={<BookOpen className="h-5 w-5" />} title={isFr ? "Aucune recette trouvée" : "No recipes found"} description={isFr ? "Essayez un plat, un pays ou une catégorie différente." : "Try another dish, country or category."} />
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedRecipe)} onOpenChange={(open) => { if (!open) setSelectedRecipe(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-[10px] font-extrabold uppercase text-terre">{selectedRecipe?.country} · {selectedRecipe?.category}</p>
            <DialogTitle className="pr-8 text-xl font-black text-charcoal">{selectedRecipe?.title}</DialogTitle>
            <DialogDescription>{selectedRecipe?.description}</DialogDescription>
          </DialogHeader>
          {recipeDetailsRequest.loading && !recipeDetailsRequest.data ? <AdminSectionLoading label={isFr ? "Lecture de la recette" : "Reading recipe"} /> : recipeDetailsRequest.data ? (
            <>
              {recipeDetailsRequest.error ? <div className="px-5 pt-5 sm:px-6"><AdminRefreshNotice locale={locale} message={recipeDetailsRequest.error} onRetry={recipeDetailsRequest.refetch} /></div> : null}
              <RecipeDetailReadiness recipe={recipeDetailsRequest.data} locale={locale} />
              <div className="grid gap-6 px-5 py-6 md:grid-cols-[0.82fr_1.18fr] sm:px-6">
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{isFr ? "Ingrédients liés" : "Linked ingredients"}</h4><div className="mt-3 divide-y divide-border border-y border-border">{recipeDetailsRequest.data.ingredients.map((ingredient) => { const available = ingredient.product.availableQty ?? ingredient.product.stockQty; const published = ingredient.product.status === "published"; return <div key={ingredient.recipeIngredientId} className="flex items-center gap-3 py-3"><ProductImage src={ingredient.product.imageUrl} alt={isFr ? ingredient.product.nameFr : ingredient.product.nameEn} emoji={ingredient.product.emoji} color={ingredient.product.color} size="sm" className="h-9 w-9 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-charcoal">{isFr ? ingredient.product.nameFr : ingredient.product.nameEn}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{ingredient.quantityPerBase} {ingredient.unit}{ingredient.optional ? ` · ${isFr ? "optionnel" : "optional"}` : ""}</p></div><span className={`text-right text-[10px] font-bold ${published && available > 0 ? "text-burgundy" : "text-destructive"}`}>{published ? `${available} ${isFr ? "dispo." : "avail."}` : (isFr ? "À publier" : "Publish first")}</span></div>; })}</div></section>
              <section><h4 className="text-xs font-extrabold uppercase text-muted-foreground">{recipeDetailsRequest.data.status === "published" ? (isFr ? "Préparation publiée" : "Published preparation") : (isFr ? "Préparation enregistrée" : "Recorded preparation")}</h4><ol className="mt-3 space-y-3">{recipeDetailsRequest.data.steps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-terre text-[10px] font-black text-white">{index + 1}</span><p className="pt-1 text-xs leading-5 text-charcoal">{step}</p></li>)}</ol></section>
              </div>
            </>
          ) : <AdminErrorState compact locale={locale} message={recipeDetailsRequest.error} onRetry={recipeDetailsRequest.refetch} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function productAvailableQty(product: Pick<Product, "stockQty" | "reservedQty" | "availableQty">) {
  return product.availableQty ?? Math.max(0, product.stockQty - (product.reservedQty || 0));
}

function RegisterMetric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className="min-w-0 px-1.5 sm:min-w-[4.5rem] sm:px-3 sm:first:pl-0"><p className="min-h-5 break-words text-[7px] font-black uppercase leading-2.5 text-muted-foreground sm:min-h-0 sm:truncate sm:text-[8px] sm:leading-normal">{label}</p><p className={`mt-0.5 text-base font-black tabular-nums ${attention ? "text-destructive" : "text-charcoal"}`}>{value}</p></div>;
}

function ProductAvailability({ product, locale, compact = false }: { product: Product; locale: "fr" | "en"; compact?: boolean }) {
  const available = productAvailableQty(product);
  const reserved = product.reservedQty || 0;
  const label = available <= 0 ? (locale === "fr" ? "Rupture" : "Out") : `${available} ${locale === "fr" ? "disponibles" : "available"}`;
  if (compact) return <div className="mt-1"><p className={`text-[10px] font-bold ${available > 0 ? "text-burgundy" : "text-destructive"}`}>{label}</p>{reserved > 0 ? <p className="text-[8px] text-muted-foreground">{reserved} {locale === "fr" ? "réservés" : "reserved"}</p> : null}</div>;
  return <div><Badge variant="outline" className={available <= 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : available <= (product.alertThreshold || 5) ? "border-gold/40 bg-gold/[0.09] text-charcoal" : "border-burgundy/25 bg-burgundy/[0.04] text-burgundy"}>{label}</Badge><p className="mt-1 whitespace-nowrap text-[8px] text-muted-foreground">{product.stockQty} {locale === "fr" ? "physiques" : "on hand"}{reserved > 0 ? ` · ${reserved} ${locale === "fr" ? "réservés" : "reserved"}` : ""}</p></div>;
}

function ProductStatusBadge({ product, locale }: { product: Product; locale: "fr" | "en" }) {
  if (product.status === "draft") return <Badge variant="outline" className="h-4 shrink-0 border-gold/50 bg-gold/[0.09] px-1 text-[8px] text-charcoal">{locale === "fr" ? "Brouillon" : "Draft"}</Badge>;
  if (product.status === "archived") return <Badge variant="outline" className="h-4 shrink-0 border-charcoal/15 bg-white px-1 text-[8px] text-muted-foreground">{locale === "fr" ? "Désactivé" : "Disabled"}</Badge>;
  if (productAvailableQty(product) <= 0) return <Badge variant="outline" className="h-4 shrink-0 border-destructive/30 bg-destructive/[0.06] px-1 text-[8px] text-destructive">{locale === "fr" ? "Stock épuisé" : "Out of stock"}</Badge>;
  return <Badge variant="outline" className="h-4 shrink-0 border-burgundy/25 bg-burgundy/[0.04] px-1 text-[8px] text-burgundy">{locale === "fr" ? "Publié" : "Published"}</Badge>;
}

function RegisterFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-black transition ${active ? "border-burgundy bg-burgundy text-white" : "border-border bg-white text-charcoal hover:border-burgundy/30"}`}>{children}</button>;
}

function OfferPilotStrip({ locale, title, scoreLabel, score, scoreDetail, actions, hasActiveFilter, resetLabel, onReset }: { locale: "fr" | "en"; title: string; scoreLabel: string; score: number; scoreDetail: string; actions: OfferPilotAction[]; hasActiveFilter: boolean; resetLabel: string; onReset: () => void }) {
  return (
    <section data-testid="offer-pilot-strip" className="overflow-hidden border-y border-burgundy/10 bg-[linear-gradient(135deg,#FFFCFA,rgba(214,90,50,0.045),rgba(242,169,0,0.075))]" aria-label={title}>
      <div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(12rem,0.9fr)_minmax(0,1.6fr)] sm:px-4 sm:py-4">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase text-burgundy">{title}</p>
            {hasActiveFilter ? <button type="button" onClick={onReset} className="shrink-0 text-[9px] font-black uppercase text-terre hover:underline">{resetLabel}</button> : null}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <strong className="text-2xl font-black tabular-nums text-charcoal">{score}%</strong>
            <span className="pb-1 text-[10px] font-black uppercase text-muted-foreground">{scoreLabel}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white shadow-inner" role="progressbar" aria-label={scoreLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#8A3042,#D65A32,#F2A900)]" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{scoreDetail}</p>
        </div>
        <div className="-mx-3 flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {actions.map((action) => <OfferPilotButton key={action.key} action={action} locale={locale} />)}
        </div>
      </div>
    </section>
  );
}

function OfferPilotButton({ action, locale }: { action: OfferPilotAction; locale: "fr" | "en" }) {
  const Icon = action.icon;
  const toneClass = action.tone === "destructive"
    ? "border-destructive/25 bg-white text-destructive"
    : action.tone === "gold"
      ? "border-gold/45 bg-white text-gold"
      : action.tone === "terre"
        ? "border-terre/24 bg-white text-terre"
        : "border-burgundy/20 bg-white text-burgundy";
  const activeClass = action.active ? "ring-2 ring-terre/20 shadow-[0_14px_28px_-24px_rgba(90,38,50,0.8)]" : "hover:border-burgundy/25 hover:shadow-[0_14px_28px_-26px_rgba(90,38,50,0.55)]";
  return (
    <button type="button" onClick={action.onClick} aria-pressed={action.active} aria-label={`${action.label}, ${action.value} ${locale === "fr" ? "éléments" : "items"}`} data-testid={`offer-pilot-action-${action.key}`} className={`flex min-h-[4.8rem] w-[9.6rem] shrink-0 snap-start flex-col justify-between rounded-md border px-3 py-2.5 text-left transition sm:w-auto ${toneClass} ${activeClass}`}>
      <span className="flex items-start justify-between gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-current/10"><Icon className="h-4 w-4" /></span>
        <strong className="text-lg font-black tabular-nums text-charcoal">{action.value}</strong>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black text-charcoal">{action.label}</span>
        <span className="mt-0.5 block line-clamp-2 text-[9px] leading-3 text-muted-foreground">{action.detail}</span>
      </span>
    </button>
  );
}

function RecipeClientMirror({ locale, recipes, stats, onFilter }: { locale: "fr" | "en"; recipes: Recipe[]; stats: RecipeStats; onFilter: (filter: RecipeFilter) => void }) {
  const isFr = locale === "fr";
  const total = recipes.length;
  const averageCoverage = total
    ? Math.round(recipes.reduce((sum, recipe) => {
      const required = recipe.requiredIngredientCount ?? recipe.ingredientCount;
      const available = recipe.availableIngredientCount ?? required;
      return sum + (recipe.stockCoverageRate ?? (required > 0 ? Math.round((available / required) * 100) : 0));
    }, 0) / total)
    : 0;
  const averageSteps = total ? Math.round(recipes.reduce((sum, recipe) => sum + Number(recipe.stepCount || 0), 0) / total) : 0;
  const missingImages = recipes.filter((recipe) => !recipe.imageUrl).length;
  const cards = [
    {
      icon: ReShieldCheck,
      label: isFr ? "Prêtes client" : "Customer ready",
      value: `${stats.ready}/${total}`,
      detail: stats.attention > 0 ? (isFr ? "corriger avant vitrine" : "fix before storefront") : (isFr ? "vitrine exploitable" : "storefront usable"),
      tone: stats.attention > 0 ? "gold" : "burgundy",
      onClick: () => onFilter(stats.attention > 0 ? "attention" : "all"),
    },
    {
      icon: ReBoxTick,
      label: isFr ? "Stock lié" : "Linked stock",
      value: `${averageCoverage}%`,
      detail: isFr ? "ingrédients achetables" : "shoppable ingredients",
      tone: averageCoverage < 100 ? "gold" : "terre",
      onClick: () => onFilter("attention"),
    },
    {
      icon: ReMagicWand,
      label: isFr ? "Préparation enrichie" : "Enriched method",
      value: String(averageSteps),
      detail: isFr ? "étapes moyennes" : "average steps",
      tone: "burgundy",
      onClick: () => onFilter("published"),
    },
    {
      icon: ReBasketShopping,
      label: isFr ? "Panier modifiable" : "Editable basket",
      value: String(stats.published),
      detail: missingImages > 0 ? (isFr ? `${missingImages} visuel(s) à charger` : `${missingImages} image(s) to upload`) : (isFr ? "photos prêtes partout" : "images ready everywhere"),
      tone: missingImages > 0 ? "gold" : "terre",
      onClick: () => onFilter("published"),
    },
  ] as const;

  return (
    <section className="overflow-hidden border-y border-burgundy/10 bg-[linear-gradient(118deg,#FFFFFF_0%,#FFF8F4_55%,#FFF3E5_100%)]" aria-labelledby="recipe-client-mirror-title" data-testid="admin-recipe-client-mirror">
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre text-white shadow-[0_14px_28px_-20px_rgba(214,90,50,0.95)]"><ReiconGlyph icon={ReChefHatHeart} weight="Filled" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Miroir client" : "Customer mirror"}</p>
          <h3 id="recipe-client-mirror-title" className="mt-0.5 text-sm font-black leading-5 text-charcoal">{isFr ? "Ce que l'application client pourra vraiment vendre" : "What the customer app can actually sell"}</h3>
          <p className="mt-1 max-w-3xl text-[10px] leading-4 text-muted-foreground">{isFr ? "Le registre relie publication, stock, visuels, préparation et panier généré. Une alerte ici bloque la promesse client avant mise en avant." : "The register links publication, stock, imagery, cooking guidance and generated basket. Alerts here protect the customer promise before promotion."}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-burgundy/8 border-t border-burgundy/10 bg-white/72 md:grid-cols-4 md:divide-y-0">
        {cards.map((card) => <RecipeClientMirrorTile key={card.label} {...card} />)}
      </div>
    </section>
  );
}

function RecipeClientMirrorTile({ icon, label, value, detail, tone, onClick }: { icon: IconFunction; label: string; value: string; detail: string; tone: "burgundy" | "terre" | "gold"; onClick: () => void }) {
  const toneClass = tone === "gold" ? "bg-gold/18 text-charcoal" : tone === "terre" ? "bg-terre/[0.08] text-terre" : "bg-burgundy/[0.07] text-burgundy";
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[4.85rem] min-w-0 items-center gap-2.5 px-3 py-3 text-left transition hover:bg-terre/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/35">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${toneClass}`}><ReiconGlyph icon={icon} weight="Filled" className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block truncate text-[8px] font-black uppercase text-muted-foreground">{label}</span>
        <strong className="mt-0.5 block truncate text-sm font-black tabular-nums text-charcoal">{value}</strong>
        <span className="mt-0.5 block line-clamp-2 text-[9px] font-semibold leading-3 text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function RecipeDetailReadiness({ recipe, locale }: { recipe: RecipeDetails; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const ingredientCount = recipe.ingredients.length;
  const publishedIngredients = recipe.ingredients.filter((ingredient) => ingredient.product.status === "published").length;
  const availableIngredients = recipe.ingredients.filter((ingredient) => {
    const available = ingredient.product.availableQty ?? ingredient.product.stockQty;
    return ingredient.product.status === "published" && available > 0;
  }).length;
  const blockers = recipe.ingredients.filter((ingredient) => ingredient.product.status !== "published" || (ingredient.product.availableQty ?? ingredient.product.stockQty) <= 0).length;
  const ready = recipe.status === "published" && blockers === 0 && recipe.steps.length > 0;
  return (
    <section className={`border-b px-5 py-4 sm:px-6 ${ready ? "border-burgundy/12 bg-burgundy/[0.025]" : "border-gold/35 bg-gold/[0.075]"}`} aria-labelledby="recipe-detail-readiness-title" data-testid="recipe-client-readiness">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-white ${ready ? "bg-burgundy" : "bg-terre"}`}><ReiconGlyph icon={ready ? ReShieldCheck : ReMagicWand} weight="Filled" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Miroir client" : "Customer mirror"}</p>
          <h4 id="recipe-detail-readiness-title" className="mt-0.5 text-sm font-black text-charcoal">{ready ? (isFr ? "Recette prête pour la vitrine et le panier" : "Recipe ready for storefront and basket") : (isFr ? "Points à régler avant mise en avant" : "Resolve before promotion")}</h4>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Cette synthèse montre exactement ce que la plateforme client pourra afficher, calculer et vendre." : "This summary shows exactly what the customer app can display, calculate and sell."}</p>
        </div>
        <Badge variant="outline" className={ready ? "border-burgundy/25 bg-white text-burgundy" : "border-gold/45 bg-white text-charcoal"}>{ready ? (isFr ? "Prête" : "Ready") : (isFr ? `${blockers} alerte(s)` : `${blockers} alert(s)`)}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-burgundy/8 border-y border-burgundy/10 bg-white text-center sm:grid-cols-4 sm:divide-y-0">
        <RecipeReadinessMetric icon={ReImage} label={isFr ? "Visuel" : "Visual"} value={recipe.imageUrl ? (isFr ? "chargé" : "uploaded") : (isFr ? "à charger" : "missing")} />
        <RecipeReadinessMetric icon={ReBoxTick} label={isFr ? "Produits liés" : "Linked products"} value={`${availableIngredients}/${ingredientCount}`} />
        <RecipeReadinessMetric icon={ReBookOpen} label={isFr ? "Méthode guidée" : "Guided method"} value={`${recipe.steps.length} ${isFr ? "étapes" : "steps"}`} />
        <RecipeReadinessMetric icon={ReBasketShopping} label={isFr ? "Panier client" : "Client basket"} value={publishedIngredients === ingredientCount ? (isFr ? "modifiable" : "editable") : (isFr ? `${ingredientCount - publishedIngredients} produit à publier` : `${ingredientCount - publishedIngredients} product to publish`)} />
      </div>
    </section>
  );
}

function RecipeReadinessMetric({ icon, label, value }: { icon: IconFunction; label: string; value: string }) {
  return <div className="min-w-0 px-2 py-2.5"><ReiconGlyph icon={icon} weight="Filled" className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-[10px] font-black text-charcoal">{value}</p></div>;
}

function RecipeStatusBadge({ recipe, locale, compact = false }: { recipe: Recipe; locale: "fr" | "en"; compact?: boolean }) {
  if (recipe.status === "draft") return <Badge variant="outline" className="border-gold/50 bg-gold/[0.09] text-[9px] text-charcoal">{locale === "fr" ? "Brouillon" : "Draft"}</Badge>;
  if (recipe.status === "archived") return <Badge variant="outline" className="border-charcoal/15 bg-white text-[9px] text-muted-foreground">{locale === "fr" ? "Désactivée" : "Disabled"}</Badge>;
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
  const publicationGap = (recipe.unpublishedIngredientCount || 0) > 0;
  const label = required === 0 ? (locale === "fr" ? "Ingrédient requis" : "Required ingredient") : publicationGap ? (locale === "fr" ? "Produit à publier" : "Product to publish") : attention ? (locale === "fr" ? "Stock à compléter" : "Stock gap") : (locale === "fr" ? "Prête à vendre" : "Ready to sell");
  return <div className={compact ? "min-w-0" : "w-36"}><div className="flex items-center justify-between gap-2 text-[9px] font-bold"><span className={`truncate ${attention ? "text-destructive" : "text-burgundy"}`}>{label}</span><span className="shrink-0 tabular-nums text-charcoal">{available}/{required}</span></div><div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} aria-label={locale === "fr" ? `Couverture ingrédients ${rate} %` : `Ingredient coverage ${rate}%`} className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${attention ? "bg-gold" : "bg-burgundy"}`} style={{ width: `${Math.max(0, Math.min(100, rate))}%` }} /></div></div>;
}

function RecipeFormat({ recipe, locale, compact = false }: { recipe: Recipe; locale: "fr" | "en"; compact?: boolean }) {
  return <div className={`flex ${compact ? "flex-col items-end gap-0.5" : "flex-wrap gap-x-3 gap-y-1"} text-[9px] font-bold text-muted-foreground`}><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{recipe.timeMinutes} min</span><span className="inline-flex items-center gap-1"><UsersRound className="h-3 w-3" />{recipe.baseServings} {locale === "fr" ? "pers." : "people"}</span><span className="inline-flex items-center gap-1"><BookOpenCheck className="h-3 w-3" />{recipe.stepCount ?? "—"} {locale === "fr" ? "étapes" : "steps"}</span></div>;
}
