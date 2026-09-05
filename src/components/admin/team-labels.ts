import type { AdminAction, AdminModule } from "@/lib/admin-permissions";
import type { TeamPermissionMap, TeamStatus } from "@/components/admin/team-types";

const ROLE_COPY: Record<string, { fr: [string, string]; en: [string, string] }> = {
  super_admin: { fr: ["Super administrateur", "Protège la plateforme, les habilitations et l'ensemble des opérations."], en: ["Super administrator", "Protects the platform, access rights and all operations."] },
  direction: { fr: ["Direction", "Supervise tous les indicateurs sans modifier les opérations."], en: ["Direction", "Oversees all indicators without changing operations."] },
  catalog_manager: { fr: ["Responsable catalogue", "Publie les produits et maintient une offre exacte et vendable."], en: ["Catalogue manager", "Publishes products and maintains an accurate, sellable offer."] },
  recipe_manager: { fr: ["Responsable recettes", "Compose les recettes achetables et contrôle leurs ingrédients."], en: ["Recipe manager", "Builds shoppable recipes and controls their ingredients."] },
  purchase_manager: { fr: ["Responsable achats", "Pilote les approvisionnements, les coûts bruts et les lots."], en: ["Purchasing manager", "Controls sourcing, gross costs and batches."] },
  warehouse_manager: { fr: ["Responsable entrepôt", "Garantit la disponibilité, la traçabilité et la chaîne du froid."], en: ["Warehouse manager", "Secures availability, traceability and the cold chain."] },
  logistics: { fr: ["Logistique", "Prépare et fait avancer les commandes jusqu'à la livraison."], en: ["Logistics", "Prepares and advances orders through delivery."] },
  support: { fr: ["Relation client", "Consulte les commandes et accompagne les clients sans accès financier."], en: ["Customer care", "Reviews orders and assists customers without financial access."] },
  marketing: { fr: ["Marketing", "Diffuse les campagnes et valorise les produits et recettes publiés."], en: ["Marketing", "Runs campaigns and promotes published products and recipes."] },
  accounting: { fr: ["Comptabilité", "Contrôle les encaissements, la rentabilité et les preuves d'audit."], en: ["Accounting", "Controls payments, profitability and audit evidence."] },
};

const MODULE_COPY: Record<AdminModule, [string, string]> = {
  dashboard: ["Cockpit", "Cockpit"],
  catalog: ["Catalogue", "Catalogue"],
  recipes: ["Recettes", "Recipes"],
  orders: ["Commandes", "Orders"],
  stock: ["Stocks et lots", "Stock and batches"],
  logistics: ["Logistique", "Logistics"],
  customers: ["Relation client", "Customer relations"],
  marketing: ["Marketing", "Marketing"],
  finance: ["Finance", "Finance"],
  audit: ["Audit", "Audit"],
  team: ["Équipe", "Team"],
  settings: ["Paramètres", "Settings"],
};

const ACTION_COPY: Record<AdminAction, [string, string]> = {
  read: ["Consulter", "View"],
  create: ["Créer", "Create"],
  update: ["Modifier", "Update"],
  delete: ["Supprimer", "Delete"],
};

export function roleLabel(role: string, locale: "fr" | "en") {
  return ROLE_COPY[role]?.[locale]?.[0] || role.replaceAll("_", " ");
}

export function roleDescription(role: string, locale: "fr" | "en") {
  return ROLE_COPY[role]?.[locale]?.[1] || (locale === "fr" ? "Périmètre professionnel contrôlé côté serveur." : "Professional scope enforced server-side.");
}

export function moduleLabel(module: AdminModule, locale: "fr" | "en") {
  return MODULE_COPY[module][locale === "fr" ? 0 : 1];
}

export function actionLabel(action: AdminAction, locale: "fr" | "en") {
  return ACTION_COPY[action][locale === "fr" ? 0 : 1];
}

export function statusLabel(status: TeamStatus, locale: "fr" | "en") {
  if (status === "active") return locale === "fr" ? "Actif" : "Active";
  if (status === "invited") return locale === "fr" ? "Invitation envoyée" : "Invitation sent";
  return locale === "fr" ? "Suspendu" : "Suspended";
}

export function permissionTotals(permissions: TeamPermissionMap) {
  const modules = Object.values(permissions).filter((actions) => actions?.length).length;
  const actions = Object.values(permissions).reduce((total, values) => total + (values?.length || 0), 0);
  return { modules, actions };
}
