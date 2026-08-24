"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Users, Clock, Flame, Minus, Plus, ShoppingCart, RotateCcw,
  Bookmark, Share2, AlertTriangle, Check, Package, Sparkles, Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductImage } from "@/components/shared/ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch, postJSON } from "@/lib/use-fetch";
import { formatPrice, formatWeight, thermalColor, thermalLabel } from "@/lib/format";
import { formatQty } from "@/lib/recipe-engine";
import { getRecipePhoto } from "@/lib/market-media";
import { toast } from "sonner";

interface CalcResult {
  ingredients: any[];
  totalCost: number;
  costPerPerson: number;
  totalWeightGrams: number;
  thermalSplit: string[];
  packageCount: number;
  steps: { fr: string[]; en: string[] };
  unavailableCount: number;
  leftoverCount: number;
}

export function RecipeConfiguratorView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const addManyToCart = useStore((s) => s.addManyToCart);
  const savedRecipes = useStore((s) => s.savedRecipes);
  const toggleSavedRecipe = useStore((s) => s.toggleSavedRecipe);
  const t = dict[locale];

  const recipeId = params.recipeId;
  const { data: recipe, loading } = useFetch(recipeId ? `/api/recipes/${recipeId}?locale=${locale}` : null, [recipeId, locale]);

  // config state
  const [servings, setServings] = useState(4);
  const [adults, setAdults] = useState(4);
  const [children, setChildren] = useState(0);
  const [portion, setPortion] = useState<"normal" | "generous">("normal");
  const [protein, setProtein] = useState<"meat" | "fish" | "none">("fish");
  const [kplo, setKplo] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState<"mild" | "medium" | "hot" | "veryHot">("medium");
  const [formula, setFormula] = useState<"economy" | "standard" | "premium">("standard");
  const [haveAtHome, setHaveAtHome] = useState<string[]>([]);
  const [packOverrides, setPackOverrides] = useState<Record<string, number>>({});
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const isSaved = savedRecipes.includes(recipeId || "");

  // init defaults from recipe
  useEffect(() => {
    if (recipe) {
      setServings(recipe.baseServings);
      setAdults(recipe.baseServings);
    }
  }, [recipe?.id]);

  // debounced calculation
  const calcKey = useMemo(
    () => JSON.stringify({ servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, packOverrides }),
    [servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, packOverrides]
  );

  const doCalc = useCallback(async () => {
    if (!recipe) return;
    setCalcLoading(true);
    try {
      const res = await postJSON<{ result: CalcResult }>(`/api/recipes/${recipe.id}/calculate?locale=${locale}`, {
        servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, budget: undefined,
      });
      // apply pack overrides after calc
      const ings = res.result.ingredients.map((ing: any) => {
        const ov = packOverrides[ing.productId];
        if (ov !== undefined && ov >= 0) {
          const boughtQty = ov * ing.packWeightGrams;
          return { ...ing, packs: ov, boughtQty, boughtLabel: `${ov} × ${ing.packLabel}`, leftover: Math.max(0, boughtQty - ing.neededQty * (ing.neededUnit === "kg" ? 1000 : ing.neededUnit === "L" ? 1000 : 1)), lineTotal: ov * ing.unitPrice };
        }
        return ing;
      });
      const totalCost = ings.reduce((s: number, i: any) => s + (i.removed ? 0 : i.lineTotal), 0);
      const totalWeight = ings.reduce((s: number, i: any) => s + (i.removed ? 0 : i.boughtQty), 0);
      setCalc({ ...res.result, ingredients: ings, totalCost, totalWeightGrams: totalWeight, costPerPerson: servings > 0 ? totalCost / servings : totalCost });
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  }, [recipe, servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, packOverrides, locale]);

  useEffect(() => {
    const id = setTimeout(doCalc, 200);
    return () => clearTimeout(id);
  }, [calcKey]);

  const toggleHave = (pid: string) => {
    setHaveAtHome((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);
  };
  const setPack = (pid: string, delta: number) => {
    setPackOverrides((prev) => {
      const ing = calc?.ingredients.find((i) => i.productId === pid);
      if (!ing) return prev;
      const current = prev[pid] ?? ing.packs;
      const next = Math.max(0, current + delta);
      return { ...prev, [pid]: next };
    });
  };
  const resetOverrides = () => { setPackOverrides({}); toast.success(locale === "fr" ? "Panier réinitialisé" : "Basket reset"); };

  const addAllToCart = () => {
    if (!calc || !recipe) return;
    const items = calc.ingredients
      .filter((i) => !i.removed && i.packs > 0)
      .map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: locale === "en" ? i.nameEn : i.nameFr,
        nameFr: i.nameFr,
        nameEn: i.nameEn,
        unitPrice: i.unitPrice,
        unitLabel: i.packLabel,
        packWeightGrams: i.packWeightGrams,
        thermalClass: i.thermalClass,
        qty: i.packs,
        recipeId: recipe.id,
        recipeName: recipe.title,
        maxStock: i.stockQty || 99,
      }));
    addManyToCart(items);
    toast.success(locale === "fr" ? `Recette ajoutée au panier (${items.length} produits)` : `Recipe added to cart (${items.length} products)`);
    navigate("cart");
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!recipe) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Recette introuvable.</div>;

  const diff = recipe.difficulty === "easy" ? t.recipes.easy : recipe.difficulty === "hard" ? t.recipes.hard : t.recipes.medium;
  const recipePhoto = getRecipePhoto(recipe);
  const preparationSteps = calc?.steps?.[locale as "fr" | "en"] || recipe.steps || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
      <button onClick={() => navigate("recipes")} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-terre">
        <ChevronLeft className="h-4 w-4" /> {t.back}
      </button>

      {/* recipe header */}
      <div className="mb-5 grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-[240px_1fr]">
        <div className="relative aspect-[4/3] md:aspect-auto">
          <ProductImage
            src={recipePhoto}
            alt={recipe.title}
            emoji={recipe.imageEmoji}
            color={recipe.imageColor}
            size="xl"
            priority
            className="h-full w-full"
          />
        </div>
        <div className="p-5 md:p-6">
          <Badge variant="outline" className="mb-2">{recipe.country}</Badge>
          <h1 className="text-2xl font-extrabold text-charcoal md:text-3xl">{recipe.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{recipe.description}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:max-w-md">
            <RecipeMetric icon={Users} label={t.config.peopleUnit} value={String(recipe.baseServings)} />
            <RecipeMetric icon={Clock} label="min" value={String(recipe.timeMinutes)} />
            <RecipeMetric icon={Flame} label={locale === "fr" ? "niveau" : "level"} value={diff} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* LEFT: config form */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-terre" />
              <h2 className="text-sm font-bold text-charcoal">{t.config.title}</h2>
            </div>

            {/* people */}
            <div className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.stepPeople}</p>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center rounded-full border border-border">
                  <button onClick={() => { const n = Math.max(1, servings - 1); setServings(n); setAdults(n); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-10 text-center text-lg font-bold">{servings}</span>
                  <button onClick={() => { const n = Math.min(24, servings + 1); setServings(n); setAdults(n); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><Plus className="h-4 w-4" /></button>
                </div>
                <span className="text-xs text-muted-foreground">{t.config.peopleUnit}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">{t.config.adults}
                  <input type="number" min={0} value={adults} onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))} className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-muted-foreground">{t.config.children}
                  <input type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))} className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
                </label>
              </div>
              <div className="flex gap-1">
                {(["normal", "generous"] as const).map((p) => (
                  <button key={p} onClick={() => setPortion(p)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${portion === p ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    {t.config[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* protein */}
            <div className="space-y-2 border-b border-border py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.protein}</p>
              <div className="flex gap-1">
                {([["fish", t.config.fish], ["meat", t.config.meat], ["none", t.config.none]] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setProtein(v)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${protein === v ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-charcoal">
                <input type="checkbox" checked={kplo} onChange={(e) => setKplo(e.target.checked)} className="accent-terre" />
                {t.config.addKplo}
              </label>
            </div>

            {/* spice */}
            <div className="space-y-2 border-b border-border py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.spiceLevel} 🌶️</p>
              <div className="flex gap-1">
                {([["mild", t.config.mild], ["medium", t.config.medium], ["hot", t.config.hot], ["veryHot", t.config.veryHot]] as const).map(([v, label], i) => (
                  <button key={v} onClick={() => setSpiceLevel(v)} className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition ${spiceLevel === v ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    {"🌶️".repeat(i + 1)} <span className="block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* formula */}
            <div className="space-y-2 border-b border-border py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.formula}</p>
              <div className="flex gap-1">
                {([["economy", t.config.economy], ["standard", t.config.standard], ["premium", t.config.premium]] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setFormula(v)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${formula === v ? "bg-forest text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* have at home */}
            <div className="space-y-2 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.alreadyHave}</p>
              <div className="max-h-40 space-y-1 overflow-y-auto scroll-pretty">
                {recipe.ingredients?.map((ri: any) => (
                  <label key={ri.productId} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-charcoal hover:bg-muted">
                    <input type="checkbox" checked={haveAtHome.includes(ri.productId)} onChange={() => toggleHave(ri.productId)} className="accent-terre" />
                    <span className="text-base">{ri.product.emoji}</span>
                    <span className="flex-1 truncate">{locale === "en" ? ri.product.nameEn : ri.product.nameFr}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: results */}
        <div className="min-w-0 space-y-5">
          {/* steps accordion */}
          {preparationSteps.length > 0 && (
            <Accordion type="single" collapsible defaultValue="steps" className="rounded-2xl border border-border bg-card px-2">
              <AccordionItem value="steps" className="border-0">
                <AccordionTrigger className="px-3 text-sm font-bold text-charcoal">
                  <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> {locale === "fr" ? "Étapes de préparation" : "Preparation steps"} · {preparationSteps.length}</span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <ol className="grid gap-2 md:grid-cols-2">
                    {preparationSteps.map((s: string, i: number) => (
                      <li key={i} className="flex gap-3 rounded-lg border border-border bg-muted/25 p-3 text-sm text-charcoal">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-terre text-xs font-bold text-cream">{i + 1}</span>
                        <span className="pt-0.5 leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* ingredients table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-charcoal">{t.config.ingredientsNeeded}</h2>
              {Object.keys(packOverrides).length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetOverrides} className="text-xs text-terre">
                  <RotateCcw className="mr-1 h-3 w-3" /> {t.config.reset}
                </Button>
              )}
            </div>
            <div className="divide-y divide-border">
              {calc?.ingredients.map((ing) => (
                <IngredientRow key={ing.productId} ing={ing} locale={locale} onPackDelta={(d) => setPack(ing.productId, d)} />
              ))}
              {calcLoading && !calc && <div className="p-6 text-center text-sm text-muted-foreground">{t.loading}</div>}
            </div>
          </div>

          {/* summary card */}
          {calc && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-terre/30 bg-gradient-to-br from-cream to-cream/50 p-5">
              <h2 className="mb-3 text-sm font-bold text-charcoal">{t.config.summary}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t.config.totalCost}</p>
                  <p className="text-2xl font-extrabold text-terre">{formatPrice(calc.totalCost, locale)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.config.costPerPerson}</p>
                  <p className="text-2xl font-extrabold text-forest">{formatPrice(calc.costPerPerson, locale)}</p>
                  <p className="text-[10px] text-muted-foreground">{servings} {t.config.peopleUnit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.config.totalWeight}</p>
                  <p className="text-lg font-bold text-charcoal">{formatWeight(calc.totalWeightGrams, locale)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.cart.packages}</p>
                  <p className="text-lg font-bold text-charcoal">{calc.packageCount}</p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {calc.thermalSplit.map((tc) => (
                      <span key={tc} className={`inline-flex items-center rounded border px-1 py-0.5 text-[9px] ${thermalColor(tc)}`}>{thermalLabel(tc, locale)}</span>
                    ))}
                  </div>
                </div>
              </div>

              {calc.unavailableCount > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{locale === "fr" ? `${calc.unavailableCount} produit(s) indisponible(s) — substituts proposés.` : `${calc.unavailableCount} product(s) unavailable — substitutes suggested.`}</span>
                </div>
              )}
              {calc.leftoverCount > 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{locale === "fr" ? `${calc.leftoverCount} produit(s) génèrent un reste réutilisable.` : `${calc.leftoverCount} product(s) yield reusable leftovers.`}</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={addAllToCart} size="lg" className="flex-1 bg-terre text-cream hover:bg-terre-dark shadow-md">
                  <ShoppingCart className="mr-2 h-4 w-4" /> {t.config.addAllToCart}
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11 border-terre/40" onClick={() => { toggleSavedRecipe(recipe.id); toast.success(isSaved ? (locale === "fr" ? "Recette retirée" : "Recipe removed") : (locale === "fr" ? "Recette sauvegardée" : "Recipe saved")); }} aria-label={t.config.saveRecipe}>
                  <Bookmark className={`h-5 w-5 ${isSaved ? "fill-terre text-terre" : "text-charcoal"}`} />
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => toast.success(locale === "fr" ? "Lien copié !" : "Link copied!")} aria-label={t.config.shareRecipe}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeMetric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/35 px-3 py-2">
      <Icon className="mx-auto h-4 w-4 text-terre" />
      <p className="mt-1 truncate text-sm font-extrabold text-charcoal">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function IngredientRow({ ing, locale, onPackDelta }: { ing: any; locale: string; onPackDelta: (d: number) => void }) {
  const t = dict[locale as "fr" | "en"];
  const roleColor: Record<string, string> = {
    protein: "bg-red-100 text-red-700", base: "bg-amber-100 text-amber-700", aromatic: "bg-green-100 text-green-700",
    spice: "bg-orange-100 text-orange-700", fat: "bg-yellow-100 text-yellow-700", side: "bg-blue-100 text-blue-700", optional: "bg-gray-100 text-gray-600",
  };
  const roleLabel: Record<string, [string, string]> = {
    protein: ["Protéine", "Protein"], base: ["Base", "Base"], aromatic: ["Aromate", "Aromatic"], spice: ["Épice", "Spice"], fat: ["Matière grasse", "Fat"], side: ["Accompagnement", "Side"], optional: ["Optionnel", "Optional"],
  };

  return (
    <div className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${ing.removed ? "opacity-50" : ""}`}>
      <div className="flex flex-1 items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg text-xl" style={{ background: ing.color + "22" }}>{ing.emoji}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-charcoal">{locale === "en" ? ing.nameEn : ing.nameFr}</p>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${roleColor[ing.role] || "bg-gray-100 text-gray-600"}`}>
              {(roleLabel[ing.role] || ["", ""])[locale === "en" ? 1 : 0]}
            </span>
            {ing.optional && <span className="text-[9px] text-muted-foreground">· {t.config.ingredient}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* needed */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">{t.config.neededQty}</p>
          <p className="font-semibold text-charcoal">{formatQty(ing.neededQty, ing.neededUnit, locale as any)}</p>
        </div>
        <span className="text-muted-foreground">→</span>
        {/* packs stepper */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">{t.config.packs}</p>
          {!ing.removed ? (
            <div className="inline-flex items-center rounded-full border border-border">
              <button onClick={() => onPackDelta(-1)} disabled={ing.packs <= 0} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted disabled:opacity-40"><Minus className="h-3 w-3" /></button>
              <span className="min-w-7 text-center font-semibold">{ing.packs}</span>
              <button onClick={() => onPackDelta(1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"><Plus className="h-3 w-3" /></button>
            </div>
          ) : <span className="text-gold">{t.config.removedHave}</span>}
        </div>
        {/* leftover */}
        <div className="hidden text-center sm:block">
          <p className="text-[10px] text-muted-foreground">{t.config.leftover}</p>
          <p className="font-medium text-blue-700">{ing.leftover > 0 ? formatQty(ing.leftover, ing.neededUnit === "kg" ? "g" : ing.neededUnit === "L" ? "ml" : ing.neededUnit, locale as any) : "—"}</p>
        </div>
        {/* line total */}
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">{t.config.lineTotal}</p>
          <p className="font-bold text-terre">{formatPrice(ing.lineTotal, locale as any)}</p>
        </div>
      </div>

      {/* availability / substitute */}
      {!ing.removed && (
        <div className="sm:w-32">
          {ing.available ? (
            <Badge variant="outline" className="w-full justify-center border-forest/40 bg-forest/5 text-forest"><Check className="mr-1 h-3 w-3" /> {t.config.inStockOk}</Badge>
          ) : ing.substituteName ? (
            <Badge variant="outline" className="w-full justify-center border-amber-400 bg-amber-50 text-amber-700">
              <AlertTriangle className="mr-1 h-3 w-3" /> {t.config.substitute}: {ing.substituteName}
            </Badge>
          ) : (
            <Badge variant="outline" className="w-full justify-center border-destructive/40 bg-red-50 text-destructive">{t.config.unavailable}</Badge>
          )}
        </div>
      )}
    </div>
  );
}
