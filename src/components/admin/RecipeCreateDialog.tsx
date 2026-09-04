"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, ChefHat, CheckCircle2, Clock3, Eye, Flame, LoaderCircle, MapPin, PackageSearch, PencilLine, Plus, Search, Timer, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/lib/use-fetch";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { ProductImage } from "@/components/shared/ProductImage";
import { getRecipePhoto } from "@/lib/market-media";
import { buildRecipeStepGuide, recipeStepDetailScore } from "@/lib/recipe-step-guide";

type ProductOption = {
  id: string;
  name: string;
  traditionalName: string;
  sku: string;
  stockQty: number;
  imageEmoji: string;
  imageColor: string;
  imageUrl?: string | null;
};

type IngredientDraft = {
  productId: string;
  quantityPerBase: string;
  unit: "g" | "kg" | "ml" | "L" | "piece" | "tbsp" | "tsp";
  role: "protein" | "base" | "aromatic" | "spice" | "fat" | "side" | "optional";
  optional: boolean;
  note?: string | null;
};

type DishTemplateIngredient = {
  nameFr: string;
  nameEn: string;
  quantity: string;
  role: "base" | "protein" | "vegetable" | "spice" | "fat" | "side";
  optional: boolean;
};

type DishTemplate = {
  slug: string;
  nameFr: string;
  nameEn: string;
  country: string;
  region: string;
  category: "main" | "sauce" | "grill" | "street-food";
  difficulty: RecipeDraft["difficulty"];
  timeMinutes: number;
  servings: number;
  featured: boolean;
  descriptionFr: string;
  descriptionEn: string;
  ingredients: DishTemplateIngredient[];
  stepsFr: string[];
  stepsEn: string[];
};

type DishTemplateResponse = {
  dishes: DishTemplate[];
  countries: string[];
};

type RecipeDraft = {
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  country: string;
  category: "sauces" | "mains" | "sides" | "grill" | "drinks" | "desserts" | "porridge" | "family" | "events";
  difficulty: "easy" | "medium" | "hard";
  timeMinutes: string;
  baseServings: string;
  imageEmoji: string;
  imageUrl: string;
  imageColor: string;
  isPopular: boolean;
  isNew: boolean;
  isRecommended: boolean;
  status: "draft" | "published" | "archived";
  stepsFr: string[];
  stepsEn: string[];
  ingredients: IngredientDraft[];
};

export type EditableRecipe = { id: string; title: string };

type RecipeEditPayload = {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  country: string;
  category: RecipeDraft["category"];
  difficulty: RecipeDraft["difficulty"];
  timeMinutes: number;
  baseServings: number;
  imageEmoji: string;
  imageUrl: string;
  imageColor: string;
  isPopular: boolean;
  isNew: boolean;
  isRecommended: boolean;
  status: RecipeDraft["status"];
  stepsFr: string[];
  stepsEn: string[];
  ingredients: Array<Omit<IngredientDraft, "quantityPerBase"> & { quantityPerBase: number }>;
};

const emptyIngredient = (): IngredientDraft => ({ productId: "", quantityPerBase: "", unit: "g", role: "base", optional: false, note: null });
const recipeColours = [
  { value: "#D65A32", fr: "Terre cuite", en: "Terracotta" },
  { value: "#F2A900", fr: "Or solaire", en: "Sun gold" },
  { value: "#8A3042", fr: "Bordeaux", en: "Burgundy" },
  { value: "#C92A3E", fr: "Rouge piment", en: "Chilli red" },
  { value: "#A73E22", fr: "Terre profonde", en: "Deep earth" },
] as const;
const initialDraft = (): RecipeDraft => ({
  titleFr: "",
  titleEn: "",
  descriptionFr: "",
  descriptionEn: "",
  country: "Côte d'Ivoire",
  category: "mains",
  difficulty: "medium",
  timeMinutes: "45",
  baseServings: "4",
  imageEmoji: "🍲",
  imageUrl: "",
  imageColor: "#8A3042",
  isPopular: false,
  isNew: true,
  isRecommended: false,
  status: "draft",
  stepsFr: ["", ""],
  stepsEn: ["", ""],
  ingredients: [emptyIngredient()],
});

const draftFromRecipe = (recipe: RecipeEditPayload): RecipeDraft => ({
  titleFr: recipe.titleFr,
  titleEn: recipe.titleEn,
  descriptionFr: recipe.descriptionFr,
  descriptionEn: recipe.descriptionEn,
  country: recipe.country,
  category: recipe.category,
  difficulty: recipe.difficulty,
  timeMinutes: String(recipe.timeMinutes),
  baseServings: String(recipe.baseServings),
  imageEmoji: recipe.imageEmoji,
  imageUrl: recipe.imageUrl,
  imageColor: recipe.imageColor,
  isPopular: recipe.isPopular,
  isNew: recipe.isNew,
  isRecommended: recipe.isRecommended,
  status: recipe.status,
  stepsFr: recipe.stepsFr.length ? recipe.stepsFr : ["", ""],
  stepsEn: recipe.stepsEn.length ? recipe.stepsEn : ["", ""],
  ingredients: recipe.ingredients.length ? recipe.ingredients.map((ingredient) => ({ ...ingredient, quantityPerBase: String(ingredient.quantityPerBase) })) : [emptyIngredient()],
});

const normalizeSignal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function findTemplateProduct(ingredient: DishTemplateIngredient, products: ProductOption[]) {
  const ingredientSignal = normalizeSignal(`${ingredient.nameFr} ${ingredient.nameEn}`);
  const ingredientTerms = ingredientSignal.split(" ").filter((term) => term.length >= 4);
  const candidates = products.map((product) => {
    const productSignal = normalizeSignal(`${product.name} ${product.traditionalName} ${product.sku}`);
    let score = 0;
    if (productSignal.includes(normalizeSignal(ingredient.nameFr)) || productSignal.includes(normalizeSignal(ingredient.nameEn))) score += 12;
    for (const term of ingredientTerms) if (productSignal.includes(term)) score += 3;
    return { product, score };
  }).sort((left, right) => right.score - left.score);
  return candidates[0]?.score >= 9 ? candidates[0].product : undefined;
}

function templateQuantity(value: string, role: DishTemplateIngredient["role"]): Pick<IngredientDraft, "quantityPerBase" | "unit"> {
  const normalized = value.toLowerCase().replace(",", ".");
  const numeric = Number(normalized.match(/\d+(?:\.\d+)?/)?.[0] || "1");
  if (/\bkg\b/.test(normalized)) return { quantityPerBase: String(numeric), unit: "kg" };
  if (/\bcl\b/.test(normalized)) return { quantityPerBase: String(numeric * 10), unit: "ml" };
  if (/\bml\b/.test(normalized)) return { quantityPerBase: String(numeric), unit: "ml" };
  if (/\b(l|litre|liter)s?\b/.test(normalized)) return { quantityPerBase: String(numeric), unit: "L" };
  if (/\b(g|gramme|gram)s?\b/.test(normalized)) return { quantityPerBase: String(numeric), unit: "g" };
  if (/soupe|tablespoon|tbsp/.test(normalized)) return { quantityPerBase: String(numeric), unit: "tbsp" };
  if (/caf[eé]|teaspoon|tsp/.test(normalized)) return { quantityPerBase: String(numeric), unit: "tsp" };
  return { quantityPerBase: String(numeric), unit: role === "spice" ? "tsp" : "piece" };
}

function ingredientFromTemplate(ingredient: DishTemplateIngredient, products: ProductOption[], locale: "fr" | "en"): IngredientDraft {
  const product = findTemplateProduct(ingredient, products);
  const role: IngredientDraft["role"] = ingredient.role === "vegetable" ? "aromatic" : ingredient.role;
  return {
    productId: product?.id || "",
    ...templateQuantity(ingredient.quantity, ingredient.role),
    role,
    optional: ingredient.optional,
    note: `${locale === "fr" ? "Bibliothèque" : "Library"}: ${ingredient.nameFr} / ${ingredient.nameEn} (${ingredient.quantity})`,
  };
}

const templateCategory = (category: DishTemplate["category"]): RecipeDraft["category"] => category === "sauce" ? "sauces" : category === "grill" ? "grill" : "mains";
const templateColour = (category: DishTemplate["category"]) => category === "sauce" ? "#D65A32" : category === "grill" ? "#C92A3E" : category === "street-food" ? "#F2A900" : "#8A3042";
const templateEmoji = (category: DishTemplate["category"]) => category === "grill" ? "🍖" : category === "street-food" ? "🍽️" : "🍲";

export function RecipeCreateDialog({ locale, onCreated, recipe }: { locale: "fr" | "en"; onCreated: () => void; recipe?: EditableRecipe }) {
  const isFr = locale === "fr";
  const editing = Boolean(recipe);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RecipeDraft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateCountry, setTemplateCountry] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<DishTemplate | null>(null);
  const [importSummary, setImportSummary] = useState<{ name: string; matched: number; total: number } | null>(null);
  const { data: productData, loading: productsLoading } = useFetch<{ products: ProductOption[] }>(open ? `/api/admin/products?locale=${locale}` : null, [open, locale]);
  const { data: templateData, loading: templatesLoading, error: templatesError, refetch: refetchTemplates } = useFetch<DishTemplateResponse>(open && templateOpen && !editing ? "/api/dishes?bilingual=1&limit=100" : null, [open, templateOpen, editing]);
  const editRequest = useFetch<RecipeEditPayload>(open && recipe ? `/api/admin/recipes/${recipe.id}?locale=${locale}` : null, [open, recipe?.id, locale]);
  const products = productData?.products || [];
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filteredTemplates = useMemo(() => {
    const query = normalizeSignal(templateQuery);
    return (templateData?.dishes || []).filter((template) => {
      if (templateCountry && template.country !== templateCountry) return false;
      if (!query) return true;
      return normalizeSignal(`${template.nameFr} ${template.nameEn} ${template.country} ${template.region}`).includes(query);
    });
  }, [templateCountry, templateData?.dishes, templateQuery]);

  useEffect(() => {
    if (open && editRequest.data) setDraft(draftFromRecipe(editRequest.data));
  }, [open, editRequest.data]);

  const completeSteps = draft.stepsFr.every((step) => step.trim().length >= 5) && draft.stepsEn.every((step) => step.trim().length >= 5);
  const completeIngredients = draft.ingredients.length > 0 && draft.ingredients.every((ingredient) => ingredient.productId && Number(ingredient.quantityPerBase) > 0);
  const isValid = Boolean(
    draft.titleFr.trim().length >= 2
    && draft.titleEn.trim().length >= 2
    && draft.descriptionFr.trim().length >= 20
    && draft.descriptionEn.trim().length >= 20
    && draft.imageUrl
    && Number(draft.timeMinutes) >= 5
    && Number(draft.baseServings) >= 1
    && completeSteps
    && completeIngredients
  );

  const update = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateStep = (language: "stepsFr" | "stepsEn", index: number, value: string) => update(language, draft[language].map((step, stepIndex) => stepIndex === index ? value : step));
  const addStep = () => setDraft((current) => ({ ...current, stepsFr: [...current.stepsFr, ""], stepsEn: [...current.stepsEn, ""] }));
  const moveStep = (index: number, direction: -1 | 1) => setDraft((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.stepsFr.length) return current;
    const stepsFr = [...current.stepsFr];
    const stepsEn = [...current.stepsEn];
    [stepsFr[index], stepsFr[target]] = [stepsFr[target], stepsFr[index]];
    [stepsEn[index], stepsEn[target]] = [stepsEn[target], stepsEn[index]];
    return { ...current, stepsFr, stepsEn };
  });
  const removeStep = (index: number) => {
    if (draft.stepsFr.length <= 2) return;
    setDraft((current) => ({ ...current, stepsFr: current.stepsFr.filter((_, stepIndex) => stepIndex !== index), stepsEn: current.stepsEn.filter((_, stepIndex) => stepIndex !== index) }));
  };
  const updateIngredient = <K extends keyof IngredientDraft>(index: number, key: K, value: IngredientDraft[K]) => update("ingredients", draft.ingredients.map((ingredient, ingredientIndex) => ingredientIndex === index ? { ...ingredient, [key]: value } : ingredient));

  const applyTemplate = (template: DishTemplate) => {
    const ingredients = template.ingredients.map((ingredient) => ingredientFromTemplate(ingredient, products, locale));
    const matched = ingredients.filter((ingredient) => ingredient.productId).length;
    setDraft({
      titleFr: template.nameFr,
      titleEn: template.nameEn,
      descriptionFr: template.descriptionFr,
      descriptionEn: template.descriptionEn,
      country: template.country,
      category: templateCategory(template.category),
      difficulty: template.difficulty,
      timeMinutes: String(template.timeMinutes),
      baseServings: String(template.servings),
      imageEmoji: templateEmoji(template.category),
      imageUrl: getRecipePhoto({ slug: template.slug, title: template.nameFr, country: template.country, category: template.category }),
      imageColor: templateColour(template.category),
      isPopular: false,
      isNew: true,
      isRecommended: template.featured,
      status: "draft",
      stepsFr: template.stepsFr,
      stepsEn: template.stepsEn,
      ingredients,
    });
    setImportSummary({ name: isFr ? template.nameFr : template.nameEn, matched, total: ingredients.length });
    setTemplateOpen(false);
    setPendingTemplate(null);
  };

  const selectTemplate = (template: DishTemplate) => {
    const hasEnteredContent = Boolean(draft.titleFr.trim() || draft.titleEn.trim() || draft.imageUrl || draft.stepsFr.some((step) => step.trim()) || draft.ingredients.some((ingredient) => ingredient.productId));
    if (hasEnteredContent) setPendingTemplate(template);
    else applyTemplate(template);
  };

  const handleOpen = (nextOpen: boolean) => {
    if (submitting) return;
    setOpen(nextOpen);
    if (!nextOpen || !editing) {
      setDraft(initialDraft());
      setSubmitError("");
      setTemplateOpen(false);
      setTemplateQuery("");
      setTemplateCountry("");
      setPendingTemplate(null);
      setImportSummary(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(editing ? `/api/admin/recipes/${recipe!.id}` : "/api/admin/recipes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Enregistrement impossible." : "Unable to save recipe."));
      setDraft(initialDraft());
      setOpen(false);
      onCreated();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : (isFr ? "Enregistrement impossible." : "Unable to save recipe."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {editing ? <Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white" aria-label={isFr ? `Modifier la fiche ${recipe!.title}` : `Edit ${recipe!.title}`} title={isFr ? "Modifier la fiche complète" : "Edit full record"}><PencilLine className="h-4 w-4" /></Button> : <Button size="sm" className="bg-burgundy text-white hover:bg-burgundy-dark"><ChefHat className="mr-1.5 h-4 w-4" /> {isFr ? "Nouvelle recette" : "New recipe"}</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[94dvh] overflow-hidden p-0 sm:max-w-6xl">
        <form onSubmit={submit} className="relative flex max-h-[94dvh] min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-5 sm:px-7">
            <DialogTitle className="flex items-center gap-2 pr-8 text-xl font-black text-charcoal">{editing ? <PencilLine className="h-5 w-5 text-burgundy" /> : <ChefHat className="h-5 w-5 text-burgundy" />} {editing ? (isFr ? "Modifier la recette achetable" : "Edit shoppable recipe") : (isFr ? "Composer une recette achetable" : "Compose a shoppable recipe")}</DialogTitle>
            <DialogDescription>{editing ? (isFr ? "Mettez à jour les langues, l'ordre de préparation et les produits liés au stock depuis une seule fiche." : "Update languages, preparation order and stock-linked products from one record.") : (isFr ? "Les deux langues, les étapes et chaque produit lié sont contrôlés avant publication." : "Both languages, preparation steps and every linked product are validated before publishing.")}</DialogDescription>
          </DialogHeader>

          {editing && editRequest.loading && !editRequest.data ? <div className="absolute inset-x-0 bottom-0 top-[6.5rem] z-20 grid place-items-center bg-white/94 backdrop-blur-sm"><div className="flex items-center gap-2 text-sm font-bold text-charcoal"><LoaderCircle className="h-5 w-5 animate-spin text-terre" />{isFr ? "Chargement de la recette..." : "Loading recipe..."}</div></div> : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!editing ? <RecipeTemplateImporter locale={locale} expanded={templateOpen} onExpandedChange={setTemplateOpen} summary={importSummary} query={templateQuery} onQueryChange={setTemplateQuery} country={templateCountry} onCountryChange={setTemplateCountry} countries={templateData?.countries || []} templates={filteredTemplates} products={products} loading={templatesLoading || productsLoading} error={templatesError} onRetry={refetchTemplates} onSelect={selectTemplate} /> : null}
            <section className="grid gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_1fr]" aria-labelledby="recipe-identity-title">
              <div className="space-y-4">
                <SectionTitle id="recipe-identity-title" number="01" title={isFr ? "Identité culinaire" : "Culinary identity"} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={isFr ? "Titre français" : "French title"} required><Input aria-label={isFr ? "Titre français" : "French title"} value={draft.titleFr} onChange={(event) => update("titleFr", event.target.value)} placeholder="Sauce graine au poisson" /></Field>
                  <Field label={isFr ? "Titre anglais" : "English title"} required><Input aria-label={isFr ? "Titre anglais" : "English title"} value={draft.titleEn} onChange={(event) => update("titleEn", event.target.value)} placeholder="Palm nut sauce with fish" /></Field>
                  <Field label={isFr ? "Pays d'origine" : "Country of origin"} required><Input aria-label={isFr ? "Pays d'origine" : "Country of origin"} value={draft.country} onChange={(event) => update("country", event.target.value)} /></Field>
                  <Field label={isFr ? "Famille" : "Category"} required><select aria-label={isFr ? "Famille" : "Category"} value={draft.category} onChange={(event) => update("category", event.target.value as RecipeDraft["category"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="mains">{isFr ? "Plat complet" : "Main dish"}</option><option value="sauces">Sauce</option><option value="sides">{isFr ? "Accompagnement" : "Side"}</option><option value="grill">{isFr ? "Grillade" : "Grill"}</option><option value="porridge">{isFr ? "Bouillie" : "Porridge"}</option><option value="drinks">{isFr ? "Boisson" : "Drink"}</option><option value="desserts">Dessert</option><option value="family">{isFr ? "Repas familial" : "Family meal"}</option><option value="events">{isFr ? "Événement" : "Event"}</option></select></Field>
                </div>
                <Field label={isFr ? "Description française" : "French description"} required><Textarea aria-label={isFr ? "Description française" : "French description"} value={draft.descriptionFr} onChange={(event) => update("descriptionFr", event.target.value)} rows={3} /></Field>
                <Field label={isFr ? "Description anglaise" : "English description"} required><Textarea aria-label={isFr ? "Description anglaise" : "English description"} value={draft.descriptionEn} onChange={(event) => update("descriptionEn", event.target.value)} rows={3} /></Field>
              </div>

              <div className="space-y-4">
                <MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => update("imageUrl", imageUrl)} kind="recipe" locale={locale} label={isFr ? "Photo principale de la recette" : "Main recipe photo"} aspect="landscape" required />
                <SectionTitle number="02" title={isFr ? "Cadre de service" : "Serving framework"} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label={isFr ? "Durée" : "Duration"} required><div className="relative"><Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={isFr ? "Durée en minutes" : "Duration in minutes"} type="number" min="5" max="720" value={draft.timeMinutes} onChange={(event) => update("timeMinutes", event.target.value)} className="pl-9" /></div></Field>
                  <Field label={isFr ? "Portions" : "Servings"} required><div className="relative"><UsersRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={isFr ? "Nombre de portions" : "Number of servings"} type="number" min="1" max="50" value={draft.baseServings} onChange={(event) => update("baseServings", event.target.value)} className="pl-9" /></div></Field>
                  <Field label={isFr ? "Difficulté" : "Difficulty"} required><select aria-label={isFr ? "Difficulté" : "Difficulty"} value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value as RecipeDraft["difficulty"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="easy">{isFr ? "Facile" : "Easy"}</option><option value="medium">{isFr ? "Intermédiaire" : "Medium"}</option><option value="hard">{isFr ? "Avancée" : "Advanced"}</option></select></Field>
                  <Field label={isFr ? "Repère visuel" : "Visual marker"}><Input aria-label={isFr ? "Repère visuel" : "Visual marker"} value={draft.imageEmoji} onChange={(event) => update("imageEmoji", event.target.value)} maxLength={12} /></Field>
                  <Field label={isFr ? "Couleur de marque" : "Brand colour"}><RecipeColourPicker value={draft.imageColor} onChange={(imageColor) => update("imageColor", imageColor)} locale={locale} /></Field>
                  <Field label={isFr ? "Publication" : "Publishing"}><select aria-label={isFr ? "État de publication" : "Publishing status"} value={draft.status} onChange={(event) => update("status", event.target.value as RecipeDraft["status"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="draft">{isFr ? "Brouillon" : "Draft"}</option><option value="published">{isFr ? "Publier" : "Publish"}</option>{editing ? <option value="archived">{isFr ? "Désactivée" : "Disabled"}</option> : null}</select></Field>
                </div>
                <div className="grid gap-2 border-y border-border py-3 sm:grid-cols-3">
                  <RecipeFlag checked={draft.isNew} onChange={(isNew) => update("isNew", isNew)} label={isFr ? "Nouveauté" : "New"} />
                  <RecipeFlag checked={draft.isRecommended} onChange={(isRecommended) => update("isRecommended", isRecommended)} label={isFr ? "Recommandée" : "Recommended"} />
                  <RecipeFlag checked={draft.isPopular} onChange={(isPopular) => update("isPopular", isPopular)} label={isFr ? "Populaire" : "Popular"} />
                </div>
              </div>
            </section>

            <section className="border-y border-border bg-[#F7F7F4] px-5 py-6 sm:px-7" aria-labelledby="recipe-steps-title">
              <SectionTitle id="recipe-steps-title" number="03" title={isFr ? "Préparation guidée" : "Guided preparation"} description={isFr ? "Décrivez une action précise avec sa durée, son niveau de feu et le résultat que le client doit observer." : "Describe one precise action with its duration, heat level and the result the customer should observe."} />
              <PreparationSteps stepsFr={draft.stepsFr} stepsEn={draft.stepsEn} onChangeFr={(index, value) => updateStep("stepsFr", index, value)} onChangeEn={(index, value) => updateStep("stepsEn", index, value)} onAdd={addStep} onRemove={removeStep} onMove={moveStep} isFr={isFr} />
            </section>

            <section className="px-5 py-6 sm:px-7" aria-labelledby="recipe-ingredients-title">
              <div className="flex flex-wrap items-end justify-between gap-3"><SectionTitle id="recipe-ingredients-title" number="04" title={isFr ? "Ingrédients reliés au stock" : "Stock-linked ingredients"} description={isFr ? "Les quantités sont définies pour le nombre de portions indiqué plus haut." : "Quantities are defined for the serving count above."} /><Button type="button" variant="outline" size="sm" onClick={() => update("ingredients", [...draft.ingredients, emptyIngredient()])}><Plus className="mr-1.5 h-4 w-4" /> {isFr ? "Ajouter un ingrédient" : "Add ingredient"}</Button></div>
              <div className="mt-5 space-y-3">
                {productsLoading ? <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> {isFr ? "Lecture du catalogue..." : "Loading catalogue..."}</div> : null}
                {draft.ingredients.map((ingredient, index) => {
                  const product = productsById.get(ingredient.productId);
                  return <div key={index} className="grid gap-3 border-y border-border bg-white px-3 py-3 lg:grid-cols-[minmax(12rem,1.5fr)_7rem_7rem_8rem_auto] lg:items-end">
                    <Field label={`${isFr ? "Produit" : "Product"} ${index + 1}`} required><div className="relative"><PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><select aria-label={`${isFr ? "Produit" : "Product"} ${index + 1}`} value={ingredient.productId} onChange={(event) => updateIngredient(index, "productId", event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm"><option value="">{isFr ? "Sélectionner dans le catalogue" : "Select from catalogue"}</option>{products.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.stockQty} {isFr ? "dispo." : "available"}</option>)}</select></div>{product ? <div className="mt-2 flex items-center gap-2"><ProductImage src={product.imageUrl} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-8 w-8 shrink-0" rounded="rounded-md" /><p className={`min-w-0 truncate text-[10px] font-semibold ${product.stockQty > 0 ? "text-burgundy" : "text-destructive"}`}>{product.traditionalName} · {product.sku} · {product.stockQty > 0 ? `${product.stockQty} ${isFr ? "en stock" : "in stock"}` : (isFr ? "rupture" : "out of stock")}</p></div> : null}{ingredient.note ? <p className={`mt-1.5 line-clamp-2 text-[9px] leading-4 ${product ? "text-muted-foreground" : "font-bold text-terre"}`}><BookOpenCheck className="mr-1 inline h-3 w-3" />{ingredient.note}{product ? "" : (isFr ? " · à relier" : " · link required")}</p> : null}</Field>
                    <Field label={isFr ? "Quantité" : "Quantity"} required><Input aria-label={`${isFr ? "Quantité" : "Quantity"} ${index + 1}`} type="number" inputMode="decimal" min="0.01" step="0.01" value={ingredient.quantityPerBase} onChange={(event) => updateIngredient(index, "quantityPerBase", event.target.value)} /></Field>
                    <Field label={isFr ? "Unité" : "Unit"}><select aria-label={`${isFr ? "Unité" : "Unit"} ${index + 1}`} value={ingredient.unit} onChange={(event) => updateIngredient(index, "unit", event.target.value as IngredientDraft["unit"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="L">L</option><option value="piece">{isFr ? "pièce" : "piece"}</option><option value="tbsp">{isFr ? "c. à soupe" : "tbsp"}</option><option value="tsp">{isFr ? "c. à café" : "tsp"}</option></select></Field>
                    <Field label={isFr ? "Rôle" : "Role"}><select aria-label={`${isFr ? "Rôle" : "Role"} ${index + 1}`} value={ingredient.role} onChange={(event) => updateIngredient(index, "role", event.target.value as IngredientDraft["role"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="base">Base</option><option value="protein">{isFr ? "Protéine" : "Protein"}</option><option value="aromatic">{isFr ? "Aromate" : "Aromatic"}</option><option value="spice">{isFr ? "Épice" : "Spice"}</option><option value="fat">{isFr ? "Matière grasse" : "Fat"}</option><option value="side">{isFr ? "Accompagnement" : "Side"}</option><option value="optional">Option</option></select></Field>
                    <div className="flex items-center justify-between gap-2 sm:pb-0.5"><label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><input type="checkbox" checked={ingredient.optional} onChange={(event) => updateIngredient(index, "optional", event.target.checked)} className="h-4 w-4 accent-terre" /> {isFr ? "Optionnel" : "Optional"}</label><Button type="button" variant="ghost" size="icon" disabled={draft.ingredients.length === 1} onClick={() => update("ingredients", draft.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index))} className="h-9 w-9 text-destructive" aria-label={isFr ? `Supprimer l'ingrédient ${index + 1}` : `Remove ingredient ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>;
                })}
              </div>
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-white px-5 py-4 sm:px-7">
            {submitError || editRequest.error ? <p role="alert" className="mr-auto max-w-xl self-center text-xs leading-5 text-destructive">{submitError || (isFr ? "La recette n'a pas pu être chargée." : "The recipe could not be loaded.")}</p> : <p className="mr-auto hidden self-center text-[10px] text-muted-foreground sm:block">{isFr ? "Les champs marqués sont obligatoires." : "Marked fields are required."}</p>}
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>{isFr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={!isValid || submitting || (editing && !editRequest.data)} className={isValid ? "bg-burgundy text-white hover:bg-burgundy-dark" : "border border-charcoal/10 bg-[#EDE8E5] text-[#65555A]"}>{submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : editing ? <PencilLine className="mr-2 h-4 w-4" /> : <ChefHat className="mr-2 h-4 w-4" />}{submitting ? (isFr ? "Enregistrement..." : "Saving...") : editing ? (isFr ? "Enregistrer les modifications" : "Save changes") : draft.status === "published" ? (isFr ? "Publier la recette" : "Publish recipe") : (isFr ? "Enregistrer le brouillon" : "Save draft")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(pendingTemplate)} onOpenChange={(next) => { if (!next) setPendingTemplate(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isFr ? "Remplacer la fiche en cours ?" : "Replace the current record?"}</AlertDialogTitle>
          <AlertDialogDescription>{isFr ? `L'import de ${pendingTemplate?.nameFr || "ce plat"} remplacera les titres, descriptions, étapes, photo et ingrédients actuellement saisis. La recette restera en brouillon.` : `Importing ${pendingTemplate?.nameEn || "this dish"} will replace the titles, descriptions, steps, photo and ingredients currently entered. The recipe will remain a draft.`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver ma saisie" : "Keep my entries"}</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingTemplate) applyTemplate(pendingTemplate); }} className="bg-burgundy text-white hover:bg-burgundy-dark">{isFr ? "Oui, importer ce plat" : "Yes, import this dish"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function RecipeTemplateImporter({ locale, expanded, onExpandedChange, summary, query, onQueryChange, country, onCountryChange, countries, templates, products, loading, error, onRetry, onSelect }: { locale: "fr" | "en"; expanded: boolean; onExpandedChange: (expanded: boolean) => void; summary: { name: string; matched: number; total: number } | null; query: string; onQueryChange: (query: string) => void; country: string; onCountryChange: (country: string) => void; countries: string[]; templates: DishTemplate[]; products: ProductOption[]; loading: boolean; error: string | null; onRetry: () => void; onSelect: (template: DishTemplate) => void }) {
  const isFr = locale === "fr";
  return <section className="border-b border-burgundy/10 bg-[#FFFAF7] px-5 py-4 sm:px-7" aria-labelledby="recipe-template-title" data-testid="recipe-template-importer">
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><BookOpenCheck className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Bibliothèque culinaire" : "Culinary library"}</p><h3 id="recipe-template-title" className="mt-0.5 text-sm font-black text-charcoal">{summary ? summary.name : (isFr ? "Partir d'un plat documenté" : "Start from a documented dish")}</h3>{summary ? <p className="mt-1 text-[10px] text-muted-foreground"><strong className="text-burgundy">{summary.matched}/{summary.total}</strong> {isFr ? "ingrédients automatiquement reliés au catalogue" : "ingredients automatically linked to the catalogue"}</p> : <p className="mt-1 text-[10px] text-muted-foreground">{isFr ? "Import bilingue, photo, portions, préparation et rapprochement avec le stock." : "Bilingual import, photo, servings, method and stock matching."}</p>}</div>
      <Button type="button" variant="outline" size="sm" onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} aria-controls="recipe-template-library" className="bg-white"><Search className="mr-1.5 h-4 w-4" />{expanded ? (isFr ? "Fermer" : "Close") : summary ? (isFr ? "Changer de plat" : "Change dish") : (isFr ? "Choisir un plat" : "Choose a dish")}</Button>
    </div>
    {expanded ? <div id="recipe-template-library" className="mt-4 border-t border-burgundy/10 pt-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block"><span className="sr-only">{isFr ? "Rechercher dans la bibliothèque" : "Search the library"}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label={isFr ? "Rechercher dans la bibliothèque" : "Search the library"} placeholder={isFr ? "Plat, région ou pays" : "Dish, region or country"} className="bg-white pl-9" /></label>
        <label><span className="sr-only">{isFr ? "Filtrer par pays" : "Filter by country"}</span><select value={country} onChange={(event) => onCountryChange(event.target.value)} aria-label={isFr ? "Filtrer par pays" : "Filter by country"} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">{isFr ? "Tous les pays" : "All countries"}</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      {loading ? <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin text-terre" />{isFr ? "Rapprochement avec le catalogue..." : "Matching with the catalogue..."}</div> : error ? <div className="flex min-h-28 flex-col items-center justify-center text-center"><p className="text-xs font-bold text-destructive">{isFr ? "La bibliothèque n'a pas pu être chargée." : "The library could not be loaded."}</p><Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3 bg-white">{isFr ? "Réessayer" : "Try again"}</Button></div> : templates.length ? <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3" data-testid="recipe-template-results">{templates.map((template, index) => {
        const matched = template.ingredients.filter((ingredient) => findTemplateProduct(ingredient, products)).length;
        const name = isFr ? template.nameFr : template.nameEn;
        return <button key={template.slug} type="button" onClick={() => onSelect(template)} className="group grid grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-md border border-charcoal/10 bg-white p-2 text-left transition hover:border-terre/35 hover:shadow-sm" aria-label={isFr ? `Importer ${name}` : `Import ${name}`}><ProductImage src={getRecipePhoto({ slug: template.slug, title: name, country: template.country, category: template.category })} alt="" emoji="" color={templateColour(template.category)} size="sm" className="h-16 w-16 shrink-0" rounded="rounded-md" priority={index < 3} /><span className="min-w-0"><span className="block truncate text-[11px] font-black text-charcoal">{name}</span><span className="mt-1 flex items-center gap-1 truncate text-[9px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0 text-terre" />{template.country} · {template.region}</span><span className={`mt-2 inline-flex items-center gap-1 text-[9px] font-black ${matched === template.ingredients.length ? "text-burgundy" : "text-terre"}`}><CheckCircle2 className="h-3 w-3" />{matched}/{template.ingredients.length} {isFr ? "reliés" : "linked"}</span></span></button>;
      })}</div> : <p className="py-10 text-center text-xs text-muted-foreground">{isFr ? "Aucun plat ne correspond à ces critères." : "No dish matches these criteria."}</p>}
    </div> : null}
  </section>;
}

function SectionTitle({ id, number, title, description }: { id?: string; number: string; title: string; description?: string }) {
  return <div><div className="flex items-center gap-2"><span className="text-[10px] font-black text-terre">{number}</span><h3 id={id} className="text-sm font-black text-charcoal">{title}</h3></div>{description ? <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">{description}</p> : null}</div>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}{required ? <span className="ml-1 text-terre">*</span> : null}</Label>{children}</div>;
}

function RecipeFlag({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[11px] font-bold text-charcoal"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-terre" />{label}</label>;
}

function RecipeColourPicker({ value, onChange, locale }: { value: string; onChange: (value: string) => void; locale: "fr" | "en" }) {
  return <div className="flex min-h-9 flex-wrap items-center gap-1" role="group" aria-label={locale === "fr" ? "Nuancier de la recette" : "Recipe colour palette"}>{recipeColours.map((colour) => <button key={colour.value} type="button" onClick={() => onChange(colour.value)} aria-label={locale === "fr" ? colour.fr : colour.en} aria-pressed={value === colour.value} title={locale === "fr" ? colour.fr : colour.en} className={`h-7 w-7 shrink-0 rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/35 ${value === colour.value ? "border-charcoal ring-2 ring-charcoal/15" : "border-white shadow-sm hover:border-charcoal/25"}`} style={{ backgroundColor: colour.value }} />)}</div>;
}

function PreparationSteps({ stepsFr, stepsEn, onChangeFr, onChangeEn, onAdd, onRemove, onMove, isFr }: { stepsFr: string[]; stepsEn: string[]; onChangeFr: (index: number, value: string) => void; onChangeEn: (index: number, value: string) => void; onAdd: () => void; onRemove: (index: number) => void; onMove: (index: number, direction: -1 | 1) => void; isFr: boolean }) {
  return <div className="mt-5">
    <div className="mb-4 grid grid-cols-3 divide-x divide-border border-y border-border bg-white py-3 text-center" aria-label={isFr ? "Repères attendus dans chaque étape" : "Expected details in every step"}>
      <div className="min-w-0 px-2"><Timer className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 text-[9px] font-black uppercase text-charcoal">{isFr ? "Durée" : "Duration"}</p></div>
      <div className="min-w-0 px-2"><Flame className="mx-auto h-4 w-4 text-gold" /><p className="mt-1 text-[9px] font-black uppercase text-charcoal">{isFr ? "Chaleur" : "Heat"}</p></div>
      <div className="min-w-0 px-2"><Eye className="mx-auto h-4 w-4 text-burgundy" /><p className="mt-1 text-[9px] font-black uppercase text-charcoal">{isFr ? "Résultat visible" : "Visible result"}</p></div>
    </div>
    <div className="hidden grid-cols-[2rem_1fr_1fr_7.5rem] gap-2 px-1 pb-2 text-[10px] font-black uppercase text-muted-foreground lg:grid"><span /><span>{isFr ? "Français" : "French"}</span><span>English</span><span>{isFr ? "Ordre" : "Order"}</span></div>
    <ol className="space-y-3">{stepsFr.map((step, index) => {
      const previewLocale = isFr ? "fr" : "en";
      const previewText = isFr ? step : (stepsEn[index] || "");
      const guide = buildRecipeStepGuide(previewText, index, previewLocale);
      const detailScore = Math.min(recipeStepDetailScore(step), recipeStepDetailScore(stepsEn[index] || ""));
      const quality = detailScore >= 3
        ? { label: isFr ? "Guidage complet" : "Complete guidance", className: "bg-burgundy/[0.08] text-burgundy" }
        : detailScore >= 2
          ? { label: isFr ? "À enrichir" : "Add more detail", className: "bg-gold/15 text-charcoal" }
          : { label: isFr ? "Trop bref" : "Too brief", className: "bg-terre/[0.08] text-terre" };
      return <li key={index} className="grid gap-3 border-y border-border bg-white px-3 py-3 lg:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem] lg:items-start">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-burgundy text-[10px] font-black text-white">{index + 1}</span>
        <div><Label className="mb-1.5 block lg:hidden">{isFr ? "Français" : "French"}</Label><Textarea aria-label={isFr ? `Étape ${index + 1} en français` : `Step ${index + 1} in French`} value={step} onChange={(event) => onChangeFr(index, event.target.value)} rows={4} maxLength={800} className="min-h-28 resize-y leading-5" placeholder="Ex. Cuire à feu doux 12 minutes en remuant toutes les 2 minutes, jusqu’à ce que la sauce soit brillante et nappe la cuillère." /></div>
        <div><Label className="mb-1.5 block lg:hidden">English</Label><Textarea aria-label={`Step ${index + 1} in English`} value={stepsEn[index] || ""} onChange={(event) => onChangeEn(index, event.target.value)} rows={4} maxLength={800} className="min-h-28 resize-y leading-5" placeholder="E.g. Cook over low heat for 12 minutes, stirring every 2 minutes, until the sauce is glossy and coats a spoon." /></div>
        <div className="flex items-center justify-end gap-1 lg:justify-start" aria-label={isFr ? `Ordre de l'étape ${index + 1}` : `Step ${index + 1} order`}>
          <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => onMove(index, -1)} className="h-9 w-9 bg-white" aria-label={isFr ? `Monter l'étape ${index + 1}` : `Move step ${index + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" disabled={index === stepsFr.length - 1} onClick={() => onMove(index, 1)} className="h-9 w-9 bg-white" aria-label={isFr ? `Descendre l'étape ${index + 1}` : `Move step ${index + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={stepsFr.length <= 2} onClick={() => onRemove(index)} className="h-9 w-9 text-destructive" aria-label={isFr ? `Supprimer l'étape ${index + 1}` : `Remove step ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
        </div>
        {previewText.trim() ? <div className="min-w-0 border-l-2 border-terre bg-[#F7F7F4] px-3 py-2.5 lg:col-span-2 lg:col-start-2" data-testid={`recipe-step-preview-${index + 1}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase text-charcoal">{isFr ? "Aperçu du guide client" : "Customer guide preview"}</p>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${quality.className}`}>{quality.label}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-muted-foreground"><span className="inline-flex items-center gap-1"><Timer className="h-3 w-3 text-terre" />{guide.durationLabel}</span><span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-gold" />{guide.heatLabel}</span></div>
          <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground"><strong className="text-charcoal/75">{isFr ? "Résultat attendu :" : "Expected result:"}</strong> {guide.cue}</p>
        </div> : null}
      </li>;
    })}</ol>
    <Button type="button" variant="outline" size="sm" onClick={onAdd} className="mt-3"><Plus className="mr-1.5 h-4 w-4" /> {isFr ? "Ajouter une étape bilingue" : "Add bilingual step"}</Button>
  </div>;
}
