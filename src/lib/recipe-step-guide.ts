export type RecipeStepHeat = "none" | "low" | "medium" | "high" | "oven";
export type RecipeStepPhase = "mise-en-place" | "seasoning" | "cooking" | "resting" | "finishing";

export type RecipeStepGuide = {
  raw: string;
  title: string;
  instruction: string;
  durationMinutes: number;
  durationLabel: string;
  durationEstimated: boolean;
  restMinutes: number;
  restLabel: string | null;
  heat: RecipeStepHeat;
  heatLabel: string;
  temperatureC: number | null;
  temperatureLabel: string | null;
  equipment: string | null;
  cue: string;
  tip: string;
  warning: string | null;
  phase: RecipeStepPhase;
  phaseLabel: string;
  detailScore: number;
};

export type RecipeStepDetails = {
  durationMinutes?: number | null;
  restMinutes?: number | null;
  heat?: RecipeStepHeat | null;
  temperatureC?: number | null;
  equipment?: string | null;
  cue?: string | null;
  tip?: string | null;
  warning?: string | null;
};

type Locale = "fr" | "en";

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

function includesSignal(value: string, signal: string) {
  if (signal === "rest") return /(^|[^a-z])rest(?:s|ed|ing)?([^a-z]|$)/.test(value);
  return value.includes(signal);
}

const includesAny = (value: string, signals: string[]) => signals.some((signal) => includesSignal(value, signal));

function durationFromText(raw: string, locale: Locale) {
  const value = normalize(raw);
  const perSide = includesAny(value, ["par face", "de chaque cote", "per side", "each side"]);
  const minuteRange = value.match(/(\d+)\s*(?:a|to|-)\s*(\d+)\s*(?:min(?:ute)?s?)/);
  if (minuteRange) {
    const low = Number(minuteRange[1]);
    const high = Number(minuteRange[2]);
    return {
      minutes: Math.round((low + high) / 2),
      label: `${low}-${high} min${perSide ? (locale === "fr" ? " / face" : " / side") : ""}`,
    };
  }

  const hourRange = value.match(/(\d+)\s*(?:a|to|-)\s*(\d+)\s*(?:h|heure?s?|hours?)/);
  if (hourRange) {
    const low = Number(hourRange[1]);
    const high = Number(hourRange[2]);
    return { minutes: Math.round(((low + high) / 2) * 60), label: `${low}-${high} h` };
  }

  const minutes = value.match(/(\d+)\s*(?:min(?:ute)?s?)/);
  if (minutes) {
    const count = Number(minutes[1]);
    return {
      minutes: count,
      label: `${count} min${perSide ? (locale === "fr" ? " / face" : " / side") : ""}`,
    };
  }

  const hours = value.match(/(\d+)\s*(?:h|heure?s?|hours?)/);
  if (hours) {
    const count = Number(hours[1]);
    return { minutes: count * 60, label: `${count} h` };
  }

  if (includesAny(value, ["quelques minutes", "few minutes"])) {
    return { minutes: 4, label: "3-5 min" };
  }
  return null;
}

function estimatedDuration(raw: string) {
  const value = normalize(raw);
  if (includesAny(value, ["emincer", "couper", "trancher", "hacher", "slice", "cut", "chop"])) return 6;
  if (includesAny(value, ["rincer", "laver", "nettoyer", "rinse", "wash", "clean"])) return 5;
  if (includesAny(value, ["piler", "mixer", "ecraser", "tamiser", "pound", "blend", "crush", "sieve"])) return 8;
  if (includesAny(value, ["mariner", "reposer", "marinate", "rest"])) return 10;
  if (includesAny(value, ["frire", "braiser", "griller", "dorer", "fry", "grill", "brown"])) return 10;
  if (includesAny(value, ["mijoter", "fremir", "bouillir", "simmer", "boil"])) return 15;
  if (includesAny(value, ["vapeur", "steam"])) return 8;
  if (includesAny(value, ["servir", "dresser", "plate", "serve", "rectifier", "adjust seasoning"])) return 3;
  return 5;
}

function passiveRestDuration(raw: string, explicitDuration: ReturnType<typeof durationFromText>) {
  if (!explicitDuration) return 0;
  const value = normalize(raw);
  return includesAny(value, ["mariner", "laisser reposer", "laisser agir", "marinate", "leave to rest", "let rest", "rest for"])
    ? explicitDuration.minutes
    : 0;
}

function activeDurationBeforeRest(raw: string) {
  const value = normalize(raw);
  if (includesAny(value, ["masser", "enrober", "melanger", "inciser", "rub", "coat", "mix", "score"])) return 5;
  return 2;
}

function heatFromText(raw: string): RecipeStepHeat {
  const value = normalize(raw);
  if (includesAny(value, ["four", "oven", "bake", "rotir", "roast"])) return "oven";
  if (includesAny(value, ["feu vif", "moyen-vif", "high heat", "medium-high", "huile chaude", "hot oil", "frire", "fry", "griller", "grill", "braiser", "dorer", "brown", "faire revenir", "saute", "sauté"])) return "high";
  if (includesAny(value, ["feu doux", "low heat", "a feu doux", "mijoter", "simmer", "reduire le feu", "lower the heat"])) return "low";
  if (includesAny(value, ["feu moyen", "medium heat", "fremir", "boillir", "bouillir", "boil", "vapeur", "steam", "cuire", "cook", "ajouter", "incorporer", "verser", "add", "fold", "pour in"])) return "medium";
  return "none";
}

function heatLabel(heat: RecipeStepHeat, locale: Locale) {
  const labels = locale === "fr"
    ? { none: "Hors du feu", low: "Feu doux", medium: "Feu moyen", high: "Feu vif", oven: "Four" }
    : { none: "Off heat", low: "Low heat", medium: "Medium heat", high: "High heat", oven: "Oven" };
  return labels[heat];
}

function phaseFromText(raw: string, heat: RecipeStepHeat): RecipeStepPhase {
  const value = normalize(raw);
  if (includesAny(value, ["servir", "dresser", "repartir", "plate", "serve", "garnir", "garnish"])) return "finishing";
  if (includesAny(value, ["mariner", "assaisonner", "enrober", "marinate", "season", "coat"])) return "seasoning";
  if (includesAny(value, ["reposer", "laisser refroidir", "rest", "cool"]) && heat === "none") return "resting";
  if (heat !== "none" || includesAny(value, ["cuire", "chauffer", "frire", "mijoter", "cook", "heat", "fry", "simmer"])) return "cooking";
  return "mise-en-place";
}

function phaseLabel(phase: RecipeStepPhase, locale: Locale) {
  const labels = locale === "fr"
    ? { "mise-en-place": "Mise en place", seasoning: "Assaisonnement", cooking: "Cuisson", resting: "Repos", finishing: "Finition" }
    : { "mise-en-place": "Prep", seasoning: "Seasoning", cooking: "Cooking", resting: "Resting", finishing: "Finishing" };
  return labels[phase];
}

function equipmentFromText(raw: string, locale: Locale) {
  const value = normalize(raw);
  const equipment = (() => {
    if (includesAny(value, ["frire", "huile chaude", "fry", "hot oil"])) return ["Casserole profonde, écumoire et grille d’égouttage", "Deep pan, slotted spoon and draining rack"];
    if (includesAny(value, ["griller", "braiser", "gril", "grill"])) return ["Gril, pince et spatule large", "Grill, tongs and wide spatula"];
    if (includesAny(value, ["four", "oven", "rotir", "roast", "bake"])) return ["Plat adapté au four, maniques et thermomètre de cuisine", "Ovenproof dish, oven gloves and kitchen thermometer"];
    if (includesAny(value, ["piler", "mixer", "ecraser", "tamiser", "pound", "blend", "crush", "sieve"])) return ["Mortier ou mixeur, bol et tamis fin", "Mortar or blender, bowl and fine sieve"];
    if (includesAny(value, ["vapeur", "steam", "attieke"])) return ["Panier vapeur ou couscoussier et fourchette", "Steamer basket or couscoussier and fork"];
    if (includesAny(value, ["mijoter", "fremir", "bouillir", "sauce", "simmer", "boil", "stew"])) return ["Cocotte à fond épais, couvercle et cuillère en bois", "Heavy pot, lid and wooden spoon"];
    if (includesAny(value, ["emincer", "couper", "trancher", "inciser", "hacher", "slice", "cut", "chop", "score"])) return ["Planche stable et couteau bien aiguisé", "Stable board and sharp knife"];
    if (includesAny(value, ["mariner", "assaisonner", "enrober", "marinate", "season", "coat"])) return ["Grand bol non réactif et couvercle", "Large non-reactive bowl and cover"];
    if (includesAny(value, ["servir", "dresser", "repartir", "plate", "serve"])) return ["Plat de service, louche ou cuillère de dressage", "Serving dish, ladle or plating spoon"];
    return ["Bol de préparation et ustensile adapté", "Preparation bowl and suitable utensil"];
  })();
  return equipment[locale === "fr" ? 0 : 1];
}

function positiveInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function nonNegativeInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

const cleanText = (value: string | null | undefined) => value?.trim() || null;

function actionTitle(raw: string, index: number, locale: Locale) {
  const value = normalize(raw);
  const action = (() => {
    if (includesAny(value, ["mariner", "marinate", "reposer", "rest"]) && includesAny(value, ["prechauff", "preheat"])) return ["Laisser agir et préchauffer", "Rest and preheat"];
    if (includesAny(value, ["mariner", "marinate"])) return ["Mariner et parfumer", "Marinate and season"];
    if (includesAny(value, ["reposer", "rest", "reserve", "réserver"])) return ["Laisser les saveurs agir", "Let the flavours develop"];
    if (includesAny(value, ["rincer", "laver", "nettoyer", "rinse", "wash", "clean", "emincer", "couper", "slice", "cut", "chop"])) return ["Préparer avec précision", "Prepare precisely"];
    if (includesAny(value, ["piler", "mixer", "ecraser", "tamiser", "pound", "blend", "crush", "sieve"])) return ["Travailler la base", "Build the base"];
    if (includesAny(value, ["frire", "braiser", "griller", "dorer", "fry", "grill", "brown"])) return ["Saisir et colorer", "Sear and colour"];
    if (includesAny(value, ["mijoter", "fremir", "bouillir", "cuire", "simmer", "boil", "cook", "steam", "vapeur"])) return ["Maîtriser la cuisson", "Control the cooking"];
    if (includesAny(value, ["ajouter", "incorporer", "verser", "melanger", "add", "fold", "pour", "mix"])) return ["Assembler les saveurs", "Bring the flavours together"];
    if (includesAny(value, ["rectifier", "assaisonner", "gouter", "adjust", "season", "taste"])) return ["Équilibrer l’assaisonnement", "Balance the seasoning"];
    if (includesAny(value, ["servir", "dresser", "faconner", "serve", "plate", "shape"])) return ["Dresser et servir", "Plate and serve"];
    return [`Réaliser l’étape ${index + 1}`, `Complete step ${index + 1}`];
  })();
  return action[locale === "fr" ? 0 : 1];
}

function explicitResultCue(raw: string, locale: Locale) {
  const marker = locale === "fr"
    ? raw.match(/jusqu(?:'|’)à\s+(.+?)(?:[.;]|$)/i)
    : raw.match(/\buntil\s+(.+?)(?:[.;]|$)/i);
  if (!marker?.[1]) return null;
  return locale === "fr"
    ? `Repère donné par la recette : ${marker[1].trim()}.`
    : `Recipe cue: ${marker[1].trim()}.`;
}

function expectedCue(raw: string, locale: Locale) {
  const value = normalize(raw);
  const explicitCue = explicitResultCue(raw, locale);
  if (explicitCue) return explicitCue;
  const cue = (() => {
    if (includesAny(value, ["feuilles de manioc", "cassava leaves"])) return ["Les feuilles ont bouilli pendant toute la durée indiquée ; elles sont très tendres, foncées et ne dégagent plus d'odeur végétale crue.", "The leaves have boiled for the full stated time; they are very tender, dark and no longer have a raw vegetal smell."];
    if (includesAny(value, ["mariner", "marinate", "reposer", "rest"])) return ["La marinade enrobe uniformément l’aliment et le temps de repos indiqué est entièrement respecté.", "The marinade coats the food evenly and the full stated resting time has elapsed."];
    if (includesAny(value, ["emincer", "couper", "trancher", "inciser", "slice", "cut", "chop", "score"])) return ["Les morceaux et les entailles sont réguliers afin que l’assaisonnement et la cuisson progressent au même rythme.", "The pieces and cuts are even so seasoning and cooking progress at the same rate."];
    if (includesAny(value, ["assaisonner", "melanger", "season", "mix"]) && !includesAny(value, ["cuire", "cook", "frire", "fry", "grill", "mijoter", "simmer"])) return ["Chaque morceau est uniformément enrobé et aucun amas d’épices ne reste visible.", "Every piece is evenly coated, with no visible clumps of seasoning."];
    if (value.includes("attieke")) return ["Les grains sont chauds, souples et bien séparés, sans paquets humides.", "The grains are hot, supple and well separated, with no damp clumps."];
    if (includesAny(value, ["foutou", "placali"])) return ["La pâte est lisse, souple et brillante, sans grumeaux visibles.", "The dough is smooth, supple and glossy, with no visible lumps."];
    if (value.includes("riz") || value.includes("rice")) return ["Le liquide est absorbé et les grains sont tendres tout en restant distincts.", "The liquid is absorbed and the grains are tender while remaining distinct."];
    if (value.includes("poisson") || value.includes("fish") || value.includes("thon") || value.includes("tuna")) return ["La surface est colorée et la chair est opaque, moelleuse et se détache facilement.", "The surface is coloured and the flesh is opaque, moist and flakes easily."];
    if (includesAny(value, ["plantain", "alloco"])) return ["Les morceaux sont dorés et caramélisés sur les bords, mais encore fondants au centre.", "The pieces are golden and caramelised at the edges while still soft in the centre."];
    if (includesAny(value, ["frire", "dorer", "braiser", "griller", "fry", "brown", "grill"])) return ["La coloration est régulière sur toutes les faces, sans zone brûlée.", "The colour is even on every side, with no burnt patches."];
    if (includesAny(value, ["mijoter", "fremir", "reduire", "sauce", "simmer", "reduce", "stew"])) return ["La cuisson reste douce et la sauce devient homogène, brillante et légèrement nappante.", "The simmer stays gentle and the sauce becomes even, glossy and lightly coats a spoon."];
    if (includesAny(value, ["piler", "mixer", "ecraser", "tamiser", "pound", "blend", "crush", "sieve"])) return ["La base obtenue est régulière, sans gros morceaux ni fibres gênantes.", "The resulting base is even, with no large pieces or troublesome fibres."];
    if (includesAny(value, ["mariner", "assaisonner", "melanger", "marinate", "season", "mix"])) return ["Chaque morceau est uniformément enrobé et aucun amas d’épices ne reste visible.", "Every piece is evenly coated, with no visible clumps of seasoning."];
    if (includesAny(value, ["servir", "dresser", "plate", "serve"])) return ["Les éléments chauds et frais sont réunis seulement au dernier moment.", "Hot and fresh components come together only at the last moment."];
    return ["La préparation est homogène et prête pour l’action suivante.", "The preparation is even and ready for the next action."];
  })();
  return cue[locale === "fr" ? 0 : 1];
}

function practicalTip(raw: string, locale: Locale) {
  const value = normalize(raw);
  const tip = (() => {
    if (includesAny(value, ["frire", "huile chaude", "fry", "hot oil"])) return ["Travaillez en petites quantités pour garder l’huile chaude, puis égouttez sur une grille ou du papier absorbant.", "Work in small batches to keep the oil hot, then drain on a rack or absorbent paper."];
    if (includesAny(value, ["cocotte", "hermetiquement", "sealed pot", "seal the pot"])) return ["Gardez la cocotte fermée et secouez-la par les poignées au lieu de remuer.", "Keep the pot closed and shake it by the handles instead of stirring."];
    if (includesAny(value, ["riz", "rice"])) return ["Une fois couvert, évitez de remuer : la vapeur terminera la cuisson sans casser les grains.", "Once covered, avoid stirring: the steam will finish cooking without breaking the grains."];
    if (includesAny(value, ["mijoter", "sauce", "simmer", "stew"])) return ["Raclez doucement le fond de temps en temps et ajoutez le liquide par petites quantités si nécessaire.", "Gently scrape the base from time to time and add liquid in small amounts only if needed."];
    if (includesAny(value, ["mariner", "marinate"])) return ["Couvrez et gardez au frais pendant le repos, puis sortez la préparation juste avant la cuisson.", "Cover and refrigerate while resting, then take it out just before cooking."];
    if (includesAny(value, ["poisson", "fish", "thon", "tuna"]) && includesAny(value, ["cuire", "cook", "frire", "fry", "grill", "braiser"])) return ["Retournez le poisson avec une spatule large pour préserver sa chair et sa peau.", "Turn the fish with a wide spatula to protect its flesh and skin."];
    if (includesAny(value, ["piment", "chili", "spice"])) return ["Ajoutez le piment progressivement et goûtez avant d’en remettre.", "Add chili gradually and taste before adding more."];
    if (includesAny(value, ["servir", "dresser", "serve", "plate"])) return ["Préparez les assiettes et les accompagnements avant d’assembler pour servir sans attendre.", "Prepare plates and sides before assembling so the dish can be served immediately."];
    return ["Mesurez et placez les ingrédients de l’étape suivante à portée de main avant de commencer.", "Measure and place the next step’s ingredients within reach before starting."];
  })();
  return tip[locale === "fr" ? 0 : 1];
}

function safetyWarning(raw: string, locale: Locale) {
  const value = normalize(raw);
  const warning = (() => {
    if (includesAny(value, ["huile chaude", "frire", "fry", "hot oil"])) return ["Séchez les aliments et éloignez l’eau de l’huile pour éviter les projections.", "Dry the food and keep water away from the oil to prevent splashes."];
    if (includesAny(value, ["cocotte", "hermetiquement", "sealed pot", "seal the pot"])) return ["À l’ouverture, dirigez la vapeur loin du visage et des mains.", "When opening, direct steam away from your face and hands."];
    if (includesAny(value, ["poulet", "chicken", "poisson", "fish", "thon frais", "fresh tuna"])) return ["Après manipulation du produit cru, lavez les mains, le couteau et la planche avant de toucher les aliments prêts à servir.", "After handling the raw ingredient, wash hands, knife and board before touching ready-to-serve food."];
    return null;
  })();
  return warning ? warning[locale === "fr" ? 0 : 1] : null;
}

export function recipeStepDetailScore(raw: string) {
  const value = normalize(raw.trim());
  if (!value) return 0;
  let score = value.length >= 35 ? 1 : 0;
  if (durationFromText(value, "fr")) score += 1;
  if (heatFromText(value) !== "none") score += 1;
  if (includesAny(value, ["jusqu", "lorsque", "quand", "texture", "dore", "tendre", "brillant", "homogene", "until", "when", "texture", "golden", "tender", "glossy", "smooth"])) score += 1;
  return score;
}

export function buildRecipeStepGuide(
  raw: string,
  index: number,
  locale: Locale,
  details?: RecipeStepDetails | null,
): RecipeStepGuide {
  const instruction = raw.trim();
  const explicitDuration = durationFromText(instruction, locale);
  const storedDuration = positiveInteger(details?.durationMinutes);
  const inferredRestMinutes = passiveRestDuration(instruction, explicitDuration);
  const durationMinutes = storedDuration ?? (inferredRestMinutes > 0 ? activeDurationBeforeRest(instruction) : explicitDuration?.minutes) ?? estimatedDuration(instruction);
  const storedRestMinutes = nonNegativeInteger(details?.restMinutes);
  const restMinutes = storedRestMinutes && storedRestMinutes > 0 ? storedRestMinutes : inferredRestMinutes;
  const heat = details?.heat || heatFromText(instruction);
  const temperatureC = positiveInteger(details?.temperatureC);
  const phase = phaseFromText(instruction, heat);
  return {
    raw,
    title: actionTitle(instruction, index, locale),
    instruction,
    durationMinutes,
    durationLabel: storedDuration ? `${durationMinutes} min` : inferredRestMinutes > 0 ? `≈ ${durationMinutes} min` : explicitDuration?.label ?? `≈ ${durationMinutes} min`,
    durationEstimated: !storedDuration && (!explicitDuration || inferredRestMinutes > 0),
    restMinutes,
    restLabel: restMinutes > 0 ? `${restMinutes} min` : null,
    heat,
    heatLabel: heatLabel(heat, locale),
    temperatureC,
    temperatureLabel: temperatureC ? `${temperatureC} °C` : null,
    equipment: cleanText(details?.equipment) || equipmentFromText(instruction, locale),
    cue: cleanText(details?.cue) || expectedCue(instruction, locale),
    tip: cleanText(details?.tip) || practicalTip(instruction, locale),
    warning: details?.warning === "" ? null : cleanText(details?.warning) || safetyWarning(instruction, locale),
    phase,
    phaseLabel: phaseLabel(phase, locale),
    detailScore: recipeStepDetailScore(instruction),
  };
}

export function buildRecipeStepGuides(steps: string[], locale: Locale, details: RecipeStepDetails[] = []) {
  return steps.map((step, index) => buildRecipeStepGuide(step, index, locale, details[index]));
}
