import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as LocalPrismaClient } from "@prisma/client";
import { PrismaClient as PostgresPrismaClient } from "../src/generated/prisma-postgres/client.js";

const PROJECT_REF = "ahigidhuhqcmxzjxetnw";
const directUrl = process.env.DIRECT_URL;

if (!directUrl || !directUrl.includes(`db.${PROJECT_REF}.supabase.co`)) {
  throw new Error(`DIRECT_URL must target the JMA Supabase project (${PROJECT_REF}).`);
}

const local = new LocalPrismaClient();
const production = new PostgresPrismaClient({
  adapter: new PrismaPg({ connectionString: directUrl }),
});

async function readSeedData() {
  return {
    permissions: await local.permission.findMany(),
    categories: await local.category.findMany(),
    brands: await local.brand.findMany(),
    suppliers: await local.supplier.findMany(),
    products: await local.product.findMany(),
    productTranslations: await local.productTranslation.findMany(),
    productAliases: await local.productAlias.findMany(),
    productVariants: await local.productVariant.findMany(),
    recipes: await local.recipe.findMany(),
    recipeTranslations: await local.recipeTranslation.findMany(),
    recipeIngredients: await local.recipeIngredient.findMany(),
    warehouses: await local.warehouse.findMany(),
    warehouseLocations: await local.warehouseLocation.findMany(),
    inventoryBatches: await local.inventoryBatch.findMany(),
    carriers: await local.carrier.findMany(),
    deliveryZones: await local.deliveryZone.findMany(),
  };
}

async function assertEmptyProductionCatalog() {
  const [categories, brands, suppliers, products, recipes] = await Promise.all([
    production.category.count(),
    production.brand.count(),
    production.supplier.count(),
    production.product.count(),
    production.recipe.count(),
  ]);
  const existing = { categories, brands, suppliers, products, recipes };
  if (Object.values(existing).some((count) => count > 0)) {
    throw new Error(`Production catalog is not empty; import refused: ${JSON.stringify(existing)}`);
  }
}

async function createMany(delegate, data) {
  if (data.length) await delegate.createMany({ data });
}

async function main() {
  await assertEmptyProductionCatalog();
  const seed = await readSeedData();

  await production.$transaction(async (db) => {
    await createMany(db.permission, seed.permissions);
    await createMany(db.category, seed.categories);
    await createMany(db.brand, seed.brands);
    await createMany(db.supplier, seed.suppliers);
    await createMany(db.product, seed.products);
    await createMany(db.productTranslation, seed.productTranslations);
    await createMany(db.productAlias, seed.productAliases);
    await createMany(db.productVariant, seed.productVariants);
    await createMany(db.recipe, seed.recipes);
    await createMany(db.recipeTranslation, seed.recipeTranslations);
    await createMany(db.recipeIngredient, seed.recipeIngredients);
    await createMany(db.warehouse, seed.warehouses);
    await createMany(db.warehouseLocation, seed.warehouseLocations);
    await createMany(db.inventoryBatch, seed.inventoryBatches);
    await createMany(db.carrier, seed.carriers);
    await createMany(db.deliveryZone, seed.deliveryZones);
  }, { timeout: 60_000 });

  console.log(JSON.stringify({
    imported: true,
    categories: seed.categories.length,
    products: seed.products.length,
    recipes: seed.recipes.length,
    recipeIngredients: seed.recipeIngredients.length,
    warehouses: seed.warehouses.length,
    inventoryBatches: seed.inventoryBatches.length,
    carriers: seed.carriers.length,
    deliveryZones: seed.deliveryZones.length,
  }));
}

try {
  await main();
} finally {
  await Promise.allSettled([local.$disconnect(), production.$disconnect()]);
}
