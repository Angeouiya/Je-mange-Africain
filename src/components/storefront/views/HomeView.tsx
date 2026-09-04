"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Clock,
  Headphones,
  Heart,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { ProductCard, type ProductListItem } from "@/components/shared/ProductCard";
import { ProductImage } from "@/components/shared/ProductImage";
import type { RecipeListItem } from "@/components/shared/RecipeCard";
import { dict } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { getCategoryPhoto, getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { useFetch } from "@/lib/use-fetch";
import { useStore } from "@/lib/store";
import { StorefrontAdvertisement } from "@/components/storefront/StorefrontAdvertisement";

type HomeCategory = {
  id: string;
  slug: string;
  name: string;
  color?: string | null;
};

type HomeCatalog = {
  categories: HomeCategory[];
  bestsellers: ProductListItem[];
  news: ProductListItem[];
  onSale: ProductListItem[];
  popularRecipes: RecipeListItem[];
};

export function HomeView() {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const favorites = useStore((state) => state.favorites);
  const t = dict[locale];
  const { data, loading } = useFetch<HomeCatalog>(`/api/catalog?section=home&locale=${locale}`, [locale]);

  const allFeaturedProducts = useMemo(() => {
    const unique = new Map<string, ProductListItem>();
    for (const product of [...(data?.bestsellers || []), ...(data?.news || []), ...(data?.onSale || [])]) {
      unique.set(product.id, product);
    }
    return [...unique.values()];
  }, [data?.bestsellers, data?.news, data?.onSale]);

  const savedFeaturedProducts = useMemo(
    () => allFeaturedProducts.filter((product) => favorites.includes(product.id)),
    [allFeaturedProducts, favorites]
  );
  const favouriteShelf = (savedFeaturedProducts.length ? savedFeaturedProducts : allFeaturedProducts).slice(0, 6);

  const copy = locale === "fr"
    ? {
        screenTitle: "Accueil",
        favourites: savedFeaturedProducts.length ? "Vos favoris" : "Favoris du moment",
        favouritesAction: savedFeaturedProducts.length ? "Gérer" : "Tout voir",
        categories: "Explorer les rayons",
        recipes: "À cuisiner cette semaine",
        recipesAction: "Toutes les recettes",
        offers: "Offres du moment",
      }
    : {
        screenTitle: "Home",
        favourites: savedFeaturedProducts.length ? "Your favourites" : "Popular favourites",
        favouritesAction: savedFeaturedProducts.length ? "Manage" : "View all",
        categories: "Explore departments",
        recipes: "Cook this week",
        recipesAction: "All recipes",
        offers: "Current offers",
      };

  const commitments = [
    { icon: ShieldCheck, title: t.home.commitment1Title, desc: t.home.commitment1Desc, color: "#8A3042" },
    { icon: Snowflake, title: t.home.commitment2Title, desc: t.home.commitment2Desc, color: "#8A3042" },
    { icon: Truck, title: t.home.commitment3Title, desc: t.home.commitment3Desc, color: "#D65A32" },
    { icon: Headphones, title: t.home.commitment4Title, desc: t.home.commitment4Desc, color: "#F2A900" },
  ];

  return (
    <div className="flex flex-col bg-white pb-8 md:pb-0">
      <div className="order-1 px-4 pb-1 pt-4 md:hidden">
        <p className="text-[1.65rem] font-black leading-none text-charcoal">{copy.screenTitle}</p>
      </div>

      <div className="order-2 mx-auto w-full max-w-7xl px-4 pb-5 pt-3 md:px-8 md:pb-9 md:pt-8">
        <Section
          title={copy.favourites}
          actionLabel={copy.favouritesAction}
          onAction={() => navigate(savedFeaturedProducts.length ? "account" : "catalog", savedFeaturedProducts.length ? { accountSection: "saved" } : undefined)}
          compact
        >
          {loading ? <StorySkeleton /> : <FavouriteShelf products={favouriteShelf} />}
        </Section>
      </div>

      <section className="relative order-3 min-h-[13.5rem] overflow-hidden md:order-1 md:min-h-[22rem]" data-testid="home-hero">
        <div className="absolute inset-0">
          <Image
            src="/hero-feast-v2.webp"
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[64%_center] md:object-center"
          />
          <div className="absolute inset-0 bg-burgundy/58 md:bg-gradient-to-r md:from-burgundy/95 md:via-burgundy/62 md:to-terre/10" />
        </div>
        <div className="relative mx-auto flex min-h-[13.5rem] max-w-7xl flex-col justify-end gap-2 px-4 py-4 md:min-h-[22rem] md:justify-center md:gap-4 md:px-12 md:py-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge className="border-0 bg-transparent p-0 text-[9px] font-extrabold uppercase text-gold shadow-none md:text-[10px]">
              <Sparkles className="mr-1 h-3 w-3" /> {t.home.heroBadge}
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="max-w-3xl font-display text-[1.55rem] font-semibold leading-[1.05] text-white sm:text-3xl md:text-[2.8rem]"
          >
            {t.home.heroTitle.split("\n").map((line, index) => (
              <span key={line} className="sm:block">
                {index > 0 ? " " : null}
                {index === 1 ? <span className="text-gold">{line}</span> : line}
              </span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="line-clamp-2 max-w-xl text-[10px] leading-4 text-white/88 sm:text-xs md:text-sm md:leading-6"
          >
            {t.home.heroSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex gap-2"
          >
            <Button onClick={() => navigate("catalog")} className="h-9 bg-terre px-3 text-[11px] text-white shadow-lg hover:bg-terre-dark md:h-11 md:px-5 md:text-sm">
              {t.home.heroCtaCatalog} <ArrowRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button onClick={() => navigate("recipes")} className="h-9 border border-white/50 bg-white px-3 text-[11px] text-burgundy shadow-lg hover:bg-cream md:h-11 md:px-5 md:text-sm">
              {t.home.heroCtaRecipes}
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="order-4 mx-auto w-full max-w-7xl space-y-9 px-4 pt-7 md:order-3 md:space-y-14 md:px-8 md:pt-12">
        <Section title={copy.categories} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <StorySkeleton /> : <CategoryShelf categories={data?.categories || []} />}
        </Section>

        <Section title={t.home.bestsellers} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <ProductRailSkeleton /> : <ProductRail products={data?.bestsellers || []} testId="home-bestseller-rail" />}
        </Section>

        <Section title={copy.recipes} actionLabel={copy.recipesAction} onAction={() => navigate("recipes")}>
          {loading ? <StorySkeleton tall /> : <RecipeShelf recipes={data?.popularRecipes || []} />}
        </Section>

        <StorefrontAdvertisement
          placement="home"
          variant="immersive"
          fallback={{
            title: locale === "fr" ? "Le panier d'une recette, calculé pour vous" : "A recipe basket, calculated for you",
            body: locale === "fr" ? "Choisissez le nombre de personnes, adaptez les ingrédients et obtenez les bonnes quantités." : "Choose the number of guests, adapt ingredients and get the right quantities.",
            imageUrl: "/hero.jpg",
            imageAlt: locale === "fr" ? "Assortiment de plats africains prêts à cuisiner" : "Selection of African dishes ready to cook",
          }}
          fallbackDestination={{ view: "recipes" }}
        />

        <div className="grid gap-9 md:gap-14 lg:grid-cols-2">
          <Section title={t.home.newProducts} actionLabel={t.viewAll} onAction={() => navigate("catalog", { sort: "new" })}>
            {loading ? <ProductRailSkeleton short /> : <ProductRail products={data?.news || []} testId="home-new-rail" condensedDesktop />}
          </Section>
          <Section title={copy.offers} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
            {loading ? <ProductRailSkeleton short /> : <ProductRail products={data?.onSale || []} testId="home-offer-rail" condensedDesktop />}
          </Section>
        </div>

        <section className="border-y border-charcoal/10 bg-[#FFFCFA]" aria-label={t.home.commitmentsTitle}>
          <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {commitments.map((commitment) => {
              const Icon = commitment.icon;
              return (
                <div key={commitment.title} className="flex w-[78vw] max-w-[18rem] shrink-0 snap-start items-center gap-3 px-3 py-4 md:w-auto md:border-r md:border-charcoal/10 md:px-5 md:last:border-r-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${commitment.color}14` }}>
                    <Icon className="h-5 w-5" style={{ color: commitment.color }} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-xs text-charcoal">{commitment.title}</strong>
                    <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">{commitment.desc}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({ title, actionLabel, onAction, children, compact = false }: { title: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`min-w-0 ${compact ? "space-y-2.5" : "space-y-3.5 md:space-y-5"}`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`${compact ? "text-xl md:text-2xl" : "text-lg md:text-3xl"} min-w-0 font-black leading-tight text-charcoal md:font-display md:font-semibold`}>{title}</h2>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-[11px] font-extrabold text-terre hover:underline md:text-xs">
            {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FavouriteShelf({ products }: { products: ProductListItem[] }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-6 md:gap-3 md:px-0" data-testid="home-favourites-rail">
      {products.map((product, index) => (
        <motion.button
          key={product.id}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.035 }}
          onClick={() => navigate("product", { productId: product.id })}
          className="group w-[6.75rem] shrink-0 snap-start text-left md:w-auto"
          aria-label={locale === "fr" ? `Voir ${product.name}` : `View ${product.name}`}
        >
          <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <ProductImage src={getProductPhoto(product)} alt="" emoji={product.imageEmoji} color={product.imageColor} size="md" className="h-full w-full transition duration-300 group-hover:scale-[1.035]" rounded="rounded-none" />
            <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-md bg-white/94 text-terre shadow-sm"><Heart className="h-3.5 w-3.5 fill-current" /></span>
          </span>
          <span className="mt-1.5 block line-clamp-2 min-h-7 text-[10px] font-extrabold leading-3.5 text-charcoal md:text-[11px]">{product.name}</span>
          <span className="mt-0.5 block text-[10px] font-black text-terre">{formatPrice(product.promoPrice ?? product.price, locale)}</span>
        </motion.button>
      ))}
    </div>
  );
}

function CategoryShelf({ categories }: { categories: HomeCategory[] }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-8 md:gap-3 md:px-0" data-testid="home-category-rail">
      {categories.map((category, index) => (
        <motion.button
          key={category.id}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.035 }}
          onClick={() => navigate("catalog", { category: category.id })}
          className="group w-[5.75rem] shrink-0 snap-start text-left md:w-auto"
          aria-label={locale === "fr" ? `Explorer le rayon ${category.name}` : `Explore ${category.name}`}
        >
          <span className="relative block aspect-square overflow-hidden rounded-md bg-muted">
            <ProductImage src={getCategoryPhoto(category)} alt="" emoji="" color={category.color || "#8A3042"} size="md" className="h-full w-full transition duration-300 group-hover:scale-[1.04]" rounded="rounded-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-burgundy/38 via-transparent to-transparent" />
            <CategoryIcon slug={category.slug} color={category.color} className="absolute bottom-1.5 right-1.5 h-7 w-7 border border-white/65 shadow-sm" />
          </span>
          <span className="mt-1.5 block line-clamp-2 min-h-7 text-center text-[9px] font-extrabold leading-3.5 text-charcoal md:text-[10px]">{category.name}</span>
        </motion.button>
      ))}
    </div>
  );
}

function ProductRail({ products, testId, condensedDesktop = false }: { products: ProductListItem[]; testId: string; condensedDesktop?: boolean }) {
  return (
    <div className={`-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:px-0 ${condensedDesktop ? "md:grid-cols-2 lg:grid-cols-2" : "md:grid-cols-4 lg:grid-cols-5"}`} data-testid={testId}>
      {products.map((product, index) => (
        <div key={product.id} className="w-[9.85rem] shrink-0 snap-start md:w-auto">
          <ProductCard product={product} index={index} compact />
        </div>
      ))}
    </div>
  );
}

function RecipeShelf({ recipes }: { recipes: RecipeListItem[] }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const savedRecipes = useStore((state) => state.savedRecipes);
  const toggleSavedRecipe = useStore((state) => state.toggleSavedRecipe);

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:px-0 lg:grid-cols-6" data-testid="home-recipe-rail">
      {recipes.map((recipe, index) => {
        const saved = savedRecipes.includes(recipe.id);
        return (
          <motion.article key={recipe.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }} className="relative w-[10.75rem] shrink-0 snap-start overflow-hidden rounded-md border border-charcoal/10 bg-white md:w-auto">
            <button type="button" onClick={() => navigate("recipe-config", { recipeId: recipe.id })} className="group block w-full text-left" aria-label={locale === "fr" ? `Configurer la recette ${recipe.title}` : `Configure the ${recipe.title} recipe`}>
              <span className="relative block aspect-[4/3] overflow-hidden bg-muted">
                <ProductImage src={getRecipePhoto(recipe)} fallbackSrc="/hero-feast-v2.webp" alt="" emoji={recipe.imageEmoji} color={recipe.imageColor} size="md" className="h-full w-full transition duration-300 group-hover:scale-[1.035]" rounded="rounded-none" />
                <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-burgundy/65 to-transparent" />
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold text-white"><Clock className="h-3 w-3" />{recipe.timeMinutes} min</span>
              </span>
              <span className="block p-2.5">
                <strong className="block line-clamp-2 min-h-8 text-[11px] leading-4 text-charcoal">{recipe.title}</strong>
                <span className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                  <span className="truncate">{recipe.country}</span>
                  <span className="inline-flex shrink-0 items-center gap-1"><Users className="h-3 w-3" />{recipe.baseServings}</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleSavedRecipe(recipe.id)}
              aria-pressed={saved}
              aria-label={saved ? (locale === "fr" ? `Retirer ${recipe.title} des recettes sauvegardées` : `Remove ${recipe.title} from saved recipes`) : (locale === "fr" ? `Sauvegarder ${recipe.title}` : `Save ${recipe.title}`)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-charcoal/10 bg-white/94 text-charcoal shadow-sm hover:text-terre"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-terre text-terre" : ""}`} />
            </button>
          </motion.article>
        );
      })}
    </div>
  );
}

function StorySkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="-mx-4 flex gap-2.5 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
      {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className={`${tall ? "h-52 w-[10.75rem]" : "h-28 w-[6.75rem]"} shrink-0 rounded-md md:w-auto`} />)}
    </div>
  );
}

function ProductRailSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="-mx-4 flex gap-2.5 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0 lg:grid-cols-5">
      {Array.from({ length: short ? 2 : 5 }).map((_, index) => <Skeleton key={index} className="h-64 w-[9.85rem] shrink-0 rounded-md md:w-auto" />)}
    </div>
  );
}
