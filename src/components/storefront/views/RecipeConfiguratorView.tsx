"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users, Clock, Flame, Minus, Plus, ShoppingCart, RotateCcw,
  Bookmark, Share2, AlertTriangle, Check, Package, Sparkles, Sliders,
  Trash2, Undo2, RefreshCw, House, ChevronDown,
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
import { shareRecipe } from "@/lib/client-actions";
import { PageBackButton } from "@/components/shared/PageBackButton";
import { absoluteUrl, ClientSeo } from "@/components/shared/ClientSeo";

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
  const [adults, setAdults] = useState(4);
  const [children, setChildren] = useState(0);
  const [portion, setPortion] = useState<"normal" | "generous">("normal");
  const [protein, setProtein] = useState<"recipe" | "meat" | "fish" | "none">("recipe");
  const [kplo, setKplo] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState<"mild" | "medium" | "hot" | "veryHot">("medium");
  const [formula, setFormula] = useState<"economy" | "standard" | "premium">("standard");
  const [haveAtHome, setHaveAtHome] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [packOverrides, setPackOverrides] = useState<Record<string, number>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [shared, setShared] = useState(false);
  const calcRequestRef = useRef(0);

  const servings = Math.max(1, adults + children);

  const isSaved = savedRecipes.includes(recipeId || "");

  // init defaults from recipe
  useEffect(() => {
    if (recipe) {
      setAdults(recipe.baseServings);
      setChildren(0);
      setCompletedSteps([]);
    }
  }, [recipe?.id]);

  // debounced calculation
  const calcKey = useMemo(
    () => JSON.stringify({ servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, excludedIngredients, replacements, packOverrides }),
    [servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, excludedIngredients, replacements, packOverrides]
  );

  const doCalc = useCallback(async () => {
    if (!recipe) return;
    const requestId = ++calcRequestRef.current;
    setCalcLoading(true);
    setCalcError("");
    try {
      const res = await postJSON<{ result: CalcResult }>(`/api/recipes/${recipe.id}/calculate?locale=${locale}`, {
        servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, excludedIngredients, replacements, allergies: "", budget: undefined,
      });
      if (requestId !== calcRequestRef.current) return;
      // apply pack overrides after calc
      const ings = res.result.ingredients.map((ing: any) => {
        const ov = packOverrides[ing.recipeIngredientId];
        if (ov !== undefined && ov >= 0) {
          const boughtQty = ov * ing.packWeightGrams;
          const neededBase = ing.neededQty * (ing.neededUnit === "kg" || ing.neededUnit === "L" ? 1000 : ing.neededUnit === "tbsp" ? 15 : ing.neededUnit === "tsp" ? 5 : 1);
          const leftover = ing.neededUnit === "piece" ? Math.max(0, ov - ing.neededQty) : Math.max(0, boughtQty - neededBase);
          return { ...ing, packs: ov, boughtQty, boughtLabel: `${ov} × ${ing.packLabel}`, leftover, lineTotal: ov * ing.unitPrice, available: ov > 0 ? ov <= ing.stockQty : true };
        }
        return ing;
      });
      const totalCost = ings.reduce((s: number, i: any) => s + (i.removed ? 0 : i.lineTotal), 0);
      const totalWeight = ings.reduce((s: number, i: any) => s + (i.removed ? 0 : i.boughtQty), 0);
      const activeIngredients = ings.filter((ingredient: any) => !ingredient.removed && ingredient.packs > 0);
      const thermalSplit = Array.from(new Set(activeIngredients.map((ingredient: any) => ingredient.thermalClass))) as string[];
      setCalc({
        ...res.result,
        ingredients: ings,
        totalCost,
        totalWeightGrams: totalWeight,
        costPerPerson: servings > 0 ? totalCost / servings : totalCost,
        thermalSplit,
        packageCount: thermalSplit.length,
        unavailableCount: activeIngredients.filter((ingredient: any) => !ingredient.available).length,
        leftoverCount: activeIngredients.filter((ingredient: any) => ingredient.leftover > 0).length,
      });
    } catch {
      if (requestId === calcRequestRef.current) setCalcError(locale === "fr" ? "Le calcul n'a pas abouti. Vérifiez vos choix puis réessayez." : "The calculation could not be completed. Check your choices and try again.");
    } finally {
      if (requestId === calcRequestRef.current) setCalcLoading(false);
    }
  }, [recipe, servings, adults, children, portion, protein, kplo, spiceLevel, formula, haveAtHome, excludedIngredients, replacements, packOverrides, locale]);

  useEffect(() => {
    const id = setTimeout(doCalc, 200);
    return () => clearTimeout(id);
  }, [calcKey, doCalc]);

  const toggleHave = (ingredientId: string) => {
    const adding = !haveAtHome.includes(ingredientId);
    setHaveAtHome((previous) => adding ? [...previous, ingredientId] : previous.filter((id) => id !== ingredientId));
    if (adding) setExcludedIngredients((items) => items.filter((id) => id !== ingredientId));
  };
  const toggleExcluded = (ingredientId: string) => {
    const adding = !excludedIngredients.includes(ingredientId);
    setExcludedIngredients((previous) => adding ? [...previous, ingredientId] : previous.filter((id) => id !== ingredientId));
    if (adding) setHaveAtHome((items) => items.filter((id) => id !== ingredientId));
  };
  const setReplacement = (ingredientId: string, productId: string) => {
    setReplacements((previous) => ({ ...previous, [ingredientId]: productId }));
    setPackOverrides((previous) => {
      const next = { ...previous };
      delete next[ingredientId];
      return next;
    });
  };
  const setPack = (ingredientId: string, delta: number) => {
    setPackOverrides((prev) => {
      const ing = calc?.ingredients.find((i) => i.recipeIngredientId === ingredientId);
      if (!ing) return prev;
      const current = prev[ingredientId] ?? ing.packs;
      const next = Math.max(0, Math.min(ing.stockQty, current + delta));
      return { ...prev, [ingredientId]: next };
    });
  };
  const resetOverrides = () => {
    setPackOverrides({});
    setExcludedIngredients([]);
    setReplacements({});
    setHaveAtHome([]);
    setAdults(recipe?.baseServings || 4);
    setChildren(0);
    setPortion("normal");
    setProtein("recipe");
    setKplo(false);
    setSpiceLevel("medium");
    setFormula("standard");
  };
  const updateAdults = (value: number) => setAdults(Math.max(children === 0 ? 1 : 0, Math.min(24 - children, value)));
  const updateChildren = (value: number) => setChildren(Math.max(adults === 0 ? 1 : 0, Math.min(24 - adults, value)));
  const hasManualChoices = haveAtHome.length > 0 || excludedIngredients.length > 0 || Object.keys(replacements).length > 0 || Object.keys(packOverrides).length > 0 || adults !== (recipe?.baseServings || 4) || children !== 0 || portion !== "normal" || protein !== "recipe" || kplo || spiceLevel !== "medium" || formula !== "standard";
  const toggleStep = (index: number) => setCompletedSteps((previous) => previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index]);

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
        imageColor: i.color,
        imageEmoji: i.emoji,
        imageUrl: i.imageUrl,
      }));
    addManyToCart(items);
    navigate("cart");
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96 rounded-lg" /></div>;
  if (!recipe) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Recette introuvable.</div>;

  const diff = recipe.difficulty === "easy" ? t.recipes.easy : recipe.difficulty === "hard" ? t.recipes.hard : t.recipes.medium;
  const recipePhoto = getRecipePhoto(recipe);
  const preparationSteps = calc?.steps?.[locale as "fr" | "en"] || recipe.steps || [];
  const completedStepCount = completedSteps.filter((index) => index < preparationSteps.length).length;
  const preparationAdjustments = (calc?.ingredients || []).filter((ingredient) => ingredient.removalReason === "excluded" || ingredient.removalReason === "protein-none" || ingredient.isReplacement);
  const purchasableCount = (calc?.ingredients || []).filter((ingredient) => !ingredient.removed && ingredient.packs > 0 && ingredient.available).length;
  const canonicalPath = `/?view=recipe-config&recipeId=${encodeURIComponent(recipe.id)}`;
  const recipeStructuredData = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": `${absoluteUrl(canonicalPath)}#recipe`,
    name: recipe.title,
    description: recipe.description,
    image: [absoluteUrl(recipePhoto)],
    recipeCuisine: recipe.country ? `${recipe.country} / Africa` : "African",
    recipeCategory: recipe.category,
    recipeYield: `${recipe.baseServings} ${locale === "fr" ? "personnes" : "servings"}`,
    totalTime: `PT${Math.max(1, Number(recipe.timeMinutes) || 1)}M`,
    inLanguage: locale === "fr" ? "fr-FR" : "en-GB",
    recipeIngredient: (recipe.ingredients || []).map((ingredient: any) => {
      const name = locale === "en" ? ingredient.product.nameEn : ingredient.product.nameFr;
      return `${formatQty(Number(ingredient.quantityPerBase), ingredient.unit, locale)} ${name}`;
    }),
    recipeInstructions: (recipe.steps || []).map((step: string, index: number) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
    author: { "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "Je mange Africain" },
  };

  return (
    <>
      <ClientSeo
        id={`recipe-${recipe.id}`}
        title={`${recipe.title} | Je mange Africain`}
        description={recipe.description}
        canonicalPath={canonicalPath}
        image={recipePhoto}
        structuredData={recipeStructuredData}
      />
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-7 md:py-10 lg:px-8">
      <PageBackButton fallbackView="recipes" className="mb-3" />

      {/* recipe header */}
      <div className="mb-4 grid grid-cols-[6.75rem_minmax(0,1fr)] overflow-hidden rounded-md border border-charcoal/10 bg-white md:mb-6 md:grid-cols-[280px_1fr] md:rounded-lg" data-testid="recipe-header">
        <div className="relative min-h-44 md:min-h-52">
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
        <div className="min-w-0 p-3 md:p-6">
          <Badge variant="outline" className="mb-1.5 max-w-full truncate px-1.5 py-0.5 text-[9px] md:mb-2 md:px-2.5 md:text-xs">{recipe.country}</Badge>
          <h1 className="line-clamp-2 font-display text-lg font-semibold leading-tight text-charcoal md:text-4xl">{recipe.title}</h1>
          <p className="mt-1.5 line-clamp-2 max-w-3xl text-[10px] leading-4 text-muted-foreground md:mt-2 md:text-sm md:leading-relaxed">{recipe.description}</p>
          <div className="mt-2 grid grid-cols-3 divide-x divide-border border-t border-border pt-2 text-center md:mt-4 md:max-w-md md:pt-3">
            <RecipeMetric icon={Users} label={t.config.peopleUnit} value={String(recipe.baseServings)} />
            <RecipeMetric icon={Clock} label="min" value={String(recipe.timeMinutes)} />
            <RecipeMetric icon={Flame} label={locale === "fr" ? "niveau" : "level"} value={diff} />
          </div>
        </div>
      </div>

      <nav aria-label={locale === "fr" ? "Parcours de la recette" : "Recipe journey"} className="mb-4 grid grid-cols-3 rounded-md border border-border bg-white p-1" data-testid="recipe-flow-nav">
        <RecipeFlowLink href="#recipe-settings" icon={Sliders} number="1" label={locale === "fr" ? "Configurer" : "Configure"} />
        <RecipeFlowLink href="#recipe-ingredients" icon={Package} number="2" label={locale === "fr" ? "Ingrédients" : "Ingredients"} />
        <RecipeFlowLink href="#recipe-preparation" icon={Sparkles} number="3" label={locale === "fr" ? "Préparation" : "Preparation"} />
      </nav>

      {calc ? (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-y border-charcoal/10 py-3 lg:hidden" data-testid="recipe-live-summary">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase text-muted-foreground">{servings} {t.config.peopleUnit} · {purchasableCount} {locale === "fr" ? "produits" : "products"}</p>
            <p className="mt-0.5 text-sm font-bold text-charcoal"><span aria-live="polite" className="text-xl font-black text-terre">{formatPrice(calc.totalCost, locale)}</span> <span className="text-[10px] font-semibold text-muted-foreground">{locale === "fr" ? "au total" : "total"}</span></p>
          </div>
          <Button onClick={addAllToCart} disabled={purchasableCount === 0 || calcLoading} className="h-10 bg-terre px-4 text-cream hover:bg-terre-dark" aria-label={t.config.addAllToCart}>
            <ShoppingCart className="mr-1.5 h-4 w-4" /> {locale === "fr" ? "Ajouter" : "Add"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* LEFT: config form */}
        <aside id="recipe-settings" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-charcoal/10 bg-white p-4 md:rounded-lg">
            <div className="mb-3 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-terre" />
              <h2 className="text-sm font-bold text-charcoal">{t.config.title}</h2>
            </div>

            {/* people */}
            <div className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.stepPeople}</p>
              <div className="flex items-center justify-between rounded-md bg-terre/8 px-3 py-2">
                <span className="text-xs font-semibold text-charcoal">{locale === "fr" ? "Table configurée" : "Configured table"}</span>
                <strong className="text-sm text-terre">{servings} {t.config.peopleUnit}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CounterField label={t.config.adults} value={adults} onChange={updateAdults} max={24 - children} locale={locale} />
                <CounterField label={t.config.children} value={children} onChange={updateChildren} max={24 - adults} locale={locale} />
              </div>
              <div className="flex gap-1">
                {(["normal", "generous"] as const).map((p) => (
                  <button type="button" key={p} onClick={() => setPortion(p)} aria-pressed={portion === p} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${portion === p ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    {t.config[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* protein */}
            <div className="space-y-2 border-b border-border py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.protein}</p>
              <div className="grid grid-cols-2 gap-1">
                {([["recipe", locale === "fr" ? "Recette originale" : "Original recipe"], ["fish", t.config.fish], ["meat", t.config.meat], ["none", t.config.none]] as const).map(([v, label]) => (
                  <button type="button" key={v} onClick={() => setProtein(v)} aria-pressed={protein === v} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${protein === v ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
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
              <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground"><Flame className="h-3.5 w-3.5 text-terre" /> {t.config.spiceLevel}</p>
              <div className="flex gap-1">
                {([["mild", t.config.mild], ["medium", t.config.medium], ["hot", t.config.hot], ["veryHot", t.config.veryHot]] as const).map(([v, label], i) => (
                  <button type="button" key={v} onClick={() => setSpiceLevel(v)} aria-pressed={spiceLevel === v} className={`flex-1 rounded-md px-1 py-1.5 text-[11px] font-medium transition ${spiceLevel === v ? "bg-terre text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
                    <span className="flex justify-center gap-px" aria-hidden="true">{Array.from({ length: i + 1 }, (_, flameIndex) => <Flame key={flameIndex} className="h-3 w-3 fill-current" />)}</span>
                    <span className="block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* formula */}
            <div className="space-y-2 border-b border-border py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.config.formula}</p>
              <div className="flex gap-1">
                {([["economy", t.config.economy], ["standard", t.config.standard], ["premium", t.config.premium]] as const).map(([v, label]) => (
                  <button type="button" key={v} onClick={() => setFormula(v)} aria-pressed={formula === v} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${formula === v ? "bg-forest text-cream" : "bg-muted text-charcoal hover:bg-muted/70"}`}>
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
                  <label key={ri.recipeIngredientId} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-charcoal hover:bg-muted">
                    <input type="checkbox" checked={haveAtHome.includes(ri.recipeIngredientId)} onChange={() => toggleHave(ri.recipeIngredientId)} className="accent-terre" />
                    <ProductImage src={ri.product.imageUrl} alt="" emoji={ri.product.emoji} color={ri.product.color} size="sm" className="h-7 w-7 shrink-0" rounded="rounded-md" />
                    <span className="flex-1 truncate">{locale === "en" ? ri.product.nameEn : ri.product.nameFr}</span>
                  </label>
                ))}
              </div>
              {hasManualChoices ? (
                <Button type="button" variant="outline" size="sm" onClick={resetOverrides} className="mt-2 w-full border-terre/30 text-xs text-terre">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {locale === "fr" ? "Réinitialiser mes choix" : "Reset my choices"}
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        {/* RIGHT: results */}
        <div className="min-w-0 space-y-5">
          {/* ingredients table */}
          <div id="recipe-ingredients" className="scroll-mt-24 overflow-hidden rounded-md border border-charcoal/10 bg-white md:rounded-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-charcoal">{t.config.ingredientsNeeded}</h2>
              {hasManualChoices && (
                <Button variant="ghost" size="sm" onClick={resetOverrides} className="text-xs text-terre">
                  <RotateCcw className="mr-1 h-3 w-3" /> {t.config.reset}
                </Button>
              )}
            </div>
            {calcError ? <div role="alert" className="border-b border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-xs text-destructive">{calcError}</div> : null}
            <div className="divide-y divide-border">
              {calc?.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.recipeIngredientId}
                  ing={ing}
                  locale={locale}
                  onPackDelta={(delta) => setPack(ing.recipeIngredientId, delta)}
                  onToggleExcluded={() => toggleExcluded(ing.recipeIngredientId)}
                  onTogglePantry={() => toggleHave(ing.recipeIngredientId)}
                  onReplace={(productId) => setReplacement(ing.recipeIngredientId, productId)}
                />
              ))}
              {calcLoading && !calc && <div className="p-6 text-center text-sm text-muted-foreground">{t.loading}</div>}
            </div>
          </div>

          {/* summary card */}
          {calc && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-terre/25 bg-terre/[0.035] p-5">
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
                <div className="mt-3 flex items-start gap-2 rounded-md border border-gold/30 bg-gold/[0.08] p-2 text-xs text-charcoal">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{locale === "fr" ? `${calc.unavailableCount} produit(s) indisponible(s) — substituts proposés.` : `${calc.unavailableCount} product(s) unavailable — substitutes suggested.`}</span>
                </div>
              )}
              {calc.leftoverCount > 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-forest/20 bg-forest/[0.06] p-2 text-xs text-forest">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{locale === "fr" ? `${calc.leftoverCount} produit(s) génèrent un reste réutilisable.` : `${calc.leftoverCount} product(s) yield reusable leftovers.`}</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={addAllToCart} disabled={purchasableCount === 0 || calcLoading} size="lg" className="flex-1 bg-terre text-cream hover:bg-terre-dark shadow-md">
                  <ShoppingCart className="mr-2 h-4 w-4" /> {t.config.addAllToCart}
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11 border-terre/40" onClick={() => toggleSavedRecipe(recipe.id)} aria-label={t.config.saveRecipe}>
                  <Bookmark className={`h-5 w-5 ${isSaved ? "fill-terre text-terre" : "text-charcoal"}`} />
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => void shareRecipe(recipe.title, recipe.id).then(() => { setShared(true); window.setTimeout(() => setShared(false), 1800); }).catch(() => undefined)} aria-label={t.config.shareRecipe}>
                  {shared ? <Check className="h-5 w-5 text-forest" /> : <Share2 className="h-5 w-5" />}
                </Button>
              </div>
            </motion.div>
          )}

          {/* preparation follows ingredient choices so every adaptation is reflected here */}
          {preparationSteps.length > 0 && (
            <div id="recipe-preparation" className="scroll-mt-24">
              <Accordion type="single" collapsible defaultValue="steps" className="rounded-md border border-charcoal/10 bg-white px-2 md:rounded-lg">
                <AccordionItem value="steps" className="border-0">
                  <AccordionTrigger className="px-3 text-sm font-bold text-charcoal">
                    <span className="inline-flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-gold" /><span className="truncate">{locale === "fr" ? "Étapes de préparation" : "Preparation steps"} · {preparationSteps.length}</span>{preparationAdjustments.length > 0 ? <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-charcoal">{locale === "fr" ? "Adaptée" : "Adapted"}</span> : null}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={preparationSteps.length}
                        aria-valuenow={completedStepCount}
                        aria-label={locale === "fr" ? `${completedStepCount} étapes terminées sur ${preparationSteps.length}` : `${completedStepCount} of ${preparationSteps.length} steps completed`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                      >
                        <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${preparationSteps.length ? (completedStepCount / preparationSteps.length) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-forest">{completedStepCount}/{preparationSteps.length}</span>
                      {completedStepCount > 0 ? <button type="button" onClick={() => setCompletedSteps([])} className="inline-flex min-h-7 items-center px-1 text-xs font-semibold text-terre hover:underline">{locale === "fr" ? "Recommencer" : "Restart"}</button> : null}
                    </div>
                    {preparationAdjustments.length > 0 ? (
                      <div className="mb-3 border-l-2 border-gold bg-gold/8 px-3 py-2">
                        <p className="text-xs font-bold text-charcoal">{locale === "fr" ? "Vos adaptations à appliquer pendant la préparation" : "Your preparation adjustments"}</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {preparationAdjustments.map((ingredient) => (
                            <li key={ingredient.recipeIngredientId}>
                              {ingredient.isReplacement
                                ? (locale === "fr" ? `Remplacer ${ingredient.originalNameFr} par ${ingredient.nameFr}.` : `Replace ${ingredient.originalNameEn} with ${ingredient.nameEn}.`)
                                : (locale === "fr" ? `Préparer la recette sans ${ingredient.originalNameFr}.` : `Prepare without ${ingredient.originalNameEn}.`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <ol className="divide-y divide-border">
                      {preparationSteps.map((s: string, i: number) => (
                        <li key={i} className="py-1">
                          <button type="button" onClick={() => toggleStep(i)} aria-pressed={completedSteps.includes(i)} aria-label={locale === "fr" ? `Étape ${i + 1} : ${s}` : `Step ${i + 1}: ${s}`} className="flex w-full gap-3 px-1 py-3 text-left text-sm text-charcoal transition hover:bg-muted/40">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${completedSteps.includes(i) ? "bg-forest text-white" : "bg-terre text-cream"}`}>
                              {completedSteps.includes(i) ? <Check className="h-4 w-4" /> : i + 1}
                            </span>
                            <span className={`pt-1 leading-relaxed ${completedSteps.includes(i) ? "text-muted-foreground line-through" : ""}`}>{s}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function RecipeMetric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="min-w-0 px-1.5 md:px-3">
      <Icon className="mx-auto h-3.5 w-3.5 text-terre md:h-4 md:w-4" />
      <p className="mt-0.5 truncate text-[11px] font-extrabold text-charcoal md:mt-1 md:text-sm">{value}</p>
      <p className="truncate text-[8px] font-semibold uppercase text-muted-foreground md:text-[10px]">{label}</p>
    </div>
  );
}

function RecipeFlowLink({ href, icon: Icon, number, label }: { href: string; icon: React.ComponentType<{ className?: string }>; number: string; label: string }) {
  return (
    <a href={href} className="flex min-w-0 items-center justify-center gap-1.5 rounded-sm px-1.5 py-2 text-[10px] font-bold text-charcoal transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/40 md:text-xs">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-terre text-[9px] text-white">{number}</span>
      <Icon className="hidden h-3.5 w-3.5 text-terre sm:block" />
      <span className="truncate">{label}</span>
    </a>
  );
}

function CounterField({ label, value, onChange, max, locale }: { label: string; value: number; onChange: (value: number) => void; max: number; locale: "fr" | "en" }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="mb-1 text-[10px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 0} className="grid h-8 w-8 place-items-center rounded-md text-charcoal transition hover:bg-muted disabled:opacity-35" aria-label={locale === "fr" ? `Réduire ${label}` : `Decrease ${label}`}><Minus className="h-3.5 w-3.5" /></button>
        <span className="min-w-8 text-center text-base font-extrabold text-charcoal">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="grid h-8 w-8 place-items-center rounded-md text-charcoal transition hover:bg-muted disabled:opacity-35" aria-label={locale === "fr" ? `Augmenter ${label}` : `Increase ${label}`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function IngredientRow({ ing, locale, onPackDelta, onToggleExcluded, onTogglePantry, onReplace }: { ing: any; locale: string; onPackDelta: (delta: number) => void; onToggleExcluded: () => void; onTogglePantry: () => void; onReplace: (productId: string) => void }) {
  const t = dict[locale as "fr" | "en"];
  const roleColor: Record<string, string> = {
    protein: "bg-destructive/10 text-destructive", base: "bg-gold/15 text-charcoal", aromatic: "bg-terre/10 text-terre",
    spice: "bg-terre/10 text-terre", fat: "bg-gold/15 text-charcoal", side: "bg-forest/10 text-forest", optional: "bg-muted text-muted-foreground",
  };
  const roleLabel: Record<string, [string, string]> = {
    protein: ["Protéine", "Protein"], base: ["Base", "Base"], aromatic: ["Aromate", "Aromatic"], spice: ["Épice", "Spice"], fat: ["Matière grasse", "Fat"], side: ["Accompagnement", "Side"], optional: ["Optionnel", "Optional"],
  };
  const localizedName = locale === "en" ? ing.nameEn : ing.nameFr;
  const originalName = locale === "en" ? ing.originalNameEn : ing.originalNameFr;
  const pantryRemoved = ing.removalReason === "pantry";
  const deliberatelyRemoved = ing.removalReason === "excluded";
  const proteinRemoved = ing.removalReason === "protein-none";
  const replacementOptions = ing.replacementOptions || [];
  const currentMissingFromOptions = ing.isReplacement && !replacementOptions.some((option: any) => option.productId === ing.productId);
  const pantryActionLabel = locale === "fr"
    ? (pantryRemoved ? `Retirer ${localizedName} de mes ingrédients disponibles` : `J'ai déjà ${localizedName} à la maison`)
    : (pantryRemoved ? `Remove ${localizedName} from pantry` : `I already have ${localizedName} at home`);

  return (
    <div className={`space-y-3 p-4 transition ${ing.removed ? "bg-muted/20" : ""}`}>
      <div className="flex items-start gap-3">
        <ProductImage src={ing.imageUrl} alt={localizedName} emoji={ing.emoji} color={ing.color} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${ing.removed ? "text-muted-foreground line-through" : "text-charcoal"}`}>{localizedName}</p>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${roleColor[ing.role] || "bg-muted text-muted-foreground"}`}>
              {(roleLabel[ing.role] || ["", ""])[locale === "en" ? 1 : 0]}
            </span>
            {ing.optional && <span className="text-[9px] text-muted-foreground">· {t.config.ingredient}</span>}
            {ing.isReplacement ? <span className="rounded bg-terre/10 px-1.5 py-0.5 text-[9px] font-bold text-terre">{locale === "fr" ? `Remplace ${originalName}` : `Replaces ${originalName}`}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onTogglePantry} aria-pressed={pantryRemoved} aria-label={pantryActionLabel} title={pantryActionLabel} className={`grid h-9 w-9 place-items-center rounded-md border transition ${pantryRemoved ? "border-forest bg-forest text-white" : "border-border text-muted-foreground hover:border-forest hover:text-forest"}`}>
            <House className="h-4 w-4" />
          </button>
          {!proteinRemoved ? <button type="button" onClick={onToggleExcluded} title={locale === "fr" ? (deliberatelyRemoved ? "Réintégrer l'ingrédient" : "Retirer de la recette") : (deliberatelyRemoved ? "Restore ingredient" : "Remove from recipe")} aria-label={locale === "fr" ? (deliberatelyRemoved ? "Réintégrer l'ingrédient" : "Retirer de la recette") : (deliberatelyRemoved ? "Restore ingredient" : "Remove from recipe")} className={`grid h-9 w-9 place-items-center rounded-md border transition ${deliberatelyRemoved ? "border-terre bg-terre text-white" : "border-border text-muted-foreground hover:border-terre hover:text-terre"}`}>
            {deliberatelyRemoved ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button> : null}
        </div>
      </div>

      {ing.removed ? (
        <div className="flex items-center gap-2 border-l-2 border-gold pl-2 text-xs font-medium text-muted-foreground">
          {pantryRemoved ? <><House className="h-3.5 w-3.5" /> {locale === "fr" ? "Déjà disponible à la maison : non ajouté au panier." : "Already at home: not added to the basket."}</> : proteinRemoved ? <>{locale === "fr" ? "Retiré par le choix Sans protéine." : "Removed by the No protein choice."}</> : <><Trash2 className="h-3.5 w-3.5" /> {locale === "fr" ? "Retiré de cette recette. Action réversible." : "Removed from this recipe. This can be undone."}</>}
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground">{t.config.neededQty}</p>
          <p className="font-semibold text-charcoal">{formatQty(ing.neededQty, ing.neededUnit, locale as any)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">{t.config.packs}</p>
          {!ing.removed ? (
            <div className="inline-flex h-8 items-center rounded-md border border-border bg-background">
              <button type="button" onClick={() => onPackDelta(-1)} disabled={ing.packs <= 0} className="grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-35" aria-label={locale === "fr" ? `Réduire les paquets de ${localizedName}` : `Reduce ${localizedName} packs`}><Minus className="h-3 w-3" /></button>
              <span className="min-w-7 text-center font-semibold">{ing.packs}</span>
              <button type="button" onClick={() => onPackDelta(1)} disabled={ing.packs >= ing.stockQty} className="grid h-8 w-8 place-items-center hover:bg-muted disabled:opacity-35" aria-label={locale === "fr" ? `Augmenter les paquets de ${localizedName}` : `Increase ${localizedName} packs`}><Plus className="h-3 w-3" /></button>
            </div>
          ) : <span className="font-medium text-gold">0</span>}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">{t.config.lineTotal}</p>
          <p className="font-bold text-terre">{formatPrice(ing.lineTotal, locale as any)}</p>
        </div>
      </div>

      <details className="group rounded-md border border-border bg-muted/15">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-[11px] font-bold text-charcoal marker:hidden [&::-webkit-details-marker]:hidden">
          <RefreshCw className="h-3.5 w-3.5 text-terre" />
          <span className="min-w-0 flex-1 truncate">{locale === "fr" ? `Personnaliser ou remplacer ${localizedName}` : `Customize or replace ${localizedName}`}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
          <label className="min-w-0 text-[10px] font-semibold text-muted-foreground">
            <span className="mb-1 flex items-center gap-1">{locale === "fr" ? "Ingrédient de remplacement" : "Replacement ingredient"}</span>
            <select aria-label={locale === "fr" ? `Remplacer ${localizedName}` : `Replace ${localizedName}`} value={ing.productId} onChange={(event) => onReplace(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-charcoal outline-none transition focus:border-terre focus:ring-2 focus:ring-terre/15">
              <option value={ing.originalProductId}>{locale === "fr" ? `Original : ${ing.originalNameFr}` : `Original: ${ing.originalNameEn}`}</option>
              {currentMissingFromOptions ? <option value={ing.productId}>{locale === "fr" ? `Sélection : ${ing.nameFr}` : `Selected: ${ing.nameEn}`}</option> : null}
              {replacementOptions.map((option: any) => (
                <option key={option.productId} value={option.productId} disabled={option.availableStock <= 0}>
                  {option.emoji} {locale === "fr" ? option.nameFr : option.nameEn} · {option.availableStock > 0 ? `${option.availableStock} ${locale === "fr" ? "en stock" : "in stock"}` : t.config.unavailable} · {formatPrice(option.unitPrice, locale as any)}
                </option>
              ))}
            </select>
          </label>
          {!ing.removed ? <div>
            {ing.available ? (
              <Badge variant="outline" className="h-10 w-full justify-center border-forest/40 bg-forest/5 text-forest"><Check className="mr-1 h-3 w-3" /> {t.config.inStockOk} · {ing.stockQty}</Badge>
            ) : ing.substituteName ? (
              <button type="button" onClick={() => onReplace(ing.substituteProductId)} className="flex h-10 w-full items-center justify-center rounded-md border border-gold/45 bg-gold/[0.09] px-2 text-[10px] font-bold text-charcoal"><RefreshCw className="mr-1 h-3 w-3 text-terre" /> {locale === "fr" ? `Utiliser ${ing.substituteName}` : `Use ${ing.substituteName}`}</button>
            ) : (
              <Badge variant="outline" className="h-10 w-full justify-center border-destructive/40 bg-destructive/[0.06] text-destructive">{t.config.unavailable}</Badge>
            )}
          </div> : <div className="flex h-10 items-center text-[10px] text-muted-foreground">{locale === "fr" ? "Aucun achat pour cette ligne" : "No purchase for this line"}</div>}
        </div>
      </details>

      {!ing.removed && ing.leftover > 0 ? <p className="text-[10px] text-forest">{t.config.leftover} : {formatQty(ing.leftover, ing.leftoverUnit || (ing.neededUnit === "L" ? "ml" : "g"), locale as any)} · {ing.packLabel}</p> : null}
    </div>
  );
}
