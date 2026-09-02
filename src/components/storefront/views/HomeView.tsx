"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Truck, Snowflake, ShieldCheck, Headphones, ChevronRight, Sparkles, BadgePercent, PackageOpen, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryPhoto, getDiscountPercent, getProductPhoto } from "@/lib/market-media";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { ProductImage } from "@/components/shared/ProductImage";
import { formatPrice } from "@/lib/format";

export function HomeView() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const { data, loading } = useFetch(`/api/catalog?section=home&locale=${locale}`);
  const { data: advertisingData } = useFetch(`/api/advertisements?placement=home&locale=${locale}`, [locale]);
  const homeAdvertisement = advertisingData?.advertisements?.[0];

  const commitments = [
    { icon: ShieldCheck, title: t.home.commitment1Title, desc: t.home.commitment1Desc, color: "#3F681C" },
    { icon: Snowflake, title: t.home.commitment2Title, desc: t.home.commitment2Desc, color: "#3F681C" },
    { icon: Truck, title: t.home.commitment3Title, desc: t.home.commitment3Desc, color: "#D65A32" },
    { icon: Headphones, title: t.home.commitment4Title, desc: t.home.commitment4Desc, color: "#F2A900" },
  ];

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/hero-feast-v2.webp" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className="object-cover object-[63%_center] md:object-center" />
          <div className="absolute inset-0 bg-charcoal/58 md:bg-gradient-to-r md:from-charcoal/92 md:via-charcoal/60 md:to-charcoal/10" />
        </div>
        <div className="relative mx-auto flex min-h-[28rem] max-w-7xl flex-col justify-center gap-4 px-5 py-8 md:min-h-[34rem] md:gap-5 md:px-10 md:py-20 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="border-0 bg-transparent p-0 text-[10px] font-extrabold uppercase text-gold shadow-none">
              <Sparkles className="mr-1 h-3 w-3" /> {t.home.heroBadge}
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-3xl font-display text-[2rem] font-semibold leading-[1.05] text-white sm:text-5xl sm:leading-[1.02] lg:text-[4rem]"
          >
            {t.home.heroTitle.split("\n").map((line, i) => (
              <span key={i} className="sm:block">{i > 0 ? " " : null}{i === 1 ? <span className="text-gold">{line}</span> : line}</span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl text-sm leading-6 text-white/82 sm:text-base sm:leading-7"
          >
            {t.home.heroSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3"
          >
            <Button size="lg" onClick={() => navigate("catalog")} className="h-11 bg-terre px-5 text-white shadow-lg hover:bg-terre-dark sm:h-12">
              {t.home.heroCtaCatalog} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("recipes")} className="h-11 border-white/35 bg-white/8 px-5 text-white backdrop-blur hover:bg-white/16 hover:text-white sm:h-12">
              {t.home.heroCtaRecipes}
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 pt-8 md:space-y-20 md:px-7 md:pt-16 lg:px-8">
        {/* CATEGORIES */}
        <Section title={t.home.shopByCategory} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:px-0 lg:grid-cols-8">
              {data?.categories?.map((c: any, i: number) => (
                <motion.button
                  key={c.id}
                  initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate("catalog", { category: c.id })}
                  className="group relative flex min-h-40 w-36 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-lg border border-charcoal/10 bg-charcoal p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-lg md:w-auto"
                >
                  <Image src={getCategoryPhoto(c)} alt="" fill sizes="(max-width: 768px) 50vw, 160px" className="object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-charcoal/92 via-charcoal/28 to-transparent" />
                  <CategoryIcon slug={c.slug} color={c.color} className="relative h-9 w-9 border-white/25 bg-white/92" />
                  <span className="relative mt-2 line-clamp-2 min-h-8 text-xs font-extrabold leading-4 text-white">{c.name}</span>
                </motion.button>
              ))}
            </div>
          )}
        </Section>

        {/* BESTSELLERS */}
        <Section title={t.home.bestsellers} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <GridSkeleton /> : (
            <ProductRail products={data?.bestsellers || []} />
          )}
        </Section>

        {/* RECIPES */}
        <Section title={t.home.popularRecipes} actionLabel={t.viewAll} onAction={() => navigate("recipes")}>
          {loading ? <GridSkeleton /> : (
            <RecipeRail recipes={data?.popularRecipes || []} />
          )}
        </Section>

        {/* PROMO BANNER */}
        <section className="relative min-h-72 overflow-hidden rounded-lg border border-charcoal/8">
          <Image src={homeAdvertisement?.imageUrl || "/hero.jpg"} alt={homeAdvertisement?.imageAlt || ""} fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" />
          <div className="absolute inset-0 bg-charcoal/68" />
          <div className="relative flex min-h-72 flex-col items-start justify-end gap-5 p-6 text-white md:flex-row md:items-end md:justify-between md:p-10">
            <div>
              <Badge className="mb-2 bg-gold text-charcoal border-0">{t.promo}</Badge>
              <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl">{homeAdvertisement?.title || (locale === "fr" ? "Configurateur de recettes intelligentes" : "Smart recipe configurator")}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/72">{homeAdvertisement?.body || t.recipes.subtitle}</p>
            </div>
            <Button size="lg" onClick={() => homeAdvertisement?.linkUrl ? window.location.assign(homeAdvertisement.linkUrl) : navigate("recipes")} className="bg-terre text-cream hover:bg-terre-dark shadow-lg">
              {homeAdvertisement ? (locale === "fr" ? "Découvrir" : "Discover") : t.home.heroCtaRecipes} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* COMMERCIAL PULSE */}
        {loading ? <GridSkeleton /> : <MarketPulse deals={data?.onSale || []} news={data?.news || []} locale={locale} />}

        {/* COMMITMENTS */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="jma-section-title">{t.home.commitmentsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.home.commitmentsSubtitle}</p>
          </div>
          <div className="grid border-y border-charcoal/10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-charcoal/10">
            {commitments.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  initial={{ y: 10 }} animate={{ y: 0 }} transition={{ delay: i * 0.08 }}
                  className="border-b border-charcoal/10 px-1 py-6 last:border-b-0 sm:px-5 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:px-6"
                >
                  <span className="mb-4 grid h-10 w-10 place-items-center rounded-md" style={{ background: c.color + "18" }}>
                    <Icon className="h-5 w-5" style={{ color: c.color }} />
                  </span>
                  <h3 className="text-sm font-bold text-charcoal">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* DELIVERY INFO */}
        <section className="rounded-lg border border-forest/18 bg-forest/[0.045] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-terre/12">
                <Truck className="h-6 w-6 text-terre" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-charcoal">{t.home.deliveryInfoTitle}</h3>
                <p className="max-w-xl text-sm text-muted-foreground">{t.home.deliveryInfoDesc}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("info", { infoPage: "delivery" })} className="border-terre text-terre hover:bg-terre hover:text-cream">
              {locale === "fr" ? "En savoir plus" : "Learn more"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({ title, actionLabel, onAction, children }: { title: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4 border-b border-charcoal/10 pb-3">
        <h2 className="jma-section-title">{title}</h2>
        {actionLabel && onAction && (
          <button onClick={onAction} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-extrabold text-terre hover:underline">
            {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-[72vw] max-w-72 shrink-0 rounded-lg md:w-auto" />)}
    </div>
  );
}

function ProductRail({ products }: { products: any[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:px-0 lg:grid-cols-5">
      {products.map((product, index) => (
        <div key={product.id} className="w-[58vw] max-w-52 shrink-0 snap-start md:w-auto md:max-w-none">
          <ProductCard product={product} index={index} compact />
        </div>
      ))}
    </div>
  );
}

function RecipeRail({ recipes }: { recipes: any[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
      {recipes.map((recipe, index) => (
        <div key={recipe.id} className="w-[84vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
          <RecipeCard recipe={recipe} index={index} />
        </div>
      ))}
    </div>
  );
}

function MarketPulse({ deals, news, locale }: { deals: any[]; news: any[]; locale: "fr" | "en" }) {
  const navigate = useStore((s) => s.navigate);
  const deal = deals[0];
  const arrivals = news.filter((product) => product.id !== deal?.id).slice(0, 3);
  if (!deal && !arrivals.length) return null;

  const dealPrice = deal ? deal.promoPrice ?? deal.price : 0;
  const discount = deal ? getDiscountPercent(deal.price, deal.promoPrice) : 0;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-terre">{locale === "fr" ? "Sélection commerciale" : "Commercial selection"}</p>
          <h2 className="jma-section-title mt-1">{locale === "fr" ? "L'actualité du marché" : "Market now"}</h2>
        </div>
        <button onClick={() => navigate("catalog")} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-terre hover:underline">
          {locale === "fr" ? "Tout explorer" : "Explore all"} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid overflow-hidden rounded-lg border border-black/8 bg-white lg:grid-cols-[1.1fr_0.9fr]">
        {deal ? (
          <button type="button" onClick={() => navigate("product", { productId: deal.id })} className="group relative min-h-64 overflow-hidden text-left sm:min-h-72">
            <ProductImage src={getProductPhoto(deal)} alt={deal.name} emoji={deal.imageEmoji} color={deal.imageColor} size="lg" className="h-full w-full transition duration-500 group-hover:scale-[1.025]" rounded="rounded-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-charcoal/92 via-charcoal/42 to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center rounded-md bg-destructive px-2.5 py-1.5 text-xs font-black text-white shadow-lg"><BadgePercent className="mr-1.5 h-4 w-4" />-{discount}%</span>
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
              <span className="min-w-0"><span className="block text-[10px] font-bold uppercase text-gold">{locale === "fr" ? "Prix du moment" : "Current deal"}</span><span className="mt-1 block truncate text-xl font-black">{deal.name}</span><span className="mt-1 flex items-baseline gap-2"><strong className="text-2xl font-black">{formatPrice(dealPrice, locale)}</strong>{deal.promoPrice ? <span className="text-xs text-white/55 line-through">{formatPrice(deal.price, locale)}</span> : null}</span></span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-charcoal transition-transform group-hover:translate-x-0.5"><ArrowUpRight className="h-5 w-5" /></span>
            </span>
          </button>
        ) : null}

        <div className="flex flex-col border-t border-black/8 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-3 border-b border-black/8 px-4 py-4 sm:px-5"><span className="grid h-9 w-9 place-items-center rounded-md bg-gold/18 text-amber-800"><PackageOpen className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-charcoal">{locale === "fr" ? "Arrivages récents" : "Recent arrivals"}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{locale === "fr" ? "Nouveaux formats et produits à découvrir" : "New products and pack sizes to discover"}</p></div></div>
          <div className="flex-1 divide-y divide-border">
            {arrivals.map((product) => (
              <button key={product.id} type="button" onClick={() => navigate("product", { productId: product.id })} className="group grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/45 sm:px-5">
                <ProductImage src={getProductPhoto(product)} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-16 w-16" rounded="rounded-md" />
                <span className="min-w-0"><span className="block truncate text-xs font-black text-charcoal">{product.name}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{product.country || (locale === "fr" ? "Sélection africaine" : "African selection")}</span><strong className="mt-1 block text-sm text-terre">{formatPrice(product.promoPrice ?? product.price, locale)}</strong></span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-terre" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
