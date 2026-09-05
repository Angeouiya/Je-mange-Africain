"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, ChefHat, CheckCircle2, CircleHelp, Clock3, CookingPot, Eye, Flame, Hourglass, LifeBuoy, Lightbulb, Link2, LoaderCircle, MapPin, PackageSearch, PencilLine, Plus, RefreshCw, Search, ShieldAlert, Thermometer, Timer, Trash2, UsersRound, WandSparkles } from "lucide-react";
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
import { RecipeCardPreview, type RecipeListItem } from "@/components/shared/RecipeCard";
import { getRecipePhoto } from "@/lib/market-media";
import { buildRecipeStepGuide, type RecipeStepDetails, type RecipeStepHeat } from "@/lib/recipe-step-guide";

type ProductOption = {
  id: string;
  name: string;
  traditionalName: string;
  sku: string;
  stockQty: number;
  reservedQty?: number;
  availableQty?: number;
  imageEmoji: string;
  imageColor: string;
  imageUrl?: string | null;
};

const availableProductQty = (product: ProductOption) => product.availableQty ?? product.stockQty;

type IngredientDraft = {
  productId: string;
  quantityPerBase: string;
  unit: "g" | "kg" | "ml" | "L" | "piece" | "tbsp" | "tsp";
  role: "protein" | "base" | "aromatic" | "spice" | "fat" | "side" | "optional";
  optional: boolean;
  alternativeProductIds: string[];
  note?: string | null;
};

type StepDetailDraft = {
  titleFr: string;
  titleEn: string;
  durationMinutes: string;
  restMinutes: string;
  heat: RecipeStepHeat;
  temperatureC: string;
  equipmentFr: string;
  equipmentEn: string;
  cueFr: string;
  cueEn: string;
  tipFr: string;
  tipEn: string;
  warningFr: string;
  warningEn: string;
  whyFr: string;
  whyEn: string;
  recoveryFr: string;
  recoveryEn: string;
  ingredientProductIds: string[];
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
  stepDetails: StepDetailDraft[];
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
  stepDetails?: Array<Omit<StepDetailDraft, "durationMinutes" | "restMinutes" | "temperatureC"> & { durationMinutes: number; restMinutes: number; temperatureC: number | null }>;
  ingredients: Array<Omit<IngredientDraft, "quantityPerBase"> & { quantityPerBase: number }>;
};

const emptyIngredient = (): IngredientDraft => ({ productId: "", quantityPerBase: "", unit: "g", role: "base", optional: false, alternativeProductIds: [], note: null });
const emptyStepDetail = (): StepDetailDraft => ({
  titleFr: "",
  titleEn: "",
  durationMinutes: "",
  restMinutes: "0",
  heat: "none",
  temperatureC: "",
  equipmentFr: "",
  equipmentEn: "",
  cueFr: "",
  cueEn: "",
  tipFr: "",
  tipEn: "",
  warningFr: "",
  warningEn: "",
  whyFr: "",
  whyEn: "",
  recoveryFr: "",
  recoveryEn: "",
  ingredientProductIds: [],
});

const stepDetailFromInstructions = (stepFr: string, stepEn: string, index: number): StepDetailDraft => {
  if (!stepFr.trim() && !stepEn.trim()) return emptyStepDetail();
  const french = buildRecipeStepGuide(stepFr, index, "fr");
  const english = buildRecipeStepGuide(stepEn, index, "en");
  return {
    titleFr: french.title,
    titleEn: english.title,
    durationMinutes: String(french.durationMinutes),
    restMinutes: String(french.restMinutes),
    heat: french.heat,
    temperatureC: "",
    equipmentFr: french.equipment || "",
    equipmentEn: english.equipment || "",
    cueFr: french.cue,
    cueEn: english.cue,
    tipFr: french.tip,
    tipEn: english.tip,
    warningFr: french.warning || "",
    warningEn: english.warning || "",
    whyFr: french.why,
    whyEn: english.why,
    recoveryFr: french.recovery,
    recoveryEn: english.recovery,
    ingredientProductIds: [],
  };
};
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
  stepDetails: [emptyStepDetail(), emptyStepDetail()],
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
  stepDetails: recipe.stepsFr.length
    ? recipe.stepsFr.map((step, index) => {
        const detail = recipe.stepDetails?.[index];
        if (!detail) return stepDetailFromInstructions(step, recipe.stepsEn[index] || "", index);
        return {
          ...emptyStepDetail(),
          ...detail,
          durationMinutes: String(detail.durationMinutes),
          restMinutes: String(detail.restMinutes),
          temperatureC: detail.temperatureC ? String(detail.temperatureC) : "",
          ingredientProductIds: detail.ingredientProductIds || [],
        };
      })
    : [emptyStepDetail(), emptyStepDetail()],
  ingredients: recipe.ingredients.length ? recipe.ingredients.map((ingredient) => ({ ...ingredient, alternativeProductIds: ingredient.alternativeProductIds || [], quantityPerBase: String(ingredient.quantityPerBase) })) : [emptyIngredient()],
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
    alternativeProductIds: [],
    note: `${locale === "fr" ? "Bibliothèque" : "Library"}: ${ingredient.nameFr} / ${ingredient.nameEn} (${ingredient.quantity})`,
  };
}

function linkedProductsForStep(stepFr: string, stepEn: string, ingredients: IngredientDraft[], productsById: Map<string, ProductOption>) {
  const instruction = normalizeSignal(`${stepFr} ${stepEn}`);
  return ingredients.flatMap((ingredient) => {
    if (!ingredient.productId) return [];
    const product = productsById.get(ingredient.productId);
    const signal = normalizeSignal(`${product?.name || ""} ${product?.traditionalName || ""} ${ingredient.note || ""}`);
    const terms = signal.split(" ").filter((term) => term.length >= 4);
    return terms.some((term) => instruction.split(" ").includes(term)) ? [ingredient.productId] : [];
  }).filter((productId, index, ids) => ids.indexOf(productId) === index);
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
  const [previewLocale, setPreviewLocale] = useState<"fr" | "en">(locale);
  const [discardOpen, setDiscardOpen] = useState(false);
  const { data: productData, loading: productsLoading } = useFetch<{ products: ProductOption[] }>(open ? `/api/admin/products?locale=${locale}` : null, [open, locale]);
  const { data: templateData, loading: templatesLoading, error: templatesError, refetch: refetchTemplates } = useFetch<DishTemplateResponse>(open && templateOpen && !editing ? "/api/dishes?bilingual=1&limit=100" : null, [open, templateOpen, editing]);
  const editRequest = useFetch<RecipeEditPayload>(open && recipe ? `/api/admin/recipes/${recipe.id}?locale=${locale}` : null, [open, recipe?.id, locale]);
  const products = productData?.products || [];
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const previewRecipe = useMemo<RecipeListItem>(() => {
    const title = (previewLocale === "fr" ? draft.titleFr : draft.titleEn).trim()
      || (previewLocale === "fr" ? "Titre de la recette" : "Recipe title");
    return {
      id: "recipe-studio-preview",
      country: draft.country || (previewLocale === "fr" ? "Pays d'origine" : "Country of origin"),
      category: draft.category,
      difficulty: draft.difficulty,
      timeMinutes: Number(draft.timeMinutes || 0),
      baseServings: Number(draft.baseServings || 0),
      imageColor: draft.imageColor,
      imageEmoji: draft.imageEmoji,
      imageUrl: draft.imageUrl || null,
      isPopular: draft.isPopular,
      isRecommended: draft.isRecommended,
      isNew: draft.isNew,
      title,
      description: (previewLocale === "fr" ? draft.descriptionFr : draft.descriptionEn).trim()
        || (previewLocale === "fr" ? "La description courte apparaîtra ici." : "The short description will appear here."),
      ingredientCount: draft.ingredients.filter((ingredient) => ingredient.productId).length,
    };
  }, [draft, previewLocale]);
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
  const completeStepDetails = draft.stepDetails.length === draft.stepsFr.length && draft.stepDetails.every((detail) => (
    Number(detail.durationMinutes) >= 1
    && Number(detail.restMinutes) >= 0
    && detail.titleFr.trim().length >= 3
    && detail.titleEn.trim().length >= 3
    && detail.cueFr.trim().length >= 10
    && detail.cueEn.trim().length >= 10
    && detail.whyFr.trim().length >= 10
    && detail.whyEn.trim().length >= 10
    && detail.recoveryFr.trim().length >= 10
    && detail.recoveryEn.trim().length >= 10
  ));
  const completeIngredients = draft.ingredients.length > 0 && draft.ingredients.every((ingredient) => ingredient.productId && Number(ingredient.quantityPerBase) > 0);
  const pristineDraft = editing && editRequest.data ? draftFromRecipe(editRequest.data) : initialDraft();
  const dirty = JSON.stringify(draft) !== JSON.stringify(pristineDraft);
  const isValid = Boolean(
    draft.titleFr.trim().length >= 2
    && draft.titleEn.trim().length >= 2
    && draft.descriptionFr.trim().length >= 20
    && draft.descriptionEn.trim().length >= 20
    && draft.imageUrl
    && Number(draft.timeMinutes) >= 5
    && Number(draft.baseServings) >= 1
    && completeSteps
    && completeStepDetails
    && completeIngredients
  );

  const update = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateStep = (language: "stepsFr" | "stepsEn", index: number, value: string) => update(language, draft[language].map((step, stepIndex) => stepIndex === index ? value : step));
  const updateStepDetail = <K extends keyof StepDetailDraft>(index: number, key: K, value: StepDetailDraft[K]) => setDraft((current) => ({
    ...current,
    stepDetails: current.stepDetails.map((detail, stepIndex) => stepIndex === index ? { ...detail, [key]: value } : detail),
  }));
  const addStep = () => setDraft((current) => ({ ...current, stepsFr: [...current.stepsFr, ""], stepsEn: [...current.stepsEn, ""], stepDetails: [...current.stepDetails, emptyStepDetail()] }));
  const moveStep = (index: number, direction: -1 | 1) => setDraft((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.stepsFr.length) return current;
    const stepsFr = [...current.stepsFr];
    const stepsEn = [...current.stepsEn];
    const stepDetails = [...current.stepDetails];
    [stepsFr[index], stepsFr[target]] = [stepsFr[target], stepsFr[index]];
    [stepsEn[index], stepsEn[target]] = [stepsEn[target], stepsEn[index]];
    [stepDetails[index], stepDetails[target]] = [stepDetails[target], stepDetails[index]];
    return { ...current, stepsFr, stepsEn, stepDetails };
  });
  const removeStep = (index: number) => {
    if (draft.stepsFr.length <= 2) return;
    setDraft((current) => ({ ...current, stepsFr: current.stepsFr.filter((_, stepIndex) => stepIndex !== index), stepsEn: current.stepsEn.filter((_, stepIndex) => stepIndex !== index), stepDetails: current.stepDetails.filter((_, stepIndex) => stepIndex !== index) }));
  };
  const updateIngredient = <K extends keyof IngredientDraft>(index: number, key: K, value: IngredientDraft[K]) => update("ingredients", draft.ingredients.map((ingredient, ingredientIndex) => ingredientIndex === index ? { ...ingredient, [key]: value } : ingredient));
  const updateIngredientProduct = (index: number, productId: string) => setDraft((current) => {
    const previousProductId = current.ingredients[index]?.productId;
    return {
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) => ingredientIndex === index ? { ...ingredient, productId, alternativeProductIds: ingredient.alternativeProductIds.filter((id) => id !== productId) } : ingredient),
      stepDetails: current.stepDetails.map((detail) => ({
        ...detail,
        ingredientProductIds: Array.from(new Set(detail.ingredientProductIds.map((id) => id === previousProductId ? productId : id).filter(Boolean))),
      })),
    };
  });
  const removeIngredient = (index: number) => setDraft((current) => {
    if (current.ingredients.length <= 1) return current;
    const removedProductId = current.ingredients[index]?.productId;
    const ingredients = current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);
    const productStillUsed = ingredients.some((ingredient) => ingredient.productId === removedProductId);
    return {
      ...current,
      ingredients,
      stepDetails: current.stepDetails.map((detail) => ({
        ...detail,
        ingredientProductIds: productStillUsed ? detail.ingredientProductIds : detail.ingredientProductIds.filter((id) => id !== removedProductId),
      })),
    };
  });

  const applyTemplate = (template: DishTemplate) => {
    const ingredients = template.ingredients.map((ingredient) => ingredientFromTemplate(ingredient, products, locale));
    const templateProductsById = new Map(products.map((product) => [product.id, product]));
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
      stepDetails: template.stepsFr.map((step, index) => ({
        ...stepDetailFromInstructions(step, template.stepsEn[index] || "", index),
        ingredientProductIds: linkedProductsForStep(step, template.stepsEn[index] || "", ingredients, templateProductsById),
      })),
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

  const resetEditor = () => {
    setDraft(initialDraft());
    setSubmitError("");
    setTemplateOpen(false);
    setTemplateQuery("");
    setTemplateCountry("");
    setPendingTemplate(null);
    setImportSummary(null);
  };

  const handleOpen = (nextOpen: boolean) => {
    if (submitting) return;
    if (nextOpen) {
      if (!editing) resetEditor();
      setPreviewLocale(locale);
      setOpen(true);
      return;
    }
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    resetEditor();
    setOpen(false);
  };

  const discardChanges = () => {
    resetEditor();
    setDiscardOpen(false);
    setOpen(false);
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
      resetEditor();
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
                <section className="border-t border-terre/20 pt-4" data-testid="recipe-storefront-preview">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Reflet client" : "Customer view"}</p>
                      <h3 className="truncate text-sm font-extrabold text-charcoal">{isFr ? "Aperçu de la carte recette" : "Recipe card preview"}</h3>
                    </div>
                    <div className="flex shrink-0 rounded-md border border-burgundy/15 bg-white p-0.5" role="group" aria-label={isFr ? "Langue de l'aperçu recette" : "Recipe preview language"}>
                      {(["fr", "en"] as const).map((language) => <button key={language} type="button" aria-pressed={previewLocale === language} onClick={() => setPreviewLocale(language)} className={`h-7 min-w-9 rounded px-2 text-[10px] font-black uppercase transition ${previewLocale === language ? "bg-burgundy text-white" : "text-muted-foreground hover:text-charcoal"}`}>{language}</button>)}
                    </div>
                  </div>
                  <div className="mx-auto mt-4 w-full max-w-[190px]">
                    <RecipeCardPreview recipe={previewRecipe} locale={previewLocale} compact />
                  </div>
                </section>
              </div>
            </section>

            <section className="border-y border-border bg-[#F7F7F4] px-5 py-6 sm:px-7" aria-labelledby="recipe-steps-title">
              <SectionTitle id="recipe-steps-title" number="03" title={isFr ? "Préparation guidée professionnelle" : "Professional guided preparation"} description={isFr ? "Documentez chaque geste : ingrédients exacts, temps, chaleur, matériel, raison culinaire, résultat observable, conseil, vigilance et rattrapage. Tout apparaît dans le mode cuisson du client." : "Document every action: exact ingredients, timing, heat, equipment, culinary rationale, visible result, tip, safety and recovery. Everything appears in the customer's cooking mode."} />
              <PreparationSteps stepsFr={draft.stepsFr} stepsEn={draft.stepsEn} details={draft.stepDetails} ingredients={draft.ingredients} productsById={productsById} onChangeFr={(index, value) => updateStep("stepsFr", index, value)} onChangeEn={(index, value) => updateStep("stepsEn", index, value)} onChangeDetail={updateStepDetail} onAdd={addStep} onRemove={removeStep} onMove={moveStep} isFr={isFr} />
            </section>

            <section className="px-5 py-6 sm:px-7" aria-labelledby="recipe-ingredients-title">
              <div className="flex flex-wrap items-end justify-between gap-3"><SectionTitle id="recipe-ingredients-title" number="04" title={isFr ? "Ingrédients reliés au stock" : "Stock-linked ingredients"} description={isFr ? "Les quantités sont définies pour le nombre de portions indiqué plus haut." : "Quantities are defined for the serving count above."} /><Button type="button" variant="outline" size="sm" onClick={() => update("ingredients", [...draft.ingredients, emptyIngredient()])}><Plus className="mr-1.5 h-4 w-4" /> {isFr ? "Ajouter un ingrédient" : "Add ingredient"}</Button></div>
              <div className="mt-5 space-y-3">
                {productsLoading ? <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> {isFr ? "Lecture du catalogue..." : "Loading catalogue..."}</div> : null}
                {draft.ingredients.map((ingredient, index) => {
                  const product = productsById.get(ingredient.productId);
                  return <div key={index} className="border-y border-border bg-white px-3 py-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1.5fr)_7rem_7rem_8rem_auto] lg:items-end">
                      <Field label={`${isFr ? "Produit" : "Product"} ${index + 1}`} required><div className="relative"><PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><select aria-label={`${isFr ? "Produit" : "Product"} ${index + 1}`} value={ingredient.productId} onChange={(event) => updateIngredientProduct(index, event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm"><option value="">{isFr ? "Sélectionner dans le catalogue" : "Select from catalogue"}</option>{products.map((option) => <option key={option.id} value={option.id}>{option.name} · {availableProductQty(option)} {isFr ? "dispo." : "available"}</option>)}</select></div>{product ? <div className="mt-2 flex items-center gap-2"><ProductImage src={product.imageUrl} alt={product.name} emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-8 w-8 shrink-0" rounded="rounded-md" /><p className={`min-w-0 truncate text-[10px] font-semibold ${availableProductQty(product) > 0 ? "text-burgundy" : "text-destructive"}`}>{product.traditionalName} · {product.sku} · {availableProductQty(product) > 0 ? `${availableProductQty(product)} ${isFr ? "disponibles" : "available"}${product.reservedQty ? ` · ${product.reservedQty} ${isFr ? "réservés" : "reserved"}` : ""}` : (isFr ? "rupture" : "out of stock")}</p></div> : null}{ingredient.note ? <p className={`mt-1.5 line-clamp-2 text-[9px] leading-4 ${product ? "text-muted-foreground" : "font-bold text-terre"}`}><BookOpenCheck className="mr-1 inline h-3 w-3" />{ingredient.note}{product ? "" : (isFr ? " · à relier" : " · link required")}</p> : null}</Field>
                      <Field label={isFr ? "Quantité" : "Quantity"} required><Input aria-label={`${isFr ? "Quantité" : "Quantity"} ${index + 1}`} type="number" inputMode="decimal" min="0.01" step="0.01" value={ingredient.quantityPerBase} onChange={(event) => updateIngredient(index, "quantityPerBase", event.target.value)} /></Field>
                      <Field label={isFr ? "Unité" : "Unit"}><select aria-label={`${isFr ? "Unité" : "Unit"} ${index + 1}`} value={ingredient.unit} onChange={(event) => updateIngredient(index, "unit", event.target.value as IngredientDraft["unit"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="L">L</option><option value="piece">{isFr ? "pièce" : "piece"}</option><option value="tbsp">{isFr ? "c. à soupe" : "tbsp"}</option><option value="tsp">{isFr ? "c. à café" : "tsp"}</option></select></Field>
                      <Field label={isFr ? "Rôle" : "Role"}><select aria-label={`${isFr ? "Rôle" : "Role"} ${index + 1}`} value={ingredient.role} onChange={(event) => updateIngredient(index, "role", event.target.value as IngredientDraft["role"])} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="base">Base</option><option value="protein">{isFr ? "Protéine" : "Protein"}</option><option value="aromatic">{isFr ? "Aromate" : "Aromatic"}</option><option value="spice">{isFr ? "Épice" : "Spice"}</option><option value="fat">{isFr ? "Matière grasse" : "Fat"}</option><option value="side">{isFr ? "Accompagnement" : "Side"}</option><option value="optional">Option</option></select></Field>
                      <div className="flex items-center justify-between gap-2 sm:pb-0.5"><label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><input type="checkbox" checked={ingredient.optional} onChange={(event) => updateIngredient(index, "optional", event.target.checked)} className="h-4 w-4 accent-terre" /> {isFr ? "Optionnel" : "Optional"}</label><Button type="button" variant="ghost" size="icon" disabled={draft.ingredients.length === 1} onClick={() => removeIngredient(index)} className="h-9 w-9 text-destructive" aria-label={isFr ? `Supprimer l'ingrédient ${index + 1}` : `Remove ingredient ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>
                    </div>
                    <IngredientAlternativesPicker index={index} ingredient={ingredient} products={products} locale={locale} onChange={(alternativeProductIds) => updateIngredient(index, "alternativeProductIds", alternativeProductIds)} />
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
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><Trash2 className="h-5 w-5" /></span>
          <AlertDialogTitle>{isFr ? "Abandonner la recette en cours ?" : "Discard this recipe?"}</AlertDialogTitle>
          <AlertDialogDescription>{isFr ? "Les titres, les étapes de préparation, les liaisons d'ingrédients et les réglages non enregistrés seront perdus. Aucune recette publiée ne sera modifiée." : "Unsaved titles, preparation steps, ingredient links and settings will be lost. No published recipe will be changed."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{isFr ? "Continuer la recette" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={discardChanges} className="bg-destructive text-white hover:bg-destructive/90">{isFr ? "Oui, abandonner" : "Yes, discard"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

function IngredientAlternativesPicker({ index, ingredient, products, locale, onChange }: { index: number; ingredient: IngredientDraft; products: ProductOption[]; locale: "fr" | "en"; onChange: (productIds: string[]) => void }) {
  const isFr = locale === "fr";
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(ingredient.alternativeProductIds), [ingredient.alternativeProductIds]);
  const orderedProducts = useMemo(() => {
    const normalizedQuery = normalizeSignal(query);
    return products
      .filter((product) => product.id !== ingredient.productId && (!normalizedQuery || normalizeSignal(`${product.name} ${product.traditionalName} ${product.sku}`).includes(normalizedQuery)))
      .sort((left, right) => Number(selected.has(right.id)) - Number(selected.has(left.id)) || left.name.localeCompare(right.name, locale));
  }, [ingredient.productId, locale, products, query, selected]);
  const toggle = (productId: string) => {
    if (selected.has(productId)) onChange(ingredient.alternativeProductIds.filter((id) => id !== productId));
    else if (ingredient.alternativeProductIds.length < 8) onChange([...ingredient.alternativeProductIds, productId]);
  };

  return (
    <details className="group mt-3 border-t border-burgundy/10 pt-2" data-testid={`recipe-alternatives-${index + 1}`}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-left marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre"><RefreshCw className="h-3.5 w-3.5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-charcoal">{isFr ? "Alternatives proposées au client" : "Customer replacement choices"}</span><span className="block truncate text-[9px] text-muted-foreground">{ingredient.alternativeProductIds.length ? (isFr ? `${ingredient.alternativeProductIds.length}/8 choix pilotés par la cuisine` : `${ingredient.alternativeProductIds.length}/8 kitchen-curated choices`) : (isFr ? "Suggestions automatiques tant qu'aucun choix n'est défini" : "Automatic suggestions until choices are curated")}</span></span>
        <span className="rounded bg-burgundy/[0.07] px-2 py-1 text-[9px] font-black tabular-nums text-burgundy">{ingredient.alternativeProductIds.length}/8</span>
      </summary>
      <div className="pb-1 pt-3">
        {!ingredient.productId ? <p className="border-l-2 border-gold px-3 py-2 text-[10px] leading-4 text-muted-foreground">{isFr ? "Sélectionnez d'abord le produit principal pour configurer ses alternatives." : "Select the primary product before curating its alternatives."}</p> : (
          <>
            <label className="relative block max-w-md">
              <span className="sr-only">{isFr ? `Rechercher une alternative pour l'ingrédient ${index + 1}` : `Search an alternative for ingredient ${index + 1}`}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={isFr ? `Rechercher une alternative pour l'ingrédient ${index + 1}` : `Search an alternative for ingredient ${index + 1}`} placeholder={isFr ? "Nom, appellation ou référence" : "Name, traditional name or SKU"} className="h-9 bg-[#FFFCFA] pl-9 text-xs" />
            </label>
            <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label={isFr ? `Alternatives de l'ingrédient ${index + 1}` : `Ingredient ${index + 1} alternatives`}>
              {orderedProducts.map((product) => {
                const active = selected.has(product.id);
                const disabled = !active && ingredient.alternativeProductIds.length >= 8;
                return <button key={product.id} type="button" aria-pressed={active} disabled={disabled} onClick={() => toggle(product.id)} aria-label={isFr ? `${active ? "Retirer" : "Ajouter"} ${product.name} ${active ? "des" : "aux"} alternatives` : `${active ? "Remove" : "Add"} ${product.name} ${active ? "from" : "to"} alternatives`} className={`grid min-h-14 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-md border p-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-burgundy/35 bg-burgundy/[0.055]" : "border-charcoal/10 bg-white hover:border-terre/35"}`}>
                  <ProductImage src={product.imageUrl} alt="" emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" />
                  <span className="min-w-0"><span className="block truncate text-[10px] font-black text-charcoal">{product.name}</span><span className={`mt-0.5 block truncate text-[8px] font-bold ${availableProductQty(product) > 0 ? "text-muted-foreground" : "text-destructive"}`}>{availableProductQty(product) > 0 ? `${availableProductQty(product)} ${isFr ? "en stock" : "in stock"}` : (isFr ? "Rupture" : "Out of stock")}</span></span>
                  <CheckCircle2 className={`h-4 w-4 ${active ? "text-burgundy" : "text-charcoal/15"}`} />
                </button>;
              })}
            </div>
            {!orderedProducts.length ? <p className="py-5 text-center text-[10px] text-muted-foreground">{isFr ? "Aucun produit ne correspond à cette recherche." : "No product matches this search."}</p> : null}
            <p className="mt-2 text-[9px] leading-4 text-muted-foreground">{isFr ? "Ces choix apparaissent en priorité dans le configurateur. Sans sélection, le moteur conserve ses suggestions compatibles." : "These choices take priority in the configurator. Without a selection, the engine keeps its compatible suggestions."}</p>
          </>
        )}
      </div>
    </details>
  );
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

function PreparationSteps({ stepsFr, stepsEn, details, ingredients, productsById, onChangeFr, onChangeEn, onChangeDetail, onAdd, onRemove, onMove, isFr }: { stepsFr: string[]; stepsEn: string[]; details: StepDetailDraft[]; ingredients: IngredientDraft[]; productsById: Map<string, ProductOption>; onChangeFr: (index: number, value: string) => void; onChangeEn: (index: number, value: string) => void; onChangeDetail: <K extends keyof StepDetailDraft>(index: number, key: K, value: StepDetailDraft[K]) => void; onAdd: () => void; onRemove: (index: number) => void; onMove: (index: number, direction: -1 | 1) => void; isFr: boolean }) {
  const activeMinutes = details.reduce((total, detail) => total + (Number(detail.durationMinutes) || 0), 0);
  const restMinutes = details.reduce((total, detail) => total + (Number(detail.restMinutes) || 0), 0);
  const completeCues = details.filter((detail) => detail.cueFr.trim().length >= 10 && detail.cueEn.trim().length >= 10).length;
  const linkedSteps = details.filter((detail) => detail.ingredientProductIds.length > 0).length;
  return <div className="mt-5">
    <div className="mb-4 grid grid-cols-5 divide-x divide-border border-y border-border bg-white py-3 text-center" aria-label={isFr ? "Couverture détaillée de la préparation" : "Detailed preparation coverage"} data-testid="recipe-step-coverage">
      <div className="min-w-0 px-1.5"><Timer className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 truncate text-[8px] font-black uppercase text-charcoal sm:text-[9px]">{activeMinutes} min</p><p className="truncate text-[8px] text-muted-foreground">{isFr ? "actives" : "active"}</p></div>
      <div className="min-w-0 px-1.5"><Hourglass className="mx-auto h-4 w-4 text-gold" /><p className="mt-1 truncate text-[8px] font-black uppercase text-charcoal sm:text-[9px]">{restMinutes} min</p><p className="truncate text-[8px] text-muted-foreground">{isFr ? "repos" : "rest"}</p></div>
      <div className="min-w-0 px-1.5"><CookingPot className="mx-auto h-4 w-4 text-burgundy" /><p className="mt-1 truncate text-[8px] font-black uppercase text-charcoal sm:text-[9px]">{stepsFr.length}</p><p className="truncate text-[8px] text-muted-foreground">{isFr ? "gestes" : "actions"}</p></div>
      <div className="min-w-0 px-1.5"><Eye className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 truncate text-[8px] font-black uppercase text-charcoal sm:text-[9px]">{completeCues}/{stepsFr.length}</p><p className="truncate text-[8px] text-muted-foreground">{isFr ? "repères" : "cues"}</p></div>
      <div className="min-w-0 px-1.5"><Link2 className="mx-auto h-4 w-4 text-burgundy" /><p className="mt-1 truncate text-[8px] font-black uppercase text-charcoal sm:text-[9px]">{linkedSteps}/{stepsFr.length}</p><p className="truncate text-[8px] text-muted-foreground">{isFr ? "reliées" : "linked"}</p></div>
    </div>
    <div className="hidden grid-cols-[2rem_1fr_1fr_7.5rem] gap-2 px-1 pb-2 text-[10px] font-black uppercase text-muted-foreground lg:grid"><span /><span>{isFr ? "Français" : "French"}</span><span>English</span><span>{isFr ? "Ordre" : "Order"}</span></div>
    <ol className="space-y-3">{stepsFr.map((step, index) => {
      const detail = details[index] || emptyStepDetail();
      const previewLocale = isFr ? "fr" : "en";
      const previewText = isFr ? step : (stepsEn[index] || "");
      const previewDetails: RecipeStepDetails = {
        title: isFr ? detail.titleFr : detail.titleEn,
        durationMinutes: Number(detail.durationMinutes) || null,
        restMinutes: Number(detail.restMinutes) || 0,
        heat: detail.heat,
        temperatureC: Number(detail.temperatureC) || null,
        equipment: isFr ? detail.equipmentFr : detail.equipmentEn,
        cue: isFr ? detail.cueFr : detail.cueEn,
        tip: isFr ? detail.tipFr : detail.tipEn,
        warning: isFr ? detail.warningFr : detail.warningEn,
        why: isFr ? detail.whyFr : detail.whyEn,
        recovery: isFr ? detail.recoveryFr : detail.recoveryEn,
        ingredientProductIds: detail.ingredientProductIds,
      };
      const guide = buildRecipeStepGuide(previewText, index, previewLocale, previewDetails);
      const detailed = Number(detail.durationMinutes) >= 1 && detail.cueFr.trim().length >= 10 && detail.cueEn.trim().length >= 10;
      const enhanced = detailed && Boolean(detail.titleFr.trim() && detail.titleEn.trim() && detail.equipmentFr.trim() && detail.equipmentEn.trim() && detail.tipFr.trim() && detail.tipEn.trim() && detail.whyFr.trim() && detail.whyEn.trim() && detail.recoveryFr.trim() && detail.recoveryEn.trim());
      const quality = enhanced
        ? { label: isFr ? "Guidage complet" : "Complete guidance", className: "bg-burgundy/[0.08] text-burgundy" }
        : detailed
          ? { label: isFr ? "À enrichir" : "Add more detail", className: "bg-gold/15 text-charcoal" }
          : { label: isFr ? "Trop bref" : "Too brief", className: "bg-terre/[0.08] text-terre" };
      const completeGuidance = () => {
        const french = buildRecipeStepGuide(step, index, "fr");
        const english = buildRecipeStepGuide(stepsEn[index] || "", index, "en");
        const values: Array<[keyof StepDetailDraft, string]> = [
          ["titleFr", detail.titleFr || french.title],
          ["titleEn", detail.titleEn || english.title],
          ["durationMinutes", detail.durationMinutes || String(french.durationMinutes)],
          ["restMinutes", Number(detail.restMinutes) > 0 ? detail.restMinutes : String(french.restMinutes)],
          ["heat", detail.heat === "none" ? french.heat : detail.heat],
          ["equipmentFr", detail.equipmentFr || french.equipment || ""],
          ["equipmentEn", detail.equipmentEn || english.equipment || ""],
          ["cueFr", detail.cueFr || french.cue],
          ["cueEn", detail.cueEn || english.cue],
          ["tipFr", detail.tipFr || french.tip],
          ["tipEn", detail.tipEn || english.tip],
          ["warningFr", detail.warningFr || french.warning || ""],
          ["warningEn", detail.warningEn || english.warning || ""],
          ["whyFr", detail.whyFr || french.why],
          ["whyEn", detail.whyEn || english.why],
          ["recoveryFr", detail.recoveryFr || french.recovery],
          ["recoveryEn", detail.recoveryEn || english.recovery],
        ];
        values.forEach(([key, value]) => onChangeDetail(index, key, value as never));
      };
      return <li key={index} className="grid gap-3 border-y border-border bg-white px-3 py-3 lg:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem] lg:items-start">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-burgundy text-[10px] font-black text-white">{index + 1}</span>
        <div><Label className="mb-1.5 block lg:hidden">{isFr ? "Français" : "French"}</Label><Textarea aria-label={isFr ? `Étape ${index + 1} en français` : `Step ${index + 1} in French`} value={step} onChange={(event) => onChangeFr(index, event.target.value)} rows={4} maxLength={800} className="min-h-28 resize-y leading-5" placeholder="Ex. Cuire à feu doux 12 minutes en remuant toutes les 2 minutes, jusqu’à ce que la sauce soit brillante et nappe la cuillère." /></div>
        <div><Label className="mb-1.5 block lg:hidden">English</Label><Textarea aria-label={`Step ${index + 1} in English`} value={stepsEn[index] || ""} onChange={(event) => onChangeEn(index, event.target.value)} rows={4} maxLength={800} className="min-h-28 resize-y leading-5" placeholder="E.g. Cook over low heat for 12 minutes, stirring every 2 minutes, until the sauce is glossy and coats a spoon." /></div>
        <div className="flex items-center justify-end gap-1 lg:justify-start" aria-label={isFr ? `Ordre de l'étape ${index + 1}` : `Step ${index + 1} order`}>
          <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => onMove(index, -1)} className="h-9 w-9 bg-white" aria-label={isFr ? `Monter l'étape ${index + 1}` : `Move step ${index + 1} up`}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" disabled={index === stepsFr.length - 1} onClick={() => onMove(index, 1)} className="h-9 w-9 bg-white" aria-label={isFr ? `Descendre l'étape ${index + 1}` : `Move step ${index + 1} down`}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={stepsFr.length <= 2} onClick={() => onRemove(index)} className="h-9 w-9 text-destructive" aria-label={isFr ? `Supprimer l'étape ${index + 1}` : `Remove step ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
        </div>
        <fieldset className="min-w-0 border-t border-border pt-3 lg:col-span-3 lg:col-start-2" data-testid={`recipe-step-details-${index + 1}`}>
          <legend className="pr-2 text-[9px] font-black uppercase text-burgundy">{isFr ? "Repères professionnels" : "Professional cues"}</legend>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[9px] leading-4 text-muted-foreground">{isFr ? "Complétez le geste, le matériel, le résultat attendu et les points de vigilance." : "Complete the action, equipment, expected result and safety cues."}</p>
            <Button type="button" variant="outline" size="sm" onClick={completeGuidance} disabled={!step.trim() || !(stepsEn[index] || "").trim()} className="h-8 shrink-0 border-burgundy/20 bg-white px-2 text-[9px] font-bold text-burgundy hover:bg-burgundy hover:text-white"><WandSparkles className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Compléter les repères" : "Complete cues"}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={isFr ? "Temps actif (min)" : "Active time (min)"} required><Input aria-label={`${isFr ? "Temps actif de l'étape" : "Step active time"} ${index + 1}`} type="number" inputMode="numeric" min="1" max="240" value={detail.durationMinutes} onChange={(event) => onChangeDetail(index, "durationMinutes", event.target.value)} /></Field>
            <Field label={isFr ? "Repos (min)" : "Rest (min)"}><Input aria-label={`${isFr ? "Temps de repos de l'étape" : "Step resting time"} ${index + 1}`} type="number" inputMode="numeric" min="0" max="720" value={detail.restMinutes} onChange={(event) => onChangeDetail(index, "restMinutes", event.target.value)} /></Field>
            <Field label={isFr ? "Chaleur" : "Heat"}><select aria-label={`${isFr ? "Niveau de chaleur de l'étape" : "Step heat level"} ${index + 1}`} value={detail.heat} onChange={(event) => onChangeDetail(index, "heat", event.target.value as RecipeStepHeat)} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"><option value="none">{isFr ? "Sans cuisson" : "No heat"}</option><option value="low">{isFr ? "Feu doux" : "Low heat"}</option><option value="medium">{isFr ? "Feu moyen" : "Medium heat"}</option><option value="high">{isFr ? "Feu vif" : "High heat"}</option><option value="oven">{isFr ? "Four" : "Oven"}</option></select></Field>
            <Field label={isFr ? "Température (°C)" : "Temperature (°C)"}><Input aria-label={`${isFr ? "Température de l'étape" : "Step temperature"} ${index + 1}`} type="number" inputMode="numeric" min="30" max="300" value={detail.temperatureC} onChange={(event) => onChangeDetail(index, "temperatureC", event.target.value)} placeholder="180" /></Field>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <PreparationLanguageFields language="fr" index={index} detail={detail} onChange={onChangeDetail} />
            <PreparationLanguageFields language="en" index={index} detail={detail} onChange={onChangeDetail} />
          </div>
          <StepIngredientLinks index={index} ingredientProductIds={detail.ingredientProductIds} ingredients={ingredients} productsById={productsById} onChange={(ingredientProductIds) => onChangeDetail(index, "ingredientProductIds", ingredientProductIds)} isFr={isFr} />
        </fieldset>
        {previewText.trim() ? <div className="min-w-0 border-l-2 border-terre bg-[#F7F7F4] px-3 py-2.5 lg:col-span-3 lg:col-start-2" data-testid={`recipe-step-preview-${index + 1}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase text-charcoal">{isFr ? "Aperçu du guide client" : "Customer guide preview"}</p>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${quality.className}`}>{quality.label}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-muted-foreground"><span className="inline-flex items-center gap-1"><Timer className="h-3 w-3 text-terre" />{guide.durationLabel}</span>{guide.restLabel ? <span className="inline-flex items-center gap-1"><Hourglass className="h-3 w-3 text-gold" />{guide.restLabel}</span> : null}<span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-gold" />{guide.heatLabel}</span>{guide.temperatureLabel ? <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3 text-terre" />{guide.temperatureLabel}</span> : null}</div>
          <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground"><strong className="text-charcoal/75">{isFr ? "Résultat attendu :" : "Expected result:"}</strong> {guide.cue}</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground"><strong className="text-charcoal/75">{isFr ? "Pourquoi :" : "Why:"}</strong> {guide.why}</p>
          <p className="mt-1 text-[10px] leading-4 text-terre"><strong>{isFr ? "Rattrapage :" : "Recovery:"}</strong> {guide.recovery}</p>
        </div> : null}
      </li>;
    })}</ol>
    <Button type="button" variant="outline" size="sm" onClick={onAdd} className="mt-3"><Plus className="mr-1.5 h-4 w-4" /> {isFr ? "Ajouter une étape bilingue" : "Add bilingual step"}</Button>
  </div>;
}

function PreparationLanguageFields({ language, index, detail, onChange }: { language: "fr" | "en"; index: number; detail: StepDetailDraft; onChange: <K extends keyof StepDetailDraft>(index: number, key: K, value: StepDetailDraft[K]) => void }) {
  const french = language === "fr";
  const titleKey: "titleFr" | "titleEn" = french ? "titleFr" : "titleEn";
  const equipmentKey: "equipmentFr" | "equipmentEn" = french ? "equipmentFr" : "equipmentEn";
  const cueKey: "cueFr" | "cueEn" = french ? "cueFr" : "cueEn";
  const tipKey: "tipFr" | "tipEn" = french ? "tipFr" : "tipEn";
  const warningKey: "warningFr" | "warningEn" = french ? "warningFr" : "warningEn";
  const whyKey: "whyFr" | "whyEn" = french ? "whyFr" : "whyEn";
  const recoveryKey: "recoveryFr" | "recoveryEn" = french ? "recoveryFr" : "recoveryEn";
  return <div className="min-w-0 border-t-2 border-burgundy/10 pt-3">
    <p className="mb-3 text-[9px] font-black uppercase text-charcoal">{french ? "Détails en français" : "Details in English"}</p>
    <div className="space-y-3">
      <Field label={french ? "Titre clair de l’action" : "Clear action title"} required><Input aria-label={`${french ? "Titre de l'étape" : "Step title"} ${index + 1} ${language}`} value={detail[titleKey]} onChange={(event) => onChange(index, titleKey, event.target.value)} maxLength={100} placeholder={french ? "Maîtriser la cuisson de la sauce" : "Control the sauce cooking"} /></Field>
      <Field label={french ? "Matériel utile" : "Useful equipment"}><div className="relative"><CookingPot className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label={`${french ? "Matériel de l'étape" : "Step equipment"} ${index + 1} ${language}`} value={detail[equipmentKey]} onChange={(event) => onChange(index, equipmentKey, event.target.value)} maxLength={160} className="pl-9" placeholder={french ? "Cocotte, spatule large" : "Heavy pot, wide spatula"} /></div></Field>
      <Field label={french ? "Résultat observable" : "Visible result"} required><div className="relative"><Eye className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-burgundy" /><Textarea aria-label={`${french ? "Résultat attendu de l'étape" : "Step expected result"} ${index + 1} ${language}`} value={detail[cueKey]} onChange={(event) => onChange(index, cueKey, event.target.value)} rows={2} maxLength={500} className="min-h-20 resize-y pl-9 leading-5" placeholder={french ? "La sauce est brillante et nappe la cuillère." : "The sauce is glossy and coats a spoon."} /></div></Field>
      <Field label={french ? "Conseil du chef" : "Chef's tip"}><div className="relative"><Lightbulb className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gold" /><Textarea aria-label={`${french ? "Conseil de l'étape" : "Step tip"} ${index + 1} ${language}`} value={detail[tipKey]} onChange={(event) => onChange(index, tipKey, event.target.value)} rows={2} maxLength={500} className="min-h-20 resize-y pl-9 leading-5" /></div></Field>
      <Field label={french ? "Pourquoi ce geste compte" : "Why this action matters"} required><div className="relative"><CircleHelp className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-burgundy" /><Textarea aria-label={`${french ? "Pourquoi de l'étape" : "Step rationale"} ${index + 1} ${language}`} value={detail[whyKey]} onChange={(event) => onChange(index, whyKey, event.target.value)} rows={2} maxLength={500} className="min-h-20 resize-y pl-9 leading-5" placeholder={french ? "Expliquez l'effet sur la texture, le goût ou la cuisson." : "Explain the effect on texture, flavour or cooking."} /></div></Field>
      <Field label={french ? "Rattrapage si le repère manque" : "Recovery if the cue is missed"} required><div className="relative"><LifeBuoy className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-terre" /><Textarea aria-label={`${french ? "Rattrapage de l'étape" : "Step recovery"} ${index + 1} ${language}`} value={detail[recoveryKey]} onChange={(event) => onChange(index, recoveryKey, event.target.value)} rows={2} maxLength={500} className="min-h-20 resize-y pl-9 leading-5" placeholder={french ? "Indiquez comment corriger une sauce trop fluide, une cuisson incomplète…" : "Explain how to correct a thin sauce, incomplete cooking…"} /></div></Field>
      <Field label={french ? "Vigilance ou allergène" : "Safety or allergen note"}><div className="relative"><ShieldAlert className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-terre" /><Textarea aria-label={`${french ? "Vigilance de l'étape" : "Step warning"} ${index + 1} ${language}`} value={detail[warningKey]} onChange={(event) => onChange(index, warningKey, event.target.value)} rows={2} maxLength={500} className="min-h-20 resize-y pl-9 leading-5" /></div></Field>
    </div>
  </div>;
}

function StepIngredientLinks({ index, ingredientProductIds, ingredients, productsById, onChange, isFr }: { index: number; ingredientProductIds: string[]; ingredients: IngredientDraft[]; productsById: Map<string, ProductOption>; onChange: (ids: string[]) => void; isFr: boolean }) {
  const availableIngredients = ingredients.filter((ingredient) => ingredient.productId).filter((ingredient, ingredientIndex, items) => items.findIndex((item) => item.productId === ingredient.productId) === ingredientIndex);
  const toggle = (productId: string) => onChange(ingredientProductIds.includes(productId)
    ? ingredientProductIds.filter((id) => id !== productId)
    : [...ingredientProductIds, productId]);
  return <div className="mt-4 border-t border-border pt-3">
    <div className="flex items-start gap-2">
      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
      <div>
        <p className="text-[10px] font-black text-charcoal">{isFr ? "Ingrédients utilisés exactement à cette étape" : "Ingredients used in this exact step"}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">{isFr ? "Le client verra les quantités recalculées pour ses portions, y compris après un remplacement." : "The customer sees quantities recalculated for their servings, including after a substitution."}</p>
      </div>
    </div>
    {availableIngredients.length ? <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={isFr ? `Ingrédients de l'étape ${index + 1}` : `Ingredients for step ${index + 1}`}>
      {availableIngredients.map((ingredient) => {
        const product = productsById.get(ingredient.productId);
        const selected = ingredientProductIds.includes(ingredient.productId);
        return <label key={ingredient.productId} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition ${selected ? "border-burgundy/35 bg-burgundy/[0.055]" : "border-border bg-white hover:border-terre/30"}`}>
          <input type="checkbox" checked={selected} onChange={() => toggle(ingredient.productId)} className="h-4 w-4 accent-terre" aria-label={isFr ? `Utiliser ${product?.name || product?.traditionalName || ingredient.productId} à l'étape ${index + 1}` : `Use ${product?.name || product?.traditionalName || ingredient.productId} in step ${index + 1}`} />
          {product ? <ProductImage src={product.imageUrl} alt="" emoji={product.imageEmoji} color={product.imageColor} size="sm" className="h-7 w-7 shrink-0" rounded="rounded-md" /> : null}
          <span className="max-w-36 truncate text-[10px] font-bold text-charcoal">{product?.name || product?.traditionalName || (isFr ? "Produit relié" : "Linked product")}</span>
        </label>;
      })}
    </div> : <p className="mt-2 text-[9px] font-semibold text-terre">{isFr ? "Reliez d'abord les produits dans la section Ingrédients ci-dessous." : "Link products in the Ingredients section below first."}</p>}
  </div>;
}
