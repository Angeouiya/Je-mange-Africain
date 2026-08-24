"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChefHat, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { RecipeCard } from "@/components/shared/RecipeCard";

export function RecipesView() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const [category, setCategory] = useState<string | null>(null);

  const qs = new URLSearchParams({ locale });
  if (category) qs.set("category", category);
  const { data, loading } = useFetch(`/api/recipes?${qs.toString()}`, [locale, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* hero */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-forest to-forest-dark p-6 text-cream md:p-10">
        <div className="african-dots absolute inset-0 opacity-20" />
        <div className="relative">
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-charcoal">
            <Sparkles className="h-3 w-3" /> {t.home.heroCtaRecipes}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold md:text-4xl">{t.recipes.title}</h1>
          <p className="mt-1 max-w-2xl text-cream/85">{t.recipes.subtitle}</p>
        </div>
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
          {data?.recipes?.map((r: any, i: number) => <RecipeCard key={r.id} recipe={r} index={i} />)}
        </div>
      )}
    </div>
  );
}
