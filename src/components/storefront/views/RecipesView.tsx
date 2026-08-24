"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChefHat, ListChecks, PackageCheck, Search, Sparkles, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { MARKET_PHOTOS } from "@/lib/market-media";

export function RecipesView() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const qs = new URLSearchParams({ locale });
  if (category) qs.set("category", category);
  if (search.trim()) qs.set("q", search.trim());
  const { data, loading } = useFetch(`/api/recipes?${qs.toString()}`, [locale, category, search]);

  const suggestions = locale === "fr"
    ? ["Attiéké poisson", "Sauce gombo", "Mafé", "Kplô", "Plantain", "Dîner rapide"]
    : ["Attieke fish", "Okra sauce", "Mafe", "Kplo", "Plantain", "Quick dinner"];
  const engineCards = [
    { icon: Search, title: locale === "fr" ? "Recherche culinaire" : "Culinary search", value: locale === "fr" ? "plat, ingrédient, pays" : "dish, ingredient, country" },
    { icon: Wand2, title: locale === "fr" ? "Propositions utiles" : "Smart suggestions", value: locale === "fr" ? "substituts et ajouts" : "substitutes and add-ons" },
    { icon: PackageCheck, title: locale === "fr" ? "Panier calculé" : "Calculated basket", value: locale === "fr" ? "formats, coût, restes" : "packs, cost, leftovers" },
    { icon: ListChecks, title: locale === "fr" ? "Étapes de préparation" : "Preparation steps", value: locale === "fr" ? "ordre clair, service fluide" : "clear order, smooth service" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* hero */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-charcoal p-6 text-cream md:p-10">
        <Image src={MARKET_PHOTOS.africanMarket} alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/88 via-charcoal/62 to-charcoal/12" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-charcoal">
            <Sparkles className="h-3 w-3" /> {t.home.heroCtaRecipes}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold md:text-4xl">{t.recipes.title}</h1>
          <p className="mt-1 max-w-2xl text-cream/85">{t.recipes.subtitle}</p>
          <div className="mt-5 max-w-2xl rounded-xl border border-cream/15 bg-cream/12 p-2 backdrop-blur">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-charcoal">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "fr" ? "Rechercher un plat, un ingrédient, une origine..." : "Search a dish, ingredient, origin..."}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setSearch(item)}
                  className="rounded-full border border-cream/20 bg-cream/15 px-2.5 py-1 text-[11px] font-semibold text-cream transition hover:bg-cream/25"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {engineCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-terre/10">
                <Icon className="h-4 w-4 text-terre" />
              </span>
              <h2 className="mt-3 text-sm font-extrabold leading-tight text-charcoal">{card.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.value}</p>
            </motion.div>
          );
        })}
      </section>

      {/* category chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setCategory(null)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${!category ? "bg-terre text-cream" : "bg-card text-charcoal hover:bg-muted border border-border"}`}>
          {t.recipes.all}
        </button>
        {data?.categories?.map((c: any) => (
          <button key={c.slug} onClick={() => setCategory(category === c.slug ? null : c.slug)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${category === c.slug ? "bg-terre text-cream" : "bg-card text-charcoal hover:bg-muted border border-border"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.recipes?.length ? data.recipes.map((r: any, i: number) => <RecipeCard key={r.id} recipe={r} index={i} />) : (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <ChefHat className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-charcoal">{locale === "fr" ? "Aucune recette ne correspond à cette recherche." : "No recipe matches this search."}</p>
              <button onClick={() => { setSearch(""); setCategory(null); }} className="mt-2 text-sm font-semibold text-terre hover:underline">
                {locale === "fr" ? "Réinitialiser le moteur" : "Reset engine"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
