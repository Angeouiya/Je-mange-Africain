"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Truck, Snowflake, ShieldCheck, Headphones, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryPhoto } from "@/lib/market-media";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

export function HomeView() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const { data, loading } = useFetch(`/api/catalog?section=home&locale=${locale}`);

  const commitments = [
    { icon: ShieldCheck, title: t.home.commitment1Title, desc: t.home.commitment1Desc, color: "#3F681C" },
    { icon: Snowflake, title: t.home.commitment2Title, desc: t.home.commitment2Desc, color: "#3F681C" },
    { icon: Truck, title: t.home.commitment3Title, desc: t.home.commitment3Desc, color: "#D65A32" },
    { icon: Headphones, title: t.home.commitment4Title, desc: t.home.commitment4Desc, color: "#F2A900" },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/hero-feast-v2.webp" alt="" fill sizes="100vw" className="object-cover object-[63%_center] md:object-center" priority />
          <div className="absolute inset-0 bg-charcoal/55 md:bg-gradient-to-r md:from-charcoal/88 md:via-charcoal/58 md:to-charcoal/10" />
        </div>
        <div className="relative mx-auto flex min-h-[48svh] max-w-4xl flex-col justify-center gap-5 px-4 py-10 md:min-h-[500px] md:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="border-0 bg-terre/90 text-cream shadow-lg">
              <Sparkles className="mr-1 h-3 w-3" /> {t.home.heroBadge}
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl text-3xl font-extrabold leading-tight text-cream sm:text-4xl"
          >
            {t.home.heroTitle.split("\n").map((line, i) => (
              <span key={i} className="block">{i === 1 ? <span className="text-gold">{line}</span> : line}</span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl text-sm leading-6 text-cream/90 sm:text-base"
          >
            {t.home.heroSubtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Button size="lg" onClick={() => navigate("catalog")} className="bg-terre text-cream hover:bg-terre-dark shadow-lg">
              {t.home.heroCtaCatalog} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("recipes")} className="border-cream/40 bg-cream/10 text-cream backdrop-blur hover:bg-cream/20">
              {t.home.heroCtaRecipes}
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* CATEGORIES */}
        <Section title={t.home.shopByCategory} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              {data?.categories?.map((c: any, i: number) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate("catalog", { category: c.id })}
                  className="group relative flex min-h-32 flex-col justify-end overflow-hidden rounded-xl border border-border bg-charcoal p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Image src={getCategoryPhoto(c)} alt="" fill sizes="(max-width: 768px) 50vw, 160px" className="object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-charcoal/82 via-charcoal/30 to-transparent" />
                  <CategoryIcon slug={c.slug} color={c.color} className="relative h-10 w-10" />
                  <span className="relative mt-2 text-xs font-bold leading-tight text-cream">{c.name}</span>
                </motion.button>
              ))}
            </div>
          )}
        </Section>

        {/* BESTSELLERS */}
        <Section title={t.home.bestsellers} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <GridSkeleton /> : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {data?.bestsellers?.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </Section>

        {/* RECIPES */}
        <Section title={t.home.popularRecipes} actionLabel={t.viewAll} onAction={() => navigate("recipes")}>
          {loading ? <GridSkeleton /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.popularRecipes?.map((r: any, i: number) => <RecipeCard key={r.id} recipe={r} index={i} />)}
            </div>
          )}
        </Section>

        {/* PROMO BANNER */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest to-forest-dark p-6 md:p-10">
          <div className="african-dots absolute inset-0 opacity-20" />
          <div className="relative flex flex-col items-start gap-4 text-cream md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-2 bg-gold text-charcoal border-0">{t.promo}</Badge>
              <h2 className="text-2xl font-bold md:text-3xl">{locale === "fr" ? "Configurateur de recettes intelligentes" : "Smart recipe configurator"}</h2>
              <p className="mt-1 max-w-lg text-cream/80">{t.recipes.subtitle}</p>
            </div>
            <Button size="lg" onClick={() => navigate("recipes")} className="bg-terre text-cream hover:bg-terre-dark shadow-lg">
              {t.home.heroCtaRecipes} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* ON SALE + NEW */}
        <Section title={t.home.onSale} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <GridSkeleton /> : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {data?.onSale?.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </Section>

        <Section title={t.home.newProducts} actionLabel={t.viewAll} onAction={() => navigate("catalog")}>
          {loading ? <GridSkeleton /> : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {data?.news?.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </Section>

        {/* COMMITMENTS */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-charcoal md:text-3xl">{t.home.commitmentsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.home.commitmentsSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl" style={{ background: c.color + "22" }}>
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
        <section className="rounded-2xl border border-border bg-cream p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-terre/15">
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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal md:text-2xl">{title}</h2>
        {actionLabel && onAction && (
          <button onClick={onAction} className="inline-flex items-center gap-1 text-sm font-medium text-terre hover:underline">
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
    </div>
  );
}
