import "dotenv/config";
import { Pool } from "pg";

const PROJECT_REF = "ahigidhuhqcmxzjxetnw";
const directUrl = process.env.DIRECT_URL;
const execute = process.argv.includes("--execute");

if (!directUrl || !directUrl.includes(`db.${PROJECT_REF}.supabase.co`)) {
  throw new Error(`DIRECT_URL must target the JMA Supabase project (${PROJECT_REF}).`);
}

const DEMO_PRODUCT_SKUS = [
  "JMA-PLC-001", "JMA-ATT-002", "JMA-GAR-003", "JMA-FUF-004", "JMA-CHW-005", "JMA-MIL-010",
  "JMA-FON-011", "JMA-FRI-012", "JMA-KPL-020", "JMA-TRP-021", "JMA-POU-022", "JMA-MOR-030",
  "JMA-MAQ-031", "JMA-TIL-032", "JMA-GOM-040", "JMA-FMA-041", "JMA-PLA-042", "JMA-PIM-043",
  "JMA-GPA-050", "JMA-PAR-051", "JMA-DJM-052", "JMA-AKP-053", "JMA-SOU-054", "JMA-HPA-055",
  "JMA-PPD-056", "JMA-CTM-057", "JMA-EGO-058", "JMA-NIE-060", "JMA-ARA-061", "JMA-BAO-070",
  "JMA-BIS-071", "JMA-GIN-072", "JMA-THI-073",
];

const DEMO_RECIPE_SLUGS = ["sauce-graine", "sauce-gombo", "attieke-poisson", "placali-sauce-graine", "alloco-poulet", "mafe"];
const OPERATIONAL_TABLES = [
  "Address", "AdminMembership", "Advertisement", "AuditLog", "ContactMessage", "Customer", "Favorite", "GiftCard",
  "LegalConsent", "MediaAsset", "Notification", "Order", "OrderBatchAllocation", "OrderEvent", "OrderItem", "Payment",
  "Promotion", "PurchaseOrder", "PurchaseOrderItem", "PushSubscription", "Refund", "SavedRecipe", "Shipment", "StockMovement",
  "SupportTicket", "User", "WholesaleQuote", "WholesaleQuoteItem",
];

function sameValues(actual, expected) {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

async function counts(client, tables) {
  const result = {};
  for (const table of tables) result[table] = Number((await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)).rows[0].count);
  return result;
}

async function main() {
  const pool = new Pool({ connectionString: directUrl, max: 1 });
  const client = await pool.connect();
  try {
    const productSkus = (await client.query('SELECT "sku" FROM "Product" ORDER BY "sku"')).rows.map((row) => row.sku);
    const recipeSlugs = (await client.query('SELECT "slug" FROM "Recipe" ORDER BY "slug"')).rows.map((row) => row.slug);
    const operational = await counts(client, OPERATIONAL_TABLES);
    const populatedOperational = Object.entries(operational).filter(([, count]) => count > 0);

    if (!sameValues(productSkus, DEMO_PRODUCT_SKUS)) {
      throw new Error("Production products no longer match the known demo catalogue; purge refused.");
    }
    if (!sameValues(recipeSlugs, DEMO_RECIPE_SLUGS)) {
      throw new Error("Production recipes no longer match the known demo library; purge refused.");
    }
    if (populatedOperational.length) {
      throw new Error(`Real or operational records exist; purge refused: ${JSON.stringify(populatedOperational)}`);
    }

    const preview = {
      project: PROJECT_REF,
      execute,
      demoProducts: productSkus.length,
      demoRecipes: recipeSlugs.length,
      operationalRecords: 0,
    };
    if (!execute) {
      console.log(JSON.stringify({ ...preview, message: "Preview only. Re-run with --execute to purge." }));
      return;
    }

    await client.query("BEGIN");
    await client.query('DELETE FROM "RecipeIngredient"');
    await client.query('DELETE FROM "RecipeTranslation"');
    await client.query('DELETE FROM "Recipe"');
    await client.query('DELETE FROM "ProductVariant"');
    await client.query('DELETE FROM "ProductAlias"');
    await client.query('DELETE FROM "ProductTranslation"');
    await client.query('DELETE FROM "InventoryBatch"');
    await client.query('DELETE FROM "Product"');
    await client.query('DELETE FROM "WarehouseLocation"');
    await client.query('DELETE FROM "Warehouse"');
    await client.query('DELETE FROM "DeliveryZone"');
    await client.query('DELETE FROM "Carrier"');
    await client.query('DELETE FROM "Supplier"');
    await client.query('DELETE FROM "Brand"');
    await client.query(`
      INSERT INTO "PlatformConfiguration" (
        "id", "supportEmail", "supportPhone", "supportHoursFr", "supportHoursEn",
        "supportResponseHours", "businessCity", "businessCountry", "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        'primary', 'bonjour@je-mange-africain.com', '+33 7 69 59 16 42',
        'Du lundi au vendredi, de 9 h à 18 h', 'Monday to Friday, 9am to 6pm',
        48, 'Montreuil', 'France', 'production-purge', NOW(), NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "supportEmail" = EXCLUDED."supportEmail",
        "supportPhone" = EXCLUDED."supportPhone",
        "supportHoursFr" = EXCLUDED."supportHoursFr",
        "supportHoursEn" = EXCLUDED."supportHoursEn",
        "supportResponseHours" = EXCLUDED."supportResponseHours",
        "businessCity" = EXCLUDED."businessCity",
        "businessCountry" = EXCLUDED."businessCountry",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW()
    `);

    const emptied = await counts(client, ["Product", "Recipe", "InventoryBatch", "Warehouse", "DeliveryZone", "Carrier", "Supplier", "Brand"]);
    if (Object.values(emptied).some((count) => count !== 0)) throw new Error(`Demo purge verification failed: ${JSON.stringify(emptied)}`);
    await client.query("COMMIT");
    console.log(JSON.stringify({ ...preview, purged: true, remaining: emptied, platformConfiguration: 1 }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
