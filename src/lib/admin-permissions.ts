export const ADMIN_MODULES = [
  "dashboard",
  "catalog",
  "recipes",
  "orders",
  "stock",
  "logistics",
  "customers",
  "marketing",
  "finance",
  "audit",
  "team",
  "settings",
] as const;

export const ADMIN_ACTIONS = ["read", "create", "update", "delete"] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

type PermissionMap = Partial<Record<AdminModule, readonly AdminAction[]>>;

const READ: readonly AdminAction[] = ["read"];
const MANAGE: readonly AdminAction[] = ["read", "create", "update", "delete"];

export const ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  super_admin: Object.fromEntries(ADMIN_MODULES.map((module) => [module, MANAGE])) as PermissionMap,
  direction: Object.fromEntries(ADMIN_MODULES.filter((module) => module !== "team").map((module) => [module, READ])) as PermissionMap,
  catalog_manager: { dashboard: READ, catalog: MANAGE, recipes: READ, stock: READ },
  recipe_manager: { dashboard: READ, catalog: READ, recipes: MANAGE, stock: READ },
  purchase_manager: { dashboard: READ, catalog: READ, stock: MANAGE, finance: READ },
  warehouse_manager: { dashboard: READ, catalog: READ, orders: READ, stock: MANAGE, logistics: READ },
  logistics: { dashboard: READ, orders: ["read", "update"], logistics: MANAGE, customers: READ },
  support: { dashboard: READ, orders: READ, customers: ["read", "update"] },
  marketing: { dashboard: READ, catalog: READ, recipes: READ, customers: READ, marketing: MANAGE },
  accounting: { dashboard: READ, orders: READ, stock: READ, finance: ["read", "update"], audit: READ },
};

export function hasAdminPermission(role: string, module: AdminModule, action: AdminAction = "read") {
  return Boolean(ROLE_PERMISSIONS[role]?.[module]?.includes(action));
}

export function permissionsForRole(role: string) {
  return ADMIN_MODULES.reduce<Partial<Record<AdminModule, AdminAction[]>>>((permissions, module) => {
    const actions = ROLE_PERMISSIONS[role]?.[module];
    if (actions?.length) permissions[module] = [...actions];
    return permissions;
  }, {});
}
