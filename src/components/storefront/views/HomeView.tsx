"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { IconFunction } from "reicon/createIcon";
import { AngleRight } from "reicon/icons/AngleRight";
import { ArrowRight } from "reicon/icons/ArrowRight";
import { Bookmark } from "reicon/icons/Bookmark";
import { BoxSearch } from "reicon/icons/BoxSearch";
import { ChartBarTrendUp } from "reicon/icons/ChartBarTrendUp";
import { ChefHat } from "reicon/icons/ChefHat";
import { ChefHatHeart } from "reicon/icons/ChefHatHeart";
import { Clock } from "reicon/icons/Clock";
import { CreditCard } from "reicon/icons/CreditCard";
import { Globe2 } from "reicon/icons/Globe2";
import { Headphones } from "reicon/icons/Headphones";
import { Heart } from "reicon/icons/Heart";
import { Login } from "reicon/icons/Login";
import { MapPoint } from "reicon/icons/MapPoint";
import { RouteTrack } from "reicon/icons/RouteTrack";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { Snowflake } from "reicon/icons/Snowflake";
import { Sparkles } from "reicon/icons/Sparkles";
import { Truck } from "reicon/icons/Truck";
import { TruckFast } from "reicon/icons/TruckFast";
import { Users } from "reicon/icons/Users";
import { UsersNearby } from "reicon/icons/UsersNearby";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { ProductCard, type ProductListItem } from "@/components/shared/ProductCard";
import { ProductImage } from "@/components/shared/ProductImage";
import type { RecipeListItem } from "@/components/shared/RecipeCard";
import { dict } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { MARKET_PHOTOS, getCategoryPhoto, getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { useFetch } from "@/lib/use-fetch";
import { prefetchStorefrontData, STOREFRONT_DATA_TTL_MS } from "@/lib/storefront-prefetch";
import { preloadStorefrontViewBundle } from "@/components/storefront/view-loaders";
import { useStore, type ViewId, type ViewParams } from "@/lib/store";
import { StorefrontAdvertisement } from "@/components/storefront/StorefrontAdvertisement";
import { DeliveryDestinationDialog } from "@/components/storefront/DeliveryDestinationDialog";
import { StorefrontUnavailableState } from "@/components/storefront/StorefrontUnavailableState";
import { EUROPEAN_COUNTRIES, europeanCountryLabel } from "@/lib/european-countries";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

type HomeCategory = {
  id: string;
  slug: string;
  name: string;
  color?: string | null;
  imageUrl?: string | null;
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
  const { data, loading, error, refetch } = useFetch<HomeCatalog>(`/api/catalog?section=home&locale=${locale}`, [locale], {}, { cache: true, ttlMs: STOREFRONT_DATA_TTL_MS });

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
        favouritesIntent: savedFeaturedProducts.length ? "Vos produits repérés, prêts à retrouver" : "Produits aimés par les clients en Europe",
        categoriesIntent: "Chaque rayon a une destination claire",
        bestsellersIntent: "Les références qui partent le plus vite",
        recipesIntent: "Recettes détaillées avec panier recalculé",
        offersIntent: "Nouveaux prix, ancien prix et avantage visible",
        newIntent: "Dernières arrivées publiées par l'équipe",
        signalEurope: "Europe",
        signalEuropeValue: "multi-zone",
        signalPayment: "Paiement",
        signalPaymentValue: "Carte + PayPal",
        signalRecipe: "Recettes",
        signalRecipeValue: "panier ajusté",
        marketTitle: "Marché garni",
        marketIntent: "Plats, épices et essentiels qui donnent envie dès l'image",
      }
    : {
        screenTitle: "Home",
        favourites: savedFeaturedProducts.length ? "Your favourites" : "Popular favourites",
        favouritesAction: savedFeaturedProducts.length ? "Manage" : "View all",
        categories: "Explore departments",
        recipes: "Cook this week",
        recipesAction: "All recipes",
        offers: "Current offers",
        favouritesIntent: savedFeaturedProducts.length ? "Your saved products, ready to reopen" : "Products customers in Europe keep choosing",
        categoriesIntent: "Every department has a clear destination",
        bestsellersIntent: "The references moving fastest now",
        recipesIntent: "Detailed recipes with a recalculated basket",
        offersIntent: "New price, old price and visible advantage",
        newIntent: "Latest products published by the team",
        signalEurope: "Europe",
        signalEuropeValue: "multi-zone",
        signalPayment: "Payment",
        signalPaymentValue: "Card + PayPal",
        signalRecipe: "Recipes",
        signalRecipeValue: "adjusted basket",
        marketTitle: "Loaded market",
        marketIntent: "Dishes, spices and essentials that sell the appetite first",
      };

  const commitments: Array<{ icon: IconFunction; title: string; desc: string; color: string }> = [
    { icon: ShieldCheck, title: t.home.commitment1Title, desc: t.home.commitment1Desc, color: "#8A3042" },
    { icon: Snowflake, title: t.home.commitment2Title, desc: t.home.commitment2Desc, color: "#8A3042" },
    { icon: Truck, title: t.home.commitment3Title, desc: t.home.commitment3Desc, color: "#D65A32" },
    { icon: Headphones, title: t.home.commitment4Title, desc: t.home.commitment4Desc, color: "#F2A900" },
  ];
  const heroSignals: Array<{ icon: IconFunction; label: string; value: string }> = [
    { icon: Globe2, label: copy.signalEurope, value: copy.signalEuropeValue },
    { icon: CreditCard, label: copy.signalPayment, value: copy.signalPaymentValue },
    { icon: ChefHat, label: copy.signalRecipe, value: copy.signalRecipeValue },
  ];
  const quickActions: HomeQuickAction[] = locale === "fr"
    ? [
        { view: "catalog", label: "Marché", detail: "Stock, prix, origine", icon: ChartBarTrendUp, accent: "#B9472B", signal: "Catalogue" },
        { view: "recipes", label: "Recettes", detail: "Panier recalculé", icon: ChefHatHeart, accent: "#8A3042", signal: "Cuisine" },
        { view: "wholesale", label: "Gros", detail: "Lots et volumes", icon: UsersNearby, accent: "#D65A32", signal: "Marché pro" },
        { view: "orders", label: "Suivi", detail: "Livraison Europe", icon: RouteTrack, accent: "#F2A900", signal: "Traçabilité" },
      ]
    : [
        { view: "catalog", label: "Market", detail: "Stock, price, origin", icon: ChartBarTrendUp, accent: "#B9472B", signal: "Catalogue" },
        { view: "recipes", label: "Recipes", detail: "Basket recalculated", icon: ChefHatHeart, accent: "#8A3042", signal: "Cooking" },
        { view: "wholesale", label: "Wholesale", detail: "Lots and volume", icon: UsersNearby, accent: "#D65A32", signal: "Trade" },
        { view: "orders", label: "Tracking", detail: "Europe delivery", icon: RouteTrack, accent: "#F2A900", signal: "Traceability" },
      ];
  const warmDestination = (view: ViewId, params: ViewParams = {}) => {
    void preloadStorefrontViewBundle(view);
    void prefetchStorefrontData(view, params, locale);
  };
  const selectDestination = (view: ViewId, params?: ViewParams) => {
    warmDestination(view, params);
    navigate(view, params);
  };

  return (
    <div className="flex flex-col bg-white pb-8 md:pb-0">
      <div className="order-1 px-4 pb-1 pt-4 md:hidden">
        <div className="flex items-center justify-between gap-3"><p className="text-[1.65rem] font-black leading-none text-charcoal">{copy.screenTitle}</p><HomeDeliveryContext variant="mobile" /></div>
      </div>

      <section className="relative order-2 min-h-[15rem] overflow-hidden md:order-1 md:min-h-[22rem]" data-testid="home-hero">
        <HomeHeroMedia locale={locale} />
        <div className="relative mx-auto flex min-h-[15rem] max-w-7xl flex-col justify-end gap-2 px-4 py-4 md:min-h-[22rem] md:justify-center md:gap-4 md:px-12 md:py-10">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <Badge className="border-0 bg-transparent p-0 text-[9px] font-extrabold uppercase text-[#FFD88A] shadow-none md:text-[10px] md:text-burgundy">
              <ReiconGlyph icon={Sparkles} weight="Filled" className="mr-1 h-3 w-3" /> {t.home.heroBadge}
            </Badge>
            <HomeDeliveryContext variant="desktop" />
          </motion.div>
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl font-display text-[1.55rem] font-semibold leading-[1.05] text-white sm:text-3xl md:max-w-2xl md:text-[2.8rem] md:text-charcoal"
          >
            {t.home.heroTitle.split("\n").map((line, index) => (
              <span key={line} className="sm:block">
                {index > 0 ? " " : null}
                {index === 1 ? <span className="text-[#FFD88A] md:text-burgundy">{line}</span> : line}
              </span>
            ))}
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="line-clamp-2 max-w-xl text-[10px] leading-4 text-white/88 sm:text-xs md:text-sm md:leading-6 md:text-charcoal/75"
          >
            {t.home.heroSubtitle}
          </motion.p>
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="grid max-w-lg grid-cols-3 gap-1.5 md:gap-2">
            {heroSignals.map((signal) => {
              return (
                <span key={signal.label} className="flex min-h-10 items-center gap-1.5 rounded-md border border-white/26 bg-white/16 px-2 text-white shadow-[0_14px_30px_-26px_rgba(255,255,255,0.75)] backdrop-blur-md md:border-burgundy/12 md:bg-white/92 md:text-charcoal">
                  <ReiconGlyph icon={signal.icon} weight="Filled" className="h-3.5 w-3.5 shrink-0 text-[#FFD88A] md:h-4 md:w-4 md:text-burgundy" />
                  <span className="min-w-0">
                    <span className="block truncate text-[7px] font-bold uppercase text-white/70 md:text-[8px] md:text-muted-foreground">{signal.label}</span>
                    <span className="block truncate text-[8.5px] font-black leading-3 text-white md:text-[10px] md:text-charcoal">{signal.value}</span>
                  </span>
                </span>
              );
            })}
          </motion.div>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <Button onPointerEnter={() => warmDestination("catalog")} onFocus={() => warmDestination("catalog")} onTouchStart={() => warmDestination("catalog")} onClick={() => selectDestination("catalog")} className="h-9 bg-burgundy px-3 text-[11px] text-white shadow-lg hover:bg-burgundy-dark md:h-11 md:px-5 md:text-sm">
              {t.home.heroCtaCatalog} <ReiconGlyph icon={ArrowRight} className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button onPointerEnter={() => warmDestination("recipes")} onFocus={() => warmDestination("recipes")} onTouchStart={() => warmDestination("recipes")} onClick={() => selectDestination("recipes")} className="h-9 border border-white/50 bg-white px-3 text-[11px] text-burgundy shadow-lg hover:bg-cream md:h-11 md:border-burgundy/15 md:px-5 md:text-sm">
              {t.home.heroCtaRecipes}
            </Button>
          </motion.div>
        </div>
      </section>

      {!error ? <div className="order-3 mx-auto w-full max-w-7xl space-y-5 px-4 pb-5 pt-5 md:order-2 md:px-8 md:pb-9 md:pt-8">
        <HomeQuickLaunch actions={quickActions} onSelect={selectDestination} onWarm={warmDestination} locale={locale} />
        <MarketAbundanceShelf title={copy.marketTitle} intent={copy.marketIntent} locale={locale} onSelect={selectDestination} onWarm={warmDestination} />
        <Section
          title={copy.favourites}
          intent={copy.favouritesIntent}
          index="01"
          actionLabel={copy.favouritesAction}
          onAction={() => selectDestination(savedFeaturedProducts.length ? "account" : "catalog", savedFeaturedProducts.length ? { accountSection: "saved" } : undefined)}
          compact
        >
          {loading ? <StorySkeleton /> : favouriteShelf.length ? <FavouriteShelf products={favouriteShelf} /> : <HomeCollectionEmpty locale={locale} />}
        </Section>
      </div> : null}

      <div className="order-4 mx-auto w-full max-w-7xl space-y-9 px-4 pt-7 md:order-3 md:space-y-14 md:px-8 md:pt-12">
        {error ? <StorefrontUnavailableState surface="home" locale={locale} onRetry={refetch} /> : <><Section title={copy.categories} intent={copy.categoriesIntent} index="02" actionLabel={t.viewAll} onAction={() => selectDestination("catalog")}>
          {loading ? <StorySkeleton /> : <CategoryShelf categories={data?.categories || []} />}
        </Section>

        <Section title={t.home.bestsellers} intent={copy.bestsellersIntent} index="03" actionLabel={t.viewAll} onAction={() => selectDestination("catalog")}>
          {loading ? <ProductRailSkeleton /> : <ProductRail products={data?.bestsellers || []} testId="home-bestseller-rail" />}
        </Section>

        <Section title={copy.recipes} intent={copy.recipesIntent} index="04" actionLabel={copy.recipesAction} onAction={() => selectDestination("recipes")}>
          {loading ? <StorySkeleton tall /> : <RecipeShelf recipes={data?.popularRecipes || []} />}
        </Section>

        <StorefrontAdvertisement
          placement="home"
          variant="immersive"
          fallback={{
            title: locale === "fr" ? "Le panier d'une recette, calculé pour vous" : "A recipe basket, calculated for you",
            body: locale === "fr" ? "Choisissez le nombre de personnes, adaptez les ingrédients et obtenez les bonnes quantités." : "Choose the number of guests, adapt ingredients and get the right quantities.",
            imageUrl: "/showcase/jollof-dodo.webp",
            imageAlt: locale === "fr" ? "Jollof, plantain frit et sauce servis" : "Jollof rice, fried plantain and sauce served",
          }}
          fallbackDestination={{ view: "recipes" }}
        />

        <div className="grid gap-9 md:gap-14 lg:grid-cols-2">
          <Section title={t.home.newProducts} intent={copy.newIntent} index="05" actionLabel={t.viewAll} onAction={() => selectDestination("catalog", { sort: "new" })}>
            {loading ? <ProductRailSkeleton short /> : <ProductRail products={data?.news || []} testId="home-new-rail" condensedDesktop />}
          </Section>
          <Section title={copy.offers} intent={copy.offersIntent} index="06" actionLabel={t.viewAll} onAction={() => selectDestination("catalog")}>
            {loading ? <ProductRailSkeleton short /> : <ProductRail products={data?.onSale || []} testId="home-offer-rail" condensedDesktop />}
          </Section>
        </div></>}

        <section className="border-y border-charcoal/10 bg-[#FFFCFA]" aria-label={t.home.commitmentsTitle}>
          <div tabIndex={0} aria-label={locale === "fr" ? "Engagements Je mange Africain, défilement horizontal" : "Je mange Africain commitments, horizontal scroll"} className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-inset [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {commitments.map((commitment) => {
              return (
                <div key={commitment.title} className="flex w-[78vw] max-w-[18rem] shrink-0 snap-start items-center gap-3 px-3 py-4 md:w-auto md:border-r md:border-charcoal/10 md:px-5 md:last:border-r-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${commitment.color}14` }}>
                    <ReiconGlyph icon={commitment.icon} weight="Filled" className="h-5 w-5" style={{ color: commitment.color }} />
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

type HomeQuickAction = {
  view: ViewId;
  params?: ViewParams;
  label: string;
  detail: string;
  icon: IconFunction;
  accent: string;
  signal: string;
};

function HomeHeroMedia({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const tiles = [
    { src: "/showcase/jollof-dodo.webp", alt: isFr ? "Jollof et plantain frit" : "Jollof rice with fried plantain" },
    { src: "/recipes/alloco-poulet.webp", alt: isFr ? "Alloco, riz et poulet" : "Plantain, rice and chicken" },
    { src: "/recipe-library-hero.webp", alt: isFr ? "Egusi et eba servis" : "Egusi and eba served" },
    { src: "/products/piment-frais.webp", alt: isFr ? "Piments frais" : "Fresh peppers" },
  ];

  return (
    <div className="absolute inset-0 bg-white" aria-hidden="true">
      <Image
        src={MARKET_PHOTOS.spiceBowls}
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="object-cover object-[46%_62%]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(63,41,48,0.05)_0%,rgba(90,38,50,0.66)_58%,rgba(90,38,50,0.92)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.78)_32%,rgba(90,38,50,0.28)_58%,rgba(90,38,50,0.76)_100%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[44%] items-end justify-end gap-2 p-5 md:flex lg:w-[40%] lg:p-8">
        {tiles.map((tile, index) => (
          <span key={tile.src} className={`relative block overflow-hidden rounded-md border border-white/75 bg-white shadow-[0_18px_50px_-32px_rgba(63,41,48,0.75)] ${index === 1 ? "mb-10 h-40 w-[7.5rem] lg:h-48 lg:w-40" : index === 3 ? "mb-5 h-32 w-24 lg:h-40 lg:w-32" : "h-28 w-24 lg:h-36 lg:w-32"}`}>
            <Image src={tile.src} alt={tile.alt} fill sizes="10rem" className="object-cover" />
          </span>
        ))}
      </div>
    </div>
  );
}

type MarketShowcaseItem = {
  label: string;
  detail: string;
  src: string;
  view: ViewId;
  params?: ViewParams;
  featured?: boolean;
};

function MarketAbundanceShelf({ title, intent, locale, onSelect, onWarm }: { title: string; intent: string; locale: "fr" | "en"; onSelect: (view: ViewId, params?: ViewParams) => void; onWarm: (view: ViewId, params?: ViewParams) => void }) {
  const items: MarketShowcaseItem[] = locale === "fr"
    ? [
        { label: "Marché garni", detail: "Épices, plats, condiments", src: "/market-collage-premium.jpg", view: "catalog", featured: true },
        { label: "Jollof & dodo", detail: "Riz parfumé, plantain doré", src: "/showcase/jollof-dodo.webp", view: "recipes", params: { query: "jollof" } },
        { label: "Alloco poulet", detail: "Assiette chaude et généreuse", src: "/recipes/alloco-poulet.webp", view: "recipes", params: { query: "alloco" } },
        { label: "Egusi & eba", detail: "Sauce riche, base fondante", src: "/recipe-library-hero.webp", view: "recipes", params: { query: "egusi" } },
        { label: "Attiéké poisson", detail: "Ivoirien, frais, relevé", src: "/recipes/attieke-poisson.webp", view: "recipes", params: { query: "attieke" } },
        { label: "Maffé", detail: "Sauce arachide profonde", src: "/showcase/groundnut-stew.webp", view: "recipes", params: { query: "mafe" } },
        { label: "Piments frais", detail: "Couleur et intensité", src: "/products/piment-frais.webp", view: "catalog", params: { query: "piment" } },
        { label: "Pâte d'arachide", detail: "Texture dense et crémeuse", src: "/products/pate-arachide.webp", view: "catalog", params: { query: "arachide" } },
        { label: "Gombo frais", detail: "Produit net, prêt à cuisiner", src: "/products/gombo-frais.webp", view: "catalog", params: { query: "gombo" } },
        { label: "Fonio", detail: "Grain fin, cuisson légère", src: "/products/fonio.webp", view: "catalog", params: { query: "fonio" } },
        { label: "Bissap", detail: "Hibiscus intense", src: "/products/bissap.webp", view: "catalog", params: { query: "bissap" } },
        { label: "Dodo", detail: "Plantain mûr doré", src: "/showcase/dodo-fried.webp", view: "catalog", params: { query: "plantain" } },
      ]
    : [
        { label: "Loaded market", detail: "Spices, dishes, condiments", src: "/market-collage-premium.jpg", view: "catalog", featured: true },
        { label: "Jollof & dodo", detail: "Spiced rice, golden plantain", src: "/showcase/jollof-dodo.webp", view: "recipes", params: { query: "jollof" } },
        { label: "Plantain chicken", detail: "Warm, generous plate", src: "/recipes/alloco-poulet.webp", view: "recipes", params: { query: "plantain chicken" } },
        { label: "Egusi & eba", detail: "Rich sauce, soft base", src: "/recipe-library-hero.webp", view: "recipes", params: { query: "egusi" } },
        { label: "Attieke fish", detail: "Ivorian, fresh, spicy", src: "/recipes/attieke-poisson.webp", view: "recipes", params: { query: "attieke" } },
        { label: "Groundnut stew", detail: "Deep peanut sauce", src: "/showcase/groundnut-stew.webp", view: "recipes", params: { query: "groundnut" } },
        { label: "Fresh peppers", detail: "Color and intensity", src: "/products/piment-frais.webp", view: "catalog", params: { query: "pepper" } },
        { label: "Peanut paste", detail: "Dense, creamy texture", src: "/products/pate-arachide.webp", view: "catalog", params: { query: "peanut" } },
        { label: "Fresh okra", detail: "Clear product shot", src: "/products/gombo-frais.webp", view: "catalog", params: { query: "okra" } },
        { label: "Fonio", detail: "Fine grain, light cooking", src: "/products/fonio.webp", view: "catalog", params: { query: "fonio" } },
        { label: "Bissap", detail: "Deep hibiscus", src: "/products/bissap.webp", view: "catalog", params: { query: "hibiscus" } },
        { label: "Dodo", detail: "Golden ripe plantain", src: "/showcase/dodo-fried.webp", view: "catalog", params: { query: "plantain" } },
      ];

  return (
    <section data-testid="home-market-abundance" aria-label={title} className="-mx-4 border-y border-burgundy/10 bg-[#FFFCFA] py-3 md:mx-0 md:px-3 md:py-4">
      <div className="mb-3 flex items-end justify-between gap-3 px-4 md:px-0">
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight text-charcoal md:font-display md:text-2xl md:font-semibold">{title}</h2>
          <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-muted-foreground md:text-xs">{intent}</p>
        </div>
        <button type="button" onClick={() => onSelect("catalog")} onPointerEnter={() => onWarm("catalog")} onFocus={() => onWarm("catalog")} className="inline-flex min-h-8 shrink-0 items-center gap-1 text-[10px] font-black text-burgundy hover:underline md:text-xs">
          {locale === "fr" ? "Explorer" : "Explore"} <ReiconGlyph icon={ArrowRight} className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:h-[19.25rem] md:grid-cols-6 md:grid-rows-2 md:overflow-hidden md:px-0">
        {items.map((item, index) => (
          <motion.button
            key={`${item.src}-${item.label}`}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.025 }}
            onClick={() => onSelect(item.view, item.params)}
            onPointerEnter={() => onWarm(item.view, item.params)}
            onFocus={() => onWarm(item.view, item.params)}
            onTouchStart={() => onWarm(item.view, item.params)}
            className={`group relative shrink-0 snap-start overflow-hidden rounded-md border border-white bg-white text-left shadow-[0_18px_46px_-36px_rgba(138,48,66,0.5)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-burgundy/45 ${item.featured ? "h-[11rem] w-[17.5rem] md:col-span-1 md:row-span-1 md:h-full md:w-auto" : "h-[8.7rem] w-[8.7rem] md:col-span-1 md:h-full md:w-auto"}`}
            aria-label={locale === "fr" ? `Voir ${item.label}` : `View ${item.label}`}
          >
            <Image src={item.src} alt="" fill sizes={item.featured ? "(min-width: 768px) 16vw, 17.5rem" : "(min-width: 768px) 16vw, 8.7rem"} className="object-cover transition duration-500 group-hover:scale-[1.04]" />
            <span className="absolute inset-0 bg-gradient-to-t from-burgundy/80 via-burgundy/16 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 block p-2.5 text-white">
              <strong className={`${item.featured ? "text-base md:text-sm" : "text-[11px] md:text-xs"} block line-clamp-2 font-black leading-tight`}>{item.label}</strong>
              <span className="mt-0.5 block truncate text-[9px] font-semibold text-white/82">{item.detail}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function HomeQuickLaunch({ actions, onSelect, onWarm, locale }: { actions: HomeQuickAction[]; onSelect: (view: ViewId, params?: ViewParams) => void; onWarm: (view: ViewId, params?: ViewParams) => void; locale: "fr" | "en" }) {
  return (
    <section data-testid="home-quick-launch" aria-label={locale === "fr" ? "Actions principales" : "Primary actions"} className="border-y border-burgundy/10 bg-white px-1.5 py-2 shadow-[0_18px_50px_-42px_rgba(138,48,66,0.55)] sm:px-2 md:px-3 md:py-3">
      <div className="mb-2 hidden items-center justify-between gap-3 px-1 sm:flex">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-burgundy">{locale === "fr" ? "Parcours rapides" : "Fast paths"}</p>
        <span className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md border border-burgundy/15 bg-white px-2 text-[8px] font-black uppercase text-burgundy"><ReiconGlyph icon={TruckFast} weight="Filled" className="h-3 w-3" />{locale === "fr" ? "Europe" : "Europe"}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-2.5">
        {actions.map((action, index) => (
          <button
            key={action.view}
            type="button"
            onClick={() => onSelect(action.view, action.params)}
            onPointerEnter={() => onWarm(action.view, action.params)}
            onFocus={() => onWarm(action.view, action.params)}
            onTouchStart={() => onWarm(action.view, action.params)}
            className="group relative min-h-[4.9rem] min-w-0 overflow-hidden rounded-md border bg-white px-1 py-1.5 text-center shadow-[0_16px_36px_-34px_rgba(138,48,66,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-34px_rgba(138,48,66,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/45 sm:min-h-[5.5rem] sm:px-2.5 sm:py-2 sm:text-left"
            style={{ borderColor: `${action.accent}22` }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: action.accent }} />
            <span className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-transform duration-200 group-hover:scale-[1.04] sm:h-10 sm:w-10" style={{ color: action.accent, borderColor: `${action.accent}24`, backgroundColor: `${action.accent}0F` }}>
                <ReiconGlyph icon={action.icon} weight="Filled" className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="hidden truncate text-[8px] font-black uppercase text-muted-foreground sm:block">{action.signal}</span>
                <span className="block truncate text-[9px] font-black leading-3 text-charcoal sm:mt-0.5 sm:text-[11px] sm:leading-4">{action.label}</span>
              </span>
            </span>
            <span className="mt-1 block min-h-4 text-[7px] font-semibold leading-[0.65rem] text-muted-foreground sm:mt-2 sm:min-h-[1.75rem] sm:text-[9px] sm:leading-3.5">{action.detail}</span>
            <span className="mt-2 hidden items-center justify-between gap-2 sm:flex">
              <span className="h-1 flex-1 rounded-full bg-burgundy/8"><span className="block h-full rounded-full" style={{ width: `${56 + index * 10}%`, backgroundColor: action.accent }} /></span>
              <ReiconGlyph icon={AngleRight} className="h-3.5 w-3.5 shrink-0 text-burgundy transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Section({ title, intent, index, actionLabel, onAction, children, compact = false }: { title: string; intent?: string; index?: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`min-w-0 ${compact ? "space-y-2.5" : "space-y-3.5 md:space-y-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {index ? <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-burgundy/15 bg-burgundy/[0.05] text-[9px] font-black tabular-nums text-burgundy">{index}</span> : null}
          <div className="min-w-0">
            <h2 className={`${compact ? "text-xl md:text-2xl" : "text-lg md:text-3xl"} min-w-0 font-black leading-tight text-charcoal md:font-display md:font-semibold`}>{title}</h2>
            {intent ? <p data-testid="home-section-intent" className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-muted-foreground md:text-xs">{intent}</p> : null}
          </div>
        </div>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-[11px] font-extrabold text-burgundy hover:underline md:text-xs">
            {actionLabel} <ReiconGlyph icon={ArrowRight} className="h-3.5 w-3.5" />
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
      {products.map((product, index) => {
        const brief = product.description || [product.traditionalName, product.country].filter(Boolean).join(" · ") || product.category?.name || "";
        return (
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
              {product.promoPrice !== null && product.promoPrice < product.price ? <span className="absolute left-1.5 top-1.5 rounded bg-burgundy px-1.5 py-0.5 text-[8px] font-black text-white">-{Math.round(((product.price - product.promoPrice) / product.price) * 100)} %</span> : null}
              <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-md bg-white/94 text-burgundy shadow-sm"><ReiconGlyph icon={Heart} weight="Filled" className="h-3.5 w-3.5" /></span>
            </span>
            <span className="mt-1.5 block line-clamp-2 min-h-7 text-[10px] font-extrabold leading-3.5 text-charcoal md:text-[11px]">{product.name}</span>
            <span data-testid="home-favourite-brief" className="mt-0.5 block min-h-3.5 truncate text-[8px] font-semibold leading-3.5 text-muted-foreground">{brief}</span>
            <span className="mt-0.5 flex min-h-4 items-baseline gap-1.5"><span className="text-[10px] font-black text-burgundy">{formatPrice(product.promoPrice ?? product.price, locale)}</span>{product.promoPrice !== null && product.promoPrice < product.price ? <span className="text-[8px] font-semibold text-muted-foreground line-through">{formatPrice(product.price, locale)}</span> : null}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function HomeDeliveryContext({ variant }: { variant: "mobile" | "desktop" }) {
  const locale = useStore((state) => state.locale);
  const country = useStore((state) => state.country);
  const postalCode = useStore((state) => state.postalCode);
  const label = europeanCountryLabel(country, locale);
  const isMobile = variant === "mobile";
  return (
    <DeliveryDestinationDialog weightGrams={0} thermalClasses={[]}>
      <button type="button" data-testid={`home-delivery-${variant}`} aria-label={locale === "fr" ? `Modifier la destination de livraison : ${label}, ${postalCode}` : `Change delivery destination: ${label}, ${postalCode}`} className={`${isMobile ? "flex md:hidden" : "hidden md:flex"} min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition ${isMobile ? "max-w-[11.5rem] border-burgundy/15 bg-white text-charcoal hover:border-burgundy/30" : "border-burgundy/12 bg-white/88 text-charcoal backdrop-blur-sm hover:bg-white"}`}>
        <ReiconGlyph icon={MapPoint} weight="Filled" className={`h-4 w-4 shrink-0 ${isMobile ? "text-burgundy" : "text-burgundy"}`} />
        <span className="min-w-0"><span className={`block text-[8px] font-bold uppercase ${isMobile ? "text-muted-foreground" : "text-muted-foreground"}`}>{locale === "fr" ? "Livrer à" : "Deliver to"}</span><span className="block max-w-[7.5rem] truncate text-[10px] font-black">{label}{postalCode ? ` · ${postalCode}` : ""}</span></span>
        {!isMobile ? <span className="hidden text-[8px] font-bold text-burgundy lg:block">{EUROPEAN_COUNTRIES.length} {locale === "fr" ? "pays" : "countries"}</span> : null}
        <ReiconGlyph icon={AngleRight} className="h-3.5 w-3.5 shrink-0" />
      </button>
    </DeliveryDestinationDialog>
  );
}

function HomeCollectionEmpty({ locale }: { locale: "fr" | "en" }) {
  return <div className="flex min-h-28 items-center gap-3 border-y border-charcoal/10 px-3 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><ReiconGlyph icon={BoxSearch} weight="Filled" className="h-5 w-5" /></span><span><strong className="block text-xs text-charcoal">{locale === "fr" ? "La sélection arrive bientôt" : "The selection is coming soon"}</strong><span className="mt-1 block text-[10px] text-muted-foreground">{locale === "fr" ? "Les prochaines références publiées apparaîtront ici." : "The next published products will appear here."}</span></span></div>;
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
            <CategoryIcon slug={category.slug} label={category.name} color={category.color} className="absolute bottom-1.5 right-1.5 h-7 w-7 border border-white/65 shadow-sm" />
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
  const requestCustomerAuth = useStore((state) => state.requestCustomerAuth);
  const customer = useStore((state) => state.customer);
  const isAuthenticated = Boolean(customer);
  const openRecipe = (recipeId: string) => {
    if (!customer) {
      requestCustomerAuth({ view: "recipe-config", params: { recipeId } });
      return;
    }
    navigate("recipe-config", { recipeId });
  };
  const saveRecipe = (recipeId: string) => {
    if (!customer) {
      requestCustomerAuth({ view: "recipe-config", params: { recipeId } });
      return;
    }
    toggleSavedRecipe(recipeId);
  };

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:px-0 lg:grid-cols-6" data-testid="home-recipe-rail">
      {recipes.map((recipe, index) => {
        const saved = savedRecipes.includes(recipe.id);
        return (
          <motion.article key={recipe.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }} className="relative w-[10.75rem] shrink-0 snap-start overflow-hidden rounded-md border border-charcoal/10 bg-white md:w-auto">
            <button type="button" onClick={() => openRecipe(recipe.id)} className="group block w-full text-left" aria-label={isAuthenticated ? (locale === "fr" ? `Configurer la recette ${recipe.title}` : `Configure the ${recipe.title} recipe`) : (locale === "fr" ? `Connectez-vous pour configurer la recette ${recipe.title}` : `Sign in to configure the ${recipe.title} recipe`)}>
              <span className="relative block aspect-[4/3] overflow-hidden bg-muted">
                <ProductImage src={getRecipePhoto(recipe)} fallbackSrc="/hero-feast-v2.webp" alt="" emoji={recipe.imageEmoji} color={recipe.imageColor} size="md" className="h-full w-full transition duration-300 group-hover:scale-[1.035]" rounded="rounded-none" />
                <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-burgundy/65 to-transparent" />
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold text-white"><ReiconGlyph icon={Clock} className="h-3 w-3" />{recipe.timeMinutes} min</span>
              </span>
              <span className="block p-2.5">
                <strong className="block line-clamp-2 min-h-8 text-[11px] leading-4 text-charcoal">{recipe.title}</strong>
                <span className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                  <span className="truncate">{recipe.country}</span>
                  <span className="inline-flex shrink-0 items-center gap-1"><ReiconGlyph icon={Users} className="h-3 w-3" />{recipe.baseServings}</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => saveRecipe(recipe.id)}
              aria-pressed={saved}
              aria-label={!isAuthenticated ? (locale === "fr" ? `Connectez-vous pour sauvegarder ${recipe.title}` : `Sign in to save ${recipe.title}`) : saved ? (locale === "fr" ? `Retirer ${recipe.title} des recettes sauvegardées` : `Remove ${recipe.title} from saved recipes`) : (locale === "fr" ? `Sauvegarder ${recipe.title}` : `Save ${recipe.title}`)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-charcoal/10 bg-white/94 text-charcoal shadow-sm hover:text-burgundy"
            >
              <ReiconGlyph icon={isAuthenticated ? Bookmark : Login} weight={saved ? "Filled" : "Outline"} className="h-4 w-4" />
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
