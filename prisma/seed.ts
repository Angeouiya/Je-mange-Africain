// Seed script for « Je mange Africain » — run with: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/* Helper to add days to now */
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);

async function main() {
  console.log("🌱 Seeding « Je mange Africain »…");

  // Wipe (order matters for FK)
  const tablenames = [
    "AuditLog", "Notification", "SupportTicket", "GiftCard", "Promotion",
    "DeliveryZone", "Carrier", "Shipment", "OrderEvent", "Refund", "Payment",
    "OrderItem", "Order", "StockMovement", "InventoryBatch", "WarehouseLocation",
    "Warehouse", "RecipeIngredient", "RecipeTranslation", "Recipe", "ProductVariant",
    "ProductAlias", "ProductTranslation", "Favorite", "Product", "Category",
    "Brand", "Supplier", "Address", "Customer", "Permission", "User",
  ];
  for (const t of tablenames) {
    await (db as any)[t[0].toLowerCase() + t.slice(1)].deleteMany();
    // alternate casing fallback
  }
  // Prisma model names are camelCase in client
  for (const t of tablenames) {
    try { await (db as any)[t.charAt(0).toLowerCase() + t.slice(1)].deleteMany(); } catch {}
  }

  /* ---------------- Users & RBAC ---------------- */
  const adminUser = await db.user.create({
    data: {
      email: "admin@jemangeafricain.fr",
      role: "super_admin",
      firstName: "Aïssata",
      lastName: "Koné",
      twoFactor: true,
      isActive: true,
    },
  });
  const demoUser = await db.user.create({
    data: {
      email: "client@demo.fr",
      role: "customer",
      firstName: "Awa",
      lastName: "Traoré",
      phone: "+33 6 12 34 56 78",
    },
  });

  const permissions = [
    ["super_admin", "catalog", '["read","create","update","delete"]'],
    ["super_admin", "recipes", '["read","create","update","delete"]'],
    ["super_admin", "stock", '["read","create","update","delete"]'],
    ["super_admin", "orders", '["read","create","update","delete"]'],
    ["super_admin", "payments", '["read","create","update","delete"]'],
    ["super_admin", "settings", '["read","create","update","delete"]'],
    ["catalog_manager", "catalog", '["read","create","update"]'],
    ["recipe_manager", "recipes", '["read","create","update"]'],
    ["warehouse_manager", "stock", '["read","create","update"]'],
    ["picker", "orders", '["read","update"]'],
    ["support", "orders", '["read","update"]'],
  ] as const;
  for (const [role, module, actions] of permissions) {
    await db.permission.create({ data: { role, module, actions } });
  }

  const customer = await db.customer.create({
    data: {
      userId: demoUser.id,
      loyaltyPoints: 1250,
      walletCredit: 15,
      preferredLang: "fr",
      addresses: {
        create: [
          {
            label: "Domicile", firstName: "Awa", lastName: "Traoré",
            street: "12 rue de la Gare", postalCode: "75011", city: "Paris", country: "France",
            phone: "+33 6 12 34 56 78", isDefault: true,
          },
        ],
      },
    },
  });

  /* ---------------- Brands & Suppliers ---------------- */
  const brands = {
    maison: await db.brand.create({ data: { slug: "maison-jma", nameFr: "Maison Je mange Africain", nameEn: "Je mange Africain House", country: "France" } }),
    terroir: await db.brand.create({ data: { slug: "terroir-afrique", nameFr: "Terroir d'Afrique", nameEn: "Terroir d'Afrique", country: "Côte d'Ivoire" } }),
    boukan: await db.brand.create({ data: { slug: "boukan", nameFr: "Boukan", nameEn: "Boukan", country: "Sénégal" } }),
    mama: await db.brand.create({ data: { slug: "mama-africa", nameFr: "Mama Africa", nameEn: "Mama Africa", country: "Cameroun" } }),
  };

  const suppliers = {
    abidjan: await db.supplier.create({ data: { name: "Import'Abidjan SARL", country: "Côte d'Ivoire", contact: "Yao Konan", email: "contact@importabidjan.ci", phone: "+225 07 00 00 00", rating: 5 } }),
    dakar: await db.supplier.create({ data: { name: "Dakar Distribution", country: "Sénégal", contact: "Fatou Diallo", email: "ventes@dakardistrib.sn", phone: "+221 77 000 000", rating: 4 } }),
    yaounde: await db.supplier.create({ data: { name: "Yaoundé Foods", country: "Cameroun", contact: "Paul Mbarga", email: "info@yaoundefoods.cm", phone: "+237 6 90 00 00", rating: 4 } }),
  };

  /* ---------------- Categories ---------------- */
  const catDefs = [
    { slug: "manioc", fr: "Manioc & dérivés", en: "Cassava & derivatives", emoji: "🍠", color: "#D65A32" },
    { slug: "farines", fr: "Farines & céréales", en: "Flours & grains", emoji: "🌾", color: "#F2A900" },
    { slug: "viandes", fr: "Viandes & traditionnels", en: "Meats & traditional", emoji: "🥩", color: "#C0392B" },
    { slug: "poissons", fr: "Poissons & fruits de mer", en: "Fish & seafood", emoji: "🐟", color: "#326B8A" },
    { slug: "legumes", fr: "Légumes & feuilles", en: "Vegetables & leaves", emoji: "🥬", color: "#8A3042" },
    { slug: "sauces", fr: "Sauces, épices & condiments", en: "Sauces, spices & condiments", emoji: "🌶️", color: "#D65A32" },
    { slug: "legumineuses", fr: "Légumineuses & graines", en: "Legumes & seeds", emoji: "🫘", color: "#F2A900" },
    { slug: "boissons", fr: "Boissons & desserts", en: "Drinks & desserts", emoji: "🥤", color: "#D65A32" },
  ] as const;

  const cats: Record<string, string> = {};
  for (let i = 0; i < catDefs.length; i++) {
    const c = catDefs[i];
    const cat = await db.category.create({
      data: {
        slug: c.slug, nameFr: c.fr, nameEn: c.en, icon: c.emoji, color: c.color,
        sortOrder: i,
        descriptionFr: `Découvrez notre sélection de ${c.fr.toLowerCase()} authentiques.`,
        descriptionEn: `Discover our authentic ${c.en.toLowerCase()}.`,
      },
    });
    cats[c.slug] = cat.id;
  }

  /* ---------------- Products ---------------- */
  // Each product: [slug, sku, traditional, catSlug, brandKey, supplierKey, country, thermal, storageType, storageTemp, weightG, volumeMl, unit, packaging, price, promoPrice, imageColor, imageEmoji, bestseller, isNew, isOnSale, frName, frDesc, enName, enDesc, frPrep, enPrep, frStorage, enStorage, frIngredients, enIngredients, frAllergens, enAllergens, nutrition, aliases[], variants[]]
  type ProductDef = [
    string, string, string, string, string, string, string, string, string, string|null, number, number, string, string, number, number|null, string, string, boolean, boolean, boolean,
    string, string, string, string, string|null, string|null, string|null, string|null, string|null, string|null, string|null, string|null, string|null, string[], string[]
  ];

  const products: ProductDef[] = [
    // Manioc
    ["placali-frais", "JMA-PLC-001", "Placali", "manioc", "maison", "abidjan", "Côte d'Ivoire", "FROZEN", "SURGELE", "-18°C", 500, 0, "piece", "Sachet 500 g", 6.9, 5.9, "#D65A32", "🍲", true, false, true,
      "Placali frais", "Pâte de manioc fermentée, base de nombreux plats traditionnels ivoiriens. Texture moelleuse, goût légèrement acidulé.", "Fresh placali", "Fermented cassava dough, base of many traditional Ivorian dishes. Soft texture, slightly tangy taste.", "Réchauffer à la vapeur 10 min, servir avec une sauce graine ou gombo.", "Steam for 10 min, serve with palm nut or okra sauce.", "Maintenir congelé. À consommer 24 h après décongélation.", "Keep frozen. Consume within 24 h after thawing.", "Manioc fermenté.", "Fermented cassava.", "Aucun.", "None.",
      '{"energy":"165 kcal","fat":"0.5 g","saturated":"0.1 g","carbs":"38 g","sugars":"1 g","protein":"1.2 g","salt":"0.05 g"}',
      ["placali", "pâte de manioc fermentée", "fermented cassava dough", "plakali"], ["500 g|500|0|6.9|true", "1 kg|1000|0|12.9|false"]],
    ["attieke", "JMA-ATT-002", "Attiéké", "manioc", "maison", "abidjan", "Côte d'Ivoire", "AMBIANT", "SEC", null, 500, 0, "piece", "Sachet 500 g", 4.5, null, "#F2A900", "🍚", true, true, false,
      "Attiéké", "Semoule de manioc fermentée, couscous ivoirien léger et fondant. Idéal avec le poisson.", "Attiéké", "Fermented cassava semolina, light and fluffy Ivorian couscous. Perfect with fish.", "Réhydrater avec un peu d'eau tiède, égrainer, servir tiède.", "Rehydrate with a little warm water, fluff, serve warm.", "À conserver au sec et à l'abri de la lumière.", "Store in a dry place away from light.", "Manioc fermenté.", "Fermented cassava.", "Aucun.", "None.",
      '{"energy":"160 kcal","fat":"0.3 g","saturated":"0.05 g","carbs":"37 g","sugres":"0.5 g","protein":"1 g","salt":"0.1 g"}',
      ["attiéké", "attieke", "couscous de manioc", "attieke", "fermented cassava couscous"], ["500 g|500|0|4.5|true", "1 kg|1000|0|8.5|false", "2 kg|2000|0|15.9|false"]],
    ["gari-blanc", "JMA-GAR-003", "Gari blanc", "manioc", "terroir", "abidjan", "Côte d'Ivoire", "AMBIANT", "SEC", null, 1, 0, "kg", "Sac 1 kg", 5.9, null, "#F2A900", "🌾", false, false, false,
      "Gari blanc", "Semoule de manioc fermenté et grillé, base du garba et des collations rapides.", "White gari", "Fermented roasted cassava grits, base of garba and quick snacks.", "Saupoudrer d'eau, sucre ou lait selon goût.", "Sprinkle with water, sugar or milk to taste.", "Au sec, à l'abri de l'humidité.", "Dry, away from moisture.", "Manioc.", "Cassava.", "Aucun.", "None.",
      '{"energy":"170 kcal","fat":"0.4 g","saturated":"0.1 g","carbs":"40 g","sugars":"1 g","protein":"0.8 g","salt":"0.1 g"}',
      ["gari", "garri", "semoule de manioc"], ["1 kg|1000|0|5.9|true", "2 kg|2000|0|10.9|false"]],
    ["fufu-manioc", "JMA-FUF-004", "Fufu de manioc", "manioc", "mama", "yaounde", "Cameroun", "AMBIANT", "SEC", null, 1, 0, "kg", "Sac 1 kg", 7.2, null, "#D65A32", "🥣", false, false, false,
      "Fufu de manioc", "Farine précuite pour préparer le fufu, pâte épaisse et lisse à tremper dans les sauces.", "Cassava fufu", "Precooked flour to make fufu, thick smooth dough to dip in sauces.", "Verser dans l'eau bouillante, fouetter jusqu'à épaississement.", "Pour into boiling water, whisk until thick.", "Au sec.", "Dry.", "Manioc.", "Cassava.", "Aucun.", "None.",
      '{"energy":"155 kcal","fat":"0.2 g","saturated":"0.05 g","carbs":"36 g","sugars":"0.5 g","protein":"0.7 g","salt":"0.05 g"}',
      ["fufu", "foufou", "foutou", "cassava fufu"], ["1 kg|1000|0|7.2|true", "500 g|500|0|3.9|false"]],
    ["chikwangue", "JMA-CHW-005", "Chikwangue", "manioc", "terroir", "yaounde", "Cameroun", "AMBIANT", "FRAIS", null, 400, 0, "piece", "Bâton 400 g", 3.5, null, "#8A3042", "🥖", false, true, false,
      "Chikwangue", "Bâton de manioc cuit enveloppé dans des feuilles, pâte dense et fondante.", "Chikwangue", "Cooked cassava stick wrapped in leaves, dense and smooth dough.", "Réchauffer 10 min à la vapeur, déguster chaud.", "Steam 10 min, serve hot.", "Quelques jours au frais.", "A few days in the fridge.", "Manioc.", "Cassava.", "Aucun.", "None.",
      '{"energy":"150 kcal","fat":"0.3 g","saturated":"0.05 g","carbs":"35 g","sugars":"0.5 g","protein":"0.8 g","salt":"0.05 g"}',
      ["chikwangue", "kwanga", "bâton de manioc", "cassava stick"], ["Bâton 400 g|400|0|3.5|true", "Lot de 3|1200|0|9.9|false"]],

    // Farines & céréales
    ["farine-mil", "JMA-MIL-010", "Farine de mil", "farines", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 1, 0, "kg", "Sac 1 kg", 5.5, null, "#F2A900", "🌾", true, false, false,
      "Farine de mil", "Farine de millet complet, base des bouillies, tô et pâtes traditionnelles.", "Millet flour", "Whole millet flour, base of porridge, tô and traditional pastes.", "Mélanger à l'eau froide puis cuire en remuant.", "Mix in cold water then cook stirring.", "Au sec.", "Dry.", "Millet.", "Millet.", "Aucun.", "None.",
      '{"energy":"180 kcal","fat":"1.5 g","saturated":"0.3 g","carbs":"36 g","sugars":"0.5 g","protein":"5 g","salt":"0.02 g"}',
      ["farine de mil", "farine de millet", "millet flour", "mil flour", "farine de millet"], ["1 kg|1000|0|5.5|true", "2 kg|2000|0|10.5|false"]],
    ["fonio", "JMA-FON-011", "Fonio", "farines", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 500, 0, "piece", "Sachet 500 g", 6.9, null, "#F2A900", "🌾", false, true, false,
      "Fonio", "Céréale africaine ancienne, sans gluten, digeste et nourrissante.", "Fonio", "Ancient African grain, gluten-free, digestible and nourishing.", "Rincer, cuire 10 min à l'eau salée.", "Rinse, cook 10 min in salted water.", "Au sec.", "Dry.", "Fonio.", "Fonio.", "Aucun.", "None.",
      '{"energy":"160 kcal","fat":"0.5 g","saturated":"0.1 g","carbs":"36 g","sugars":"0.5 g","protein":"4 g","salt":"0.02 g"}',
      ["fonio", "acha", "digitaria"], ["500 g|500|0|6.9|true", "1 kg|1000|0|12.9|false"]],
    ["farine-riz", "JMA-FRI-012", "Farine de riz", "farines", "maison", "abidjan", "Côte d'Ivoire", "AMBIANT", "SEC", null, 500, 0, "piece", "Sachet 500 g", 4.2, null, "#F2A900", "🌾", false, false, false,
      "Farine de riz", "Farine de riz finement moulue pour pâtisseries et préparations sans gluten.", "Rice flour", "Finely milled rice flour for pastries and gluten-free preparations.", "Utiliser en pâtisserie ou sauce épaississante.", "Use in baking or as a thickener.", "Au sec.", "Dry.", "Riz.", "Rice.", "Aucun.", "None.",
      '{"energy":"150 kcal","fat":"0.3 g","saturated":"0.05 g","carbs":"33 g","sugars":"0.3 g","protein":"2.7 g","salt":"0.02 g"}',
      ["farine de riz", "rice flour"], ["500 g|500|0|4.2|true"]],

    // Viandes
    ["kplo-fume", "JMA-KPL-020", "Kplô fumé", "viandes", "mama", "yaounde", "Cameroun", "FROZEN", "SURGELE", "-18°C", 500, 0, "piece", "Sachet 500 g", 9.9, 8.5, "#C0392B", "🥩", true, false, true,
      "Kplô fumé", "Peau de bœuf fumée et séchée, ingrédient emblématique des sauces africaines, texture gélatineuse.", "Smoked kplô", "Smoked dried beef skin, iconic ingredient of African sauces, gelatinous texture.", "Faire tremper 1 h, cuire 30 min jusqu'à tendreté.", "Soak 1 h, cook 30 min until tender.", "Congelé.", "Frozen.", "Peau de bœuf.", "Beef skin.", "Aucun.", "None.",
      '{"energy":"210 kcal","fat":"12 g","saturated":"4 g","carbs":"2 g","sugars":"0 g","protein":"22 g","salt":"1.2 g"}',
      ["kplô", "kplo", "beef skin", "peau de bœuf", "peau de boeuf", "kploh", "cow skin"], ["500 g|500|0|9.9|true", "1 kg|1000|0|18.9|false"]],
    ["tripes", "JMA-TRP-021", "Tripes", "viandes", "mama", "yaounde", "Cameroun", "FROZEN", "SURGELE", "-18°C", 1, 0, "kg", "Sachet 1 kg", 11.5, null, "#C0392B", "🥩", false, false, false,
      "Tripes", "Tripes de bœuf nettoyées, prêtes à cuisiner, idéales pour les sauces et ragoûts.", "Tripe", "Cleaned beef tripe, ready to cook, ideal for sauces and stews.", "Bien rincer, blanchir 10 min, mijoter 1 h.", "Rinse well, blanch 10 min, simmer 1 h.", "Congelé.", "Frozen.", "Tripes de bœuf.", "Beef tripe.", "Aucun.", "None.",
      '{"energy":"130 kcal","fat":"5 g","saturated":"2 g","carbs":"1 g","sugars":"0 g","protein":"18 g","salt":"0.6 g"}',
      ["tripes", "tripe", "beef tripe", "trippa"], ["1 kg|1000|0|11.5|true"]],
    ["poulet-fermier", "JMA-POU-022", "Poulet fermier", "viandes", "terroir", "abidjan", "Côte d'Ivoire", "FROZEN", "SURGELE", "-18°C", 1500, 0, "piece", "Pièce 1.5 kg", 14.9, null, "#C0392B", "🍗", true, false, false,
      "Poulet fermier", "Poulet fermier découpé, saveur intense, idéal pour le kedjenou et les braises.", "Free-range chicken", "Cut free-range chicken, intense flavor, ideal for kedjenou and grills.", "Mariner, puis cuire 45 min selon recette.", "Marinate, then cook 45 min per recipe.", "Congelé.", "Frozen.", "Poulet.", "Chicken.", "Aucun.", "None.",
      '{"energy":"180 kcal","fat":"8 g","saturated":"2.5 g","carbs":"0 g","sugars":"0 g","protein":"25 g","salt":"0.2 g"}',
      ["poulet", "chicken", "poulet fermier"], ["Pièce 1.5 kg|1500|0|14.9|true"]],

    // Poissons
    ["morue-salee", "JMA-MOR-030", "Morue salée", "poissons", "terroir", "dakar", "Sénégal", "REFRIGERATED", "REFRIGERE", "2°C", 500, 0, "piece", "Sachet 500 g", 8.9, null, "#326B8A", "🐟", false, false, false,
      "Morue salée", "Morue (cabillaud) salée et séchée, base des sauces et accras.", "Salted cod", "Salted dried cod, base of sauces and fritters.", "Dessaler 24 h en changeant l'eau, puis cuire.", "Desalinate 24 h changing water, then cook.", "Réfrigéré après dessalage.", "Refrigerated after desalinating.", "Cabillaud.", "Cod.", "Poisson.", "Fish.",
      '{"energy":"90 kcal","fat":"0.5 g","saturated":"0.1 g","carbs":"0 g","sugars":"0 g","protein":"20 g","salt":"8 g"}',
      ["morue", "morue salée", "salted cod", "bacalao", "cabillaud"], ["500 g|500|0|8.9|true", "1 kg|1000|0|16.9|false"]],
    ["maquereau-fume", "JMA-MAQ-031", "Maquereau fumé", "poissons", "boukan", "dakar", "Sénégal", "FROZEN", "SURGELE", "-18°C", 400, 0, "piece", "Sachet 400 g", 7.5, null, "#326B8A", "🐟", true, false, false,
      "Maquereau fumé", "Filet de maquereau fumé au bois, goût riche, parfait avec l'attiéké.", "Smoked mackerel", "Wood-smoked mackerel fillet, rich taste, perfect with attiéké.", "Réchauffer doucement, servir avec attiéké et oignons.", "Gently reheat, serve with attiéké and onions.", "Congelé.", "Frozen.", "Maquereau.", "Mackerel.", "Poisson.", "Fish.",
      '{"energy":"220 kcal","fat":"15 g","saturated":"3 g","carbs":"0 g","sugars":"0 g","protein":"20 g","salt":"1.8 g"}',
      ["maquereau", "maquereau fumé", "smoked mackerel", "makayabu"], ["400 g|400|0|7.5|true", "800 g|800|0|13.9|false"]],
    ["tilapia", "JMA-TIL-032", "Tilapia entier", "poissons", "terroir", "abidjan", "Côte d'Ivoire", "FROZEN", "SURGELE", "-18°C", 600, 0, "piece", "Pièce 600 g", 8.9, null, "#326B8A", "🐟", false, false, false,
      "Tilapia", "Tilapia entier éviscéré, chair ferme, idéal grillé ou en sauce.", "Whole tilapia", "Whole gutted tilapia, firm flesh, ideal grilled or in sauce.", "Mariner, griller 20 min ou mijoter en sauce.", "Marinate, grill 20 min or simmer in sauce.", "Congelé.", "Frozen.", "Tilapia.", "Tilapia.", "Poisson.", "Fish.",
      '{"energy":"100 kcal","fat":"2 g","saturated":"0.5 g","carbs":"0 g","sugars":"0 g","protein":"20 g","salt":"0.1 g"}',
      ["tilapia", "tilapia entier", "whole tilapia"], ["Pièce 600 g|600|0|8.9|true"]],

    // Légumes & feuilles
    ["gombo-frais", "JMA-GOM-040", "Gombo frais", "legumes", "maison", "abidjan", "Côte d'Ivoire", "FROZEN", "SURGELE", "-18°C", 500, 0, "piece", "Sachet 500 g", 4.5, 3.9, "#8A3042", "🥬", true, false, true,
      "Gombo frais", "Gombo (okra) frais tranché, donne aux sauces leur texture caractéristique.", "Fresh okra", "Sliced fresh okra, gives sauces their signature texture.", "Ajouter en fin de cuisson, ne pas trop cuire.", "Add at the end of cooking, do not overcook.", "Congelé.", "Frozen.", "Gombo.", "Okra.", "Aucun.", "None.",
      '{"energy":"30 kcal","fat":"0.2 g","saturated":"0.05 g","carbs":"7 g","sugars":"1 g","protein":"1.5 g","salt":"0.02 g"}',
      ["gombo", "okra", "lady finger", "gumbo", "okro"], ["500 g|500|0|4.5|true", "1 kg|1000|0|8.5|false"]],
    ["feuilles-manioc", "JMA-FMA-041", "Feuilles de manioc", "legumes", "mama", "yaounde", "Cameroun", "FROZEN", "SURGELE", "-18°C", 500, 0, "piece", "Sachet 500 g", 4.9, null, "#8A3042", "🥬", true, false, false,
      "Feuilles de manioc", "Feuilles de manioc finement broyées (pondu / saka saka), base du ndolé et des sauces feuilles.", "Cassava leaves", "Finely pounded cassava leaves (pondu / saka saka), base of ndolé and leaf sauces.", "Cuire 1 h avec huile et assaisonnement.", "Cook 1 h with oil and seasoning.", "Congelé.", "Frozen.", "Feuilles de manioc.", "Cassava leaves.", "Aucun.", "None.",
      '{"energy":"85 kcal","fat":"1 g","saturated":"0.2 g","carbs":"18 g","sugars":"1 g","protein":"4 g","salt":"0.05 g"}',
      ["feuilles de manioc", "cassava leaves", "pondu", "saka saka", "saka-saka"], ["500 g|500|0|4.9|true", "1 kg|1000|0|9.2|false"]],
    ["banane-plantain", "JMA-PLA-042", "Banane plantain", "legumes", "terroir", "abidjan", "Côte d'Ivoire", "AMBIANT", "FRAIS", null, 1, 0, "kg", "Filet 1 kg", 3.9, null, "#F2A900", "🍌", true, false, false,
      "Banane plantain", "Banane plantain mûre, idéale pour l'alloco et les accompagnements.", "Plantain", "Ripe plantain, ideal for alloco and side dishes.", "Couper, frire 5 min pour l'alloco.", "Slice, fry 5 min for alloco.", "Température ambiante, à l'abri du soleil.", "Room temperature, away from sun.", "Banane plantain.", "Plantain.", "Aucun.", "None.",
      '{"energy":"140 kcal","fat":"0.4 g","saturated":"0.1 g","carbs":"36 g","sugars":"18 g","protein":"1.3 g","salt":"0.01 g"}',
      ["banane plantain", "plantain", "alloco banana"], ["1 kg|1000|0|3.9|true", "2 kg|2000|0|7.2|false"]],
    ["piment-frais", "JMA-PIM-043", "Piment frais", "legumes", "maison", "abidjan", "Côte d'Ivoire", "REFRIGERATED", "FRAIS", "4°C", 200, 0, "piece", "Sachet 200 g", 2.9, null, "#C0392B", "🌶️", false, false, false,
      "Piment frais", "Piment oiseau frais, pour relever toutes vos sauces.", "Fresh chili", "Fresh bird's eye chili, to spice up your sauces.", "Émincer ou entier selon goût.", "Slice or whole to taste.", "Réfrigéré.", "Refrigerated.", "Piment.", "Chili.", "Aucun.", "None.",
      '{"energy":"40 kcal","fat":"0.4 g","saturated":"0.05 g","carbs":"9 g","sugars":"5 g","protein":"1.9 g","salt":"0.01 g"}',
      ["piment", "piment frais", "chili", "pili pili", "scotch bonnet"], ["200 g|200|0|2.9|true"]],

    // Sauces, épices & condiments
    ["graine-palme", "JMA-GPA-050", "Graine de palme", "sauces", "maison", "abidjan", "Côte d'Ivoire", "FROZEN", "SURGELE", "-18°C", 500, 0, "piece", "Sachet 500 g", 5.9, 4.9, "#D65A32", "🌰", true, false, true,
      "Graine de palme", "Noix de palme fraîches, base de la sauce graine (sauce palme).", "Palm nuts", "Fresh palm nuts, base of palm nut sauce.", "Bouillir 30 min, écraser, tamiser pour extraire le jus.", "Boil 30 min, crush, sieve to extract juice.", "Congelé.", "Frozen.", "Noix de palme.", "Palm nuts.", "Aucun.", "None.",
      '{"energy":"180 kcal","fat":"13 g","saturated":"6 g","carbs":"10 g","sugars":"2 g","protein":"2.5 g","salt":"0.05 g"}',
      ["graine de palme", "graine palme", "palm nut", "noix de palme", "palm nuts", "sauce graine"], ["500 g|500|0|5.9|true", "1 kg|1000|0|10.9|false"]],
    ["pate-arachide", "JMA-PAR-051", "Pâte d'arachide", "sauces", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 400, 0, "piece", "Pot 400 g", 5.5, null, "#D65A32", "🥜", true, false, false,
      "Pâte d'arachide", "Pâte d'arachide pure, base du mafé et des sauces arachide.", "Peanut paste", "Pure peanut paste, base of mafé and peanut sauces.", "Diluer dans un peu d'eau chaude avant incorporation.", "Dilute in hot water before adding.", "Au frais après ouverture.", "Refrigerate after opening.", "Arachide.", "Peanut.", "Arachide.", "Peanut.",
      '{"energy":"590 kcal","fat":"48 g","saturated":"8 g","carbs":"22 g","sugars":"6 g","protein":"25 g","salt":"0.5 g"}',
      ["pâte d'arachide", "pate arachide", "peanut paste", "peanut butter", "arachide"], ["Pot 400 g|400|0|5.5|true", "Pot 800 g|800|0|9.9|false"]],
    ["djoumble", "JMA-DJM-052", "Djoumblé", "sauces", "maison", "abidjan", "Côte d'Ivoire", "AMBIANT", "SECHE", null, 200, 0, "piece", "Sachet 200 g", 4.2, null, "#8A3042", "🌿", false, false, false,
      "Djoumblé", "Poudre de gombo séché, épaissit les sauces gombo sans trancher.", "Dried okra powder", "Dried okra powder, thickens okra sauces without slicing.", "Saupoudrer en fin de cuisson, mélanger.", "Sprinkle at end of cooking, stir.", "Au sec.", "Dry.", "Gombo séché.", "Dried okra.", "Aucun.", "None.",
      '{"energy":"35 kcal","fat":"0.3 g","saturated":"0.05 g","carbs":"8 g","sugars":"1 g","protein":"1.7 g","salt":"0.05 g"}',
      ["djoumblé", "djoumble", "poudre de gombo", "dried okra powder", "okro powder"], ["200 g|200|0|4.2|true", "400 g|400|0|7.5|false"]],
    ["akpi", "JMA-AKP-053", "Akpi", "sauces", "mama", "yaounde", "Cameroun", "AMBIANT", "SECHE", null, 200, 0, "piece", "Sachet 200 g", 6.5, null, "#D65A32", "🌰", false, false, false,
      "Akpi", "Graines d'akpi séchées, épaississant naturel des sauces camerounaises.", "Akpi", "Dried akpi seeds, natural thickener of Cameroonian sauces.", "Moudre au mortier, incorporer en fin de cuisson.", "Grind in a mortar, add at end of cooking.", "Au sec.", "Dry.", "Akpi.", "Akpi.", "Aucun.", "None.",
      '{"energy":"300 kcal","fat":"20 g","saturated":"5 g","carbs":"30 g","sugars":"2 g","protein":"8 g","salt":"0.05 g"}',
      ["akpi", "njangsa", "njansang", "njansan"], ["200 g|200|0|6.5|true"]],
    ["soumbala", "JMA-SOU-054", "Soumbala", "sauces", "terroir", "dakar", "Sénégal", "AMBIANT", "SECHE", null, 200, 0, "piece", "Sachet 200 g", 5.9, null, "#8A3042", "🫘", false, false, false,
      "Soumbala", "Soumbala (netétou) fermenté, condiment umami intense des sauces africaines.", "Soumbala", "Fermented soumbala (netétou), intense umami condiment of African sauces.", "Émietter dans la sauce en début de cuisson.", "Crumble into sauce at start of cooking.", "Au sec.", "Dry.", "Graines de néré fermentées.", "Fermented African locust beans.", "Aucun.", "None.",
      '{"energy":"200 kcal","fat":"5 g","saturated":"1 g","carbs":"30 g","sugars":"2 g","protein":"12 g","salt":"2 g"}',
      ["soumbala", "netétou", "netetou", "african locust bean", "iru"], ["200 g|200|0|5.9|true"]],
    ["huile-palme", "JMA-HPA-055", "Huile de palme", "sauces", "maison", "abidjan", "Côte d'Ivoire", "AMBIANT", "SEC", null, 1, 0, "L", "Bouteille 1 L", 8.9, null, "#D65A32", "🫗", true, false, false,
      "Huile de palme", "Huile de palme rouge non raffinée, couleur et saveur authentiques des sauces graine.", "Red palm oil", "Unrefined red palm oil, authentic color and flavor of palm nut sauces.", "Utiliser pour la sauce graine ou la friture de l'alloco.", "Use for palm nut sauce or frying alloco.", "À l'abri de la lumière.", "Away from light.", "Huile de palme.", "Palm oil.", "Aucun.", "None.",
      '{"energy":"884 kcal","fat":"100 g","saturated":"49 g","carbs":"0 g","sugars":"0 g","protein":"0 g","salt":"0 g"}',
      ["huile de palme", "huile rouge", "red palm oil", "palm oil", "zomi"], ["Bouteille 1 L|0|1000|8.9|true", "Bouteille 500 ml|0|500|4.9|false"]],
    ["piment-poudre", "JMA-PPD-056", "Piment en poudre", "sauces", "boukan", "dakar", "Sénégal", "AMBIANT", "SEC", null, 100, 0, "piece", "Sachet 100 g", 3.5, null, "#C0392B", "🌶️", false, false, false,
      "Piment en poudre", "Piment en poudre fort, pour doser la chaleur de vos plats.", "Chili powder", "Hot chili powder, to control the heat of your dishes.", "Saupoudrer selon tolérance.", "Sprinkle to taste.", "Au sec.", "Dry.", "Piment.", "Chili.", "Aucun.", "None.",
      '{"energy":"280 kcal","fat":"15 g","saturated":"3 g","carbs":"50 g","sugars":"8 g","protein":"12 g","salt":"0.1 g"}',
      ["piment en poudre", "chili powder", "pili pili powder", "cayenne"], ["100 g|100|0|3.5|true"]],
    ["concentre-tomate", "JMA-CTM-057", "Concentré de tomate", "sauces", "terroir", "abidjan", "Côte d'Ivoire", "AMBIANT", "CONSERVE", null, 400, 0, "piece", "Boîte 400 g", 2.2, null, "#C0392B", "🥫", false, false, false,
      "Concentré de tomate", "Concentré de tomate double, base rouge des sauces claires et ragoûts.", "Tomato paste", "Double tomato paste, red base of clear sauces and stews.", "Diluer dans un peu d'eau avant cuisson.", "Dilute in water before cooking.", "Au frais après ouverture.", "Refrigerate after opening.", "Tomate.", "Tomato.", "Aucun.", "None.",
      '{"energy":"80 kcal","fat":"0.4 g","saturated":"0.05 g","carbs":"18 g","sugars":"10 g","protein":"3.5 g","salt":"1.5 g"}',
      ["concentré de tomate", "tomato paste", "concentre tomate"], ["400 g|400|0|2.2|true", "800 g|800|0|3.9|false"]],
    ["egousi", "JMA-EGO-058", "Égousi", "sauces", "mama", "yaounde", "Cameroun", "AMBIANT", "SECHE", null, 400, 0, "piece", "Sachet 400 g", 6.2, null, "#8A3042", "🎃", false, false, false,
      "Égousi", "Graines de courge épluchées, base de la sauce égousi camerounaise.", "Egusi", "Pumpkin seeds, base of Cameroonian egusi sauce.", "Moudre, faire revenir dans l'huile puis mijoter.", "Grind, fry in oil then simmer.", "Au sec.", "Dry.", "Graines de courge.", "Pumpkin seeds.", "Aucun.", "None.",
      '{"energy":"570 kcal","fat":"49 g","saturated":"12 g","carbs":"11 g","sugars":"1 g","protein":"25 g","salt":"0.05 g"}',
      ["égousi", "egousi", "egusi", "melon seeds", "graines de courge"], ["400 g|400|0|6.2|true"]],

    // Légumineuses & graines
    ["niebe", "JMA-NIE-060", "Niébé", "legumineuses", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 1, 0, "kg", "Sac 1 kg", 4.9, null, "#8A3042", "🫘", false, false, false,
      "Niébé", "Niébé (haricot cornille) sec, riche en protéines, base des kosse et ragoûts.", "Black-eyed peas", "Dried black-eyed peas, high in protein, base of kosse and stews.", "Tremper 4 h, cuire 45 min.", "Soak 4 h, cook 45 min.", "Au sec.", "Dry.", "Niébé.", "Black-eyed peas.", "Aucun.", "None.",
      '{"energy":"340 kcal","fat":"1.3 g","saturated":"0.2 g","carbs":"60 g","sugars":"3 g","protein":"24 g","salt":"0.02 g"}',
      ["niébé", "niebe", "black-eyed peas", "cornille", "cowpea"], ["1 kg|1000|0|4.9|true", "2 kg|2000|0|9.2|false"]],
    ["arachides", "JMA-ARA-061", "Arachides", "legumineuses", "boukan", "dakar", "Sénégal", "AMBIANT", "SEC", null, 1, 0, "kg", "Sac 1 kg", 5.2, null, "#F2A900", "🥜", false, false, false,
      "Arachides crues", "Arachides crues décortiquées, pour griller ou piler en pâte.", "Raw peanuts", "Raw shelled peanuts, to roast or pound into paste.", "Griller 15 min à 180°C.", "Roast 15 min at 180°C.", "Au sec.", "Dry.", "Arachide.", "Peanut.", "Arachide.", "Peanut.",
      '{"energy":"567 kcal","fat":"49 g","saturated":"7 g","carbs":"16 g","sugars":"4 g","protein":"26 g","salt":"0.02 g"}',
      ["arachides", "arachide", "peanuts", "groundnuts", "cacahuètes"], ["1 kg|1000|0|5.2|true"]],

    // Boissons & desserts
    ["poudre-baobab", "JMA-BAO-070", "Poudre de baobab", "boissons", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 250, 0, "piece", "Sachet 250 g", 7.9, null, "#F2A900", "🌴", true, true, false,
      "Poudre de baobab", "Pulpe de baobab riche en vitamine C, pour le bouye et les smoothies.", "Baobab powder", "Baobab pulp rich in vitamin C, for bouye and smoothies.", "Mélanger 2 c. à soupe dans de l'eau ou du lait.", "Mix 2 tbsp in water or milk.", "Au sec.", "Dry.", "Pulpe de baobab.", "Baobab pulp.", "Aucun.", "None.",
      '{"energy":"230 kcal","fat":"2 g","saturated":"0.5 g","carbs":"52 g","sugars":"25 g","protein":"4 g","salt":"0.02 g"}',
      ["poudre de baobab", "baobab", "bouye", "bouye powder", "baobab powder"], ["250 g|250|0|7.9|true", "500 g|500|0|14.5|false"]],
    ["bissap", "JMA-BIS-071", "Bissap", "boissons", "boukan", "dakar", "Sénégal", "AMBIANT", "SEC", null, 200, 0, "piece", "Sachet 200 g", 4.2, null, "#C0392B", "🌺", true, false, false,
      "Bissap", "Fleurs d'hibiscus séchées, infusion rouge fraîche et acidulée.", "Bissap", "Dried hibiscus flowers, refreshing tart red infusion.", "Infuser 10 min, sucrer, servir frais.", "Steep 10 min, sweeten, serve chilled.", "Au sec.", "Dry.", "Hibiscus.", "Hibiscus.", "Aucun.", "None.",
      '{"energy":"40 kcal","fat":"0 g","saturated":"0 g","carbs":"10 g","sugars":"3 g","protein":"0.5 g","salt":"0.01 g"}',
      ["bissap", "hibiscus", "karkade", "roselle"], ["200 g|200|0|4.2|true", "400 g|400|0|7.5|false"]],
    ["gingembre", "JMA-GIN-072", "Gingembre en poudre", "boissons", "boukan", "dakar", "Sénégal", "AMBIANT", "SEC", null, 200, 0, "piece", "Sachet 200 g", 3.9, null, "#F2A900", "🫚", false, false, false,
      "Gingembre en poudre", "Gingembre moulu, pour la boisson gingembre et les épices.", "Ginger powder", "Ground ginger, for ginger drink and spices.", "Délayer dans l'eau chaude, sucrer.", "Mix in hot water, sweeten.", "Au sec.", "Dry.", "Gingembre.", "Ginger.", "Aucun.", "None.",
      '{"energy":"350 kcal","fat":"4 g","saturated":"2 g","carbs":"72 g","sugars":"3 g","protein":"8 g","salt":"0.05 g"}',
      ["gingembre", "ginger", "gingembre en poudre", "ginger powder"], ["200 g|200|0|3.9|true"]],
    ["thiakry", "JMA-THI-073", "Thiakry", "boissons", "terroir", "dakar", "Sénégal", "AMBIANT", "SEC", null, 500, 0, "piece", "Sachet 500 g", 4.9, null, "#F2A900", "🍮", false, false, false,
      "Thiakry", "Semoule de mil pour le dessert thiakry au lait et à la vanille.", "Thiakry", "Millet semolina for thiakry dessert with milk and vanilla.", "Cuire 15 min, mélanger au lait sucré.", "Cook 15 min, mix with sweetened milk.", "Au sec.", "Dry.", "Mil.", "Millet.", "Aucun.", "None.",
      '{"energy":"160 kcal","fat":"1 g","saturated":"0.2 g","carbs":"35 g","sugars":"1 g","protein":"5 g","salt":"0.02 g"}',
      ["thiakry", "thiacry", "degue", "dégué"], ["500 g|500|0|4.9|true"]],
  ];

  const productIds: Record<string, string> = {};
  for (const p of products) {
    const [slug, sku, traditional, catSlug, brandKey, supplierKey, country, thermal, storageType, storageTemp, weightG, volumeMl, unit, packaging, price, promoPrice, imageColor, imageEmoji, bestseller, isNew, isOnSale,
      frName, frDesc, enName, enDesc, frPrep, enPrep, frStorage, enStorage, frIng, enIng, frAllerg, enAllerg, nutrition, aliases, variantSeeds] = p;

    const prod = await db.product.create({
      data: {
        sku, barcode: "37" + Math.floor(100000000000 + Math.random() * 899999999999),
        traditionalName: traditional,
        categoryId: cats[catSlug],
        brandId: (brands as any)[brandKey].id,
        supplierId: (suppliers as any)[supplierKey].id,
        country, thermalClass: thermal, storageType, storageTempC: storageTemp,
        netWeightGrams: weightG, volumeMl, unit, packaging,
        costPrice: Math.round(Number(price) * 0.55 * 100) / 100,
        profitMargin: Math.round(Number(price) * 0.45 * 100) / 100,
        price, promoPrice,
        pricePerKg: weightG > 0 ? (Number(price) / weightG * 1000) : (volumeMl > 0 ? Number(price) / volumeMl * 1000 : Number(price)),
        stockQty: Math.floor(20 + Math.random() * 80),
        alertThreshold: 8,
        imageColor, imageEmoji, imageUrl: `/products/${slug}.webp`, isBestseller: bestseller, isNew, isOnSale,
        status: "published",
        nutrition,
        translations: {
          create: [
            { locale: "fr", name: frName, description: frDesc, preparation: frPrep, storage: frStorage, ingredients: frIng, allergens: frAllerg, validated: true },
            { locale: "en", name: enName, description: enDesc, preparation: enPrep, storage: enStorage, ingredients: enIng, allergens: enAllerg, validated: true },
          ],
        },
        aliases: { create: [...new Set(aliases.map((a) => a.toLowerCase()))].map((a) => ({ alias: a, locale: null })) },
      },
    });

    // Variants
    const variantDefs = variantSeeds.map((v) => v.split("|"));
    for (let i = 0; i < variantDefs.length; i++) {
      const [label, w, vol, pr, isDef] = variantDefs[i];
      await db.productVariant.create({
        data: {
          productId: prod.id, label, weightGrams: Number(w), volumeMl: Number(vol),
          price: Number(pr),
          pricePerKg: Number(w) > 0 ? Number(pr) / Number(w) * 1000 : (Number(vol) > 0 ? Number(pr) / Number(vol) * 1000 : Number(pr)),
          isDefault: isDef === "true",
        },
      });
    }

    productIds[slug] = prod.id;
  }
  console.log(`  ✓ ${products.length} products seeded`);

  /* ---------------- Warehouses & batches ---------------- */
  const whParis = await db.warehouse.create({ data: { name: "Entrepôt Île-de-France Est", city: "Paris", address: "ZAC des Piliers, 94000", ambientZones: 4, refrigeratedZones: 2, frozenZones: 3 } });
  const whLyon = await db.warehouse.create({ data: { name: "Entrepôt Lyon Sud", city: "Lyon", address: "Zone Sud, 69007", ambientZones: 3, refrigeratedZones: 1, frozenZones: 2 } });

  // Locations
  const zoneTypes = ["AMBIANT", "REFRIGERATED", "FROZEN"];
  for (const wh of [whParis, whLyon]) {
    let i = 0;
    for (const z of zoneTypes) {
      const count = z === "AMBIANT" ? wh.ambientZones : z === "REFRIGERATED" ? wh.refrigeratedZones : wh.frozenZones;
      for (let n = 0; n < Math.min(count, 3); n++) {
        await db.warehouseLocation.create({ data: { warehouseId: wh.id, code: `${z.slice(0,1)}-${i + 1}-${n + 1}`, zone: z, aisle: `${i + 1}`, shelf: `${n + 1}` } });
        i++;
      }
    }
  }

  // Inventory batches (FEFO: at least 2 batches per product with different expiry)
  const parisLocs = await db.warehouseLocation.findMany({ where: { warehouseId: whParis.id } });
  for (const p of products) {
    const slug = p[0];
    const thermal = p[7];
    const zone = thermal === "FROZEN" ? "FROZEN" : thermal === "REFRIGERATED" ? "REFRIGERATED" : "AMBIANT";
    const loc = parisLocs.find((l) => l.zone === zone) || parisLocs[0];
    const pid = productIds[slug];
    // Batch 1: earlier expiry (FEFO first)
    const exp1 = daysFromNow(thermal === "FROZEN" ? 120 : thermal === "REFRIGERATED" ? 14 : 90);
    const exp2 = daysFromNow(thermal === "FROZEN" ? 200 : thermal === "REFRIGERATED" ? 30 : 180);
    await db.inventoryBatch.create({
      data: { productId: pid, warehouseId: whParis.id, locationId: loc?.id, lotNumber: `LOT-${slug.toUpperCase()}-${1}`, quantity: Math.floor(15 + Math.random() * 20), reserved: 0, expiryDate: exp1, costPrice: Number(p[14]) * 0.55, status: "active" },
    });
    await db.inventoryBatch.create({
      data: { productId: pid, warehouseId: whParis.id, locationId: loc?.id, lotNumber: `LOT-${slug.toUpperCase()}-${2}`, quantity: Math.floor(10 + Math.random() * 15), reserved: 0, expiryDate: exp2, costPrice: Number(p[14]) * 0.55, status: "active" },
    });
    // a near-expiry batch for some products (admin alerts)
    if (Math.random() > 0.6) {
      await db.inventoryBatch.create({
        data: { productId: pid, warehouseId: whParis.id, locationId: loc?.id, lotNumber: `LOT-${slug.toUpperCase()}-EXP`, quantity: Math.floor(3 + Math.random() * 6), reserved: 0, expiryDate: daysFromNow(5 + Math.floor(Math.random() * 8)), costPrice: Number(p[14]) * 0.5, status: "active" },
      });
    }
  }
  // Sync product.stockQty with batches
  const allProducts = await db.product.findMany();
  for (const p of allProducts) {
    const sum = await db.inventoryBatch.aggregate({ where: { productId: p.id, status: "active" }, _sum: { quantity: true } });
    await db.product.update({ where: { id: p.id }, data: { stockQty: (sum._sum.quantity ?? 0) } });
  }
  console.log(`  ✓ warehouses + batches seeded`);

  /* ---------------- Carriers & delivery zones ---------------- */
  const carrierChrono = await db.carrier.create({ data: { name: "Chrono Frais", rating: 5, trackingUrl: "https://track.example.com/{ref}" } });
  const carrierDPD = await db.carrier.create({ data: { name: "DPD Express", rating: 4 } });
  const carrierInternal = await db.carrier.create({ data: { name: "Flotte interne JMA", rating: 5 } });
  await db.deliveryZone.createMany({
    data: [
      { carrierId: carrierChrono.id, country: "France", baseFee: 4.9, perKgFee: 0.6, frozenSurcharge: 2.5, minDelayHours: 48 },
      { carrierId: carrierDPD.id, country: "France", baseFee: 3.9, perKgFee: 0.5, frozenSurcharge: 2, minDelayHours: 72 },
      { carrierId: carrierInternal.id, country: "France", postalPattern: "75*", baseFee: 0, perKgFee: 0.4, frozenSurcharge: 1.5, minDelayHours: 24 },
    ],
  });

  /* ---------------- Recipes ---------------- */
  type RecipeIngredientDef = [productSlug: string, qtyPerBase: number, unit: string, role: string, optional?: boolean, alternatives?: string[]];
  type RecipeDef = [slug: string, country: string, category: string, difficulty: string, timeMin: number, baseServings: number, color: string, emoji: string, popular: boolean, frTitle: string, frDesc: string, frSteps: string[], enTitle: string, enDesc: string, enSteps: string[], ingredients: RecipeIngredientDef[]];

  const recipes: RecipeDef[] = [
    ["sauce-graine", "Côte d'Ivoire", "sauces", "medium", 75, 4, "#D65A32", "🌰", true,
      "Sauce graine", "La sauce emblématique de l'Afrique de l'Ouest, à base de graines de palme mijotées avec viande et poisson fumé.", [
        "Rincer les graines de palme, les couvrir d'eau et les bouillir 30 minutes à feu moyen, jusqu'à ce que leur peau soit tendre et se détache facilement.",
        "Égoutter en réservant l'eau chaude, puis piler les graines encore tièdes. Ajouter l'eau réservée progressivement et malaxer pour libérer toute la pulpe.",
        "Tamiser deux fois la pulpe en la pressant soigneusement. Le jus obtenu doit être épais, homogène et sans débris de coque.",
        "Dans une cocotte, faire revenir la viande assaisonnée 8 à 10 minutes à feu moyen-vif, jusqu'à légère coloration, puis ajouter oignons et concentré de tomate.",
        "Verser le jus de palme, mélanger et porter à frémissement. Couvrir partiellement et mijoter 30 minutes à feu doux en remuant le fond toutes les 8 à 10 minutes.",
        "Ajouter le poisson fumé et le kplo pour les 10 dernières minutes sans trop remuer. La sauce est prête lorsqu'elle est nappante et qu'un léger film d'huile apparaît en surface.",
        "Goûter, rectifier le sel et ajouter le piment progressivement. Laisser reposer 5 minutes hors du feu avant de servir très chaud.",
      ],
      "Palm nut sauce", "The iconic West African sauce, made of simmered palm nuts with meat and smoked fish.", [
        "Rinse the palm nuts, cover with water and boil over medium heat for 30 minutes, until the skins are tender and peel away easily.",
        "Drain, reserving the hot water, then pound the nuts while still warm. Gradually add the reserved water and knead to release all the pulp.",
        "Strain the pulp twice, pressing thoroughly. The resulting liquid should be thick, even and free from shell fragments.",
        "In a heavy pot, brown the seasoned meat over medium-high heat for 8 to 10 minutes, then add the onions and tomato paste.",
        "Pour in the palm liquid, stir and bring to a gentle simmer. Partially cover and cook over low heat for 30 minutes, scraping the base every 8 to 10 minutes.",
        "Add the smoked fish and kplo for the final 10 minutes, stirring very little. The sauce is ready when it lightly coats a spoon and a thin layer of oil appears on top.",
        "Taste, adjust the salt and add chili gradually. Rest off the heat for 5 minutes before serving very hot.",
      ],
      [["graine-palme", 400, "g", "base"], ["huile-palme", 3, "tbsp", "fat"], ["maquereau-fume", 300, "g", "protein"], ["kplo-fume", 150, "g", "protein"], ["concentre-tomate", 100, "g", "base"], ["piment-poudre", 1, "tsp", "spice"], ["soumbala", 5, "g", "aromatic"], ["piment-frais", 10, "g", "spice", true]]],
    ["sauce-gombo", "Côte d'Ivoire", "sauces", "easy", 40, 4, "#8A3042", "🥬", true,
      "Sauce gombo", "Sauce onctueuse au gombo frais et djoumblé, accompagnement star du placali et du riz.", [
        "Rincer et sécher le gombo, retirer les extrémités puis le couper en rondelles très fines et régulières. Réserver sans ajouter d'eau pour préserver sa texture.",
        "Faire revenir les oignons 3 minutes à feu moyen, ajouter la tomate et cuire encore 5 minutes, jusqu'à obtenir une base brillante sans odeur de tomate crue.",
        "Ajouter la viande et le poisson fumé, mouiller juste à hauteur et laisser frémir 18 à 20 minutes à feu doux, sans casser les morceaux de poisson.",
        "Incorporer le gombo, puis cuire 8 à 10 minutes à feu moyen en remuant doucement. La sauce doit devenir homogène et filante sans bouillir violemment.",
        "Saupoudrer le djoumblé en pluie si utilisé et mélanger 2 minutes pour éviter les amas. Ajuster la consistance avec un peu d'eau chaude, cuillerée par cuillerée.",
        "Goûter, rectifier le sel et ajouter le piment progressivement. Servir dès que la sauce est brillante et nappe légèrement la cuillère.",
      ],
      "Okra sauce", "Smooth sauce with fresh okra and djoumblé, star side for placali and rice.", [
        "Rinse and dry the okra, trim the ends and cut into very thin, even slices. Set aside without adding water to preserve its texture.",
        "Cook the onions over medium heat for 3 minutes, add the tomato and cook for another 5 minutes, until the base is glossy with no raw tomato smell.",
        "Add the meat and smoked fish, barely cover with liquid and gently simmer over low heat for 18 to 20 minutes without breaking the fish pieces.",
        "Fold in the okra and cook over medium heat for 8 to 10 minutes, stirring gently. The sauce should become even and silky without boiling hard.",
        "Sprinkle in the dried okra powder if using and stir for 2 minutes to prevent clumps. Adjust the consistency with hot water, one spoonful at a time.",
        "Taste, adjust the salt and add chili gradually. Serve as soon as the sauce is glossy and lightly coats a spoon.",
      ],
      [["gombo-frais", 400, "g", "base"], ["djoumble", 30, "g", "base"], ["maquereau-fume", 250, "g", "protein"], ["concentre-tomate", 80, "g", "base"], ["huile-palme", 2, "tbsp", "fat"], ["piment-poudre", 1, "tsp", "spice"], ["kplo-fume", 100, "g", "protein", true]]],
    ["attieke-poisson", "Côte d'Ivoire", "mains", "easy", 35, 4, "#F2A900", "🐟", true,
      "Attiéké-poisson", "Le plat de rue ivoirien par excellence : attiéké tiède, poisson frit, oignons et tomates.", [
        "Éponger le poisson nettoyé, pratiquer quelques incisions peu profondes puis le masser avec citron, ail, gingembre et sel. Couvrir et laisser mariner 15 minutes au frais.",
        "Chauffer l'huile à feu vif dans une casserole profonde. Égoutter le poisson et le frire 8 minutes par face, sans le déplacer au début, jusqu'à obtenir une peau dorée et une chair opaque.",
        "Retirer le poisson avec une écumoire et le laisser égoutter 2 minutes sur une grille ou du papier absorbant. Le retourner délicatement avec une spatule large pour ne pas casser la chair.",
        "Émincer finement les oignons et couper les tomates en petits dés. Ajouter le citron et une pincée de sel juste avant le service pour garder la garniture fraîche et croquante.",
        "Humidifier légèrement l'attiéké, puis le réchauffer à la vapeur 5 à 7 minutes à feu moyen. L'égrener à la fourchette jusqu'à ce que les grains soient souples et séparés.",
        "Dresser l'attiéké chaud, ajouter le poisson et placer les crudités à côté. Servir immédiatement avec le piment séparé afin que chacun règle l'intensité.",
      ],
      "Attiéké & fish", "The iconic Ivorian street dish: warm attiéké, fried fish, onions and tomatoes.", [
        "Pat the cleaned fish dry, make a few shallow cuts, then rub with lemon, garlic, ginger and salt. Cover and refrigerate for 15 minutes.",
        "Heat the oil over high heat in a deep pan. Drain the fish and fry for 8 minutes per side, leaving it still at first, until the skin is golden and the flesh opaque.",
        "Lift out the fish with a slotted spoon and drain for 2 minutes on a rack or absorbent paper. Turn it gently with a wide spatula to avoid breaking the flesh.",
        "Thinly slice the onions and dice the tomatoes. Add lemon and a pinch of salt just before serving to keep the garnish fresh and crisp.",
        "Lightly moisten the attieke, then steam over medium heat for 5 to 7 minutes. Fluff with a fork until the grains are supple and separated.",
        "Plate the hot attieke, add the fish and place the raw garnish beside it. Serve immediately with chili separately so everyone can adjust the heat.",
      ],
      [["attieke", 600, "g", "base"], ["tilapia", 1, "piece", "protein"], ["piment-frais", 15, "g", "spice", true], ["concentre-tomate", 60, "g", "aromatic"], ["huile-palme", 2, "tbsp", "fat"]]],
    ["placali-sauce-graine", "Côte d'Ivoire", "mains", "medium", 90, 8, "#D65A32", "🍲", true,
      "Placali sauce graine", "Le grand classique familial : pâte de manioc fermentée et sauce graine généreuse pour 8 personnes.", [
        "Délayer la pâte de placali avec de l'eau froide en fouettant progressivement, jusqu'à obtenir un liquide parfaitement lisse et sans grumeaux.",
        "Cuire à feu moyen 12 à 15 minutes en remuant sans interruption avec une spatule solide. Racler le fond et les parois jusqu'à ce que la pâte épaississe et devienne translucide.",
        "Baisser le feu et travailler encore 3 à 5 minutes. Le placali doit être brillant, souple et se détacher légèrement de la casserole ; couvrir et maintenir au chaud.",
        "Diluer le concentré de palme, porter à frémissement, puis ajouter viande, oignons et tomate. Mijoter 40 minutes à feu doux en remuant le fond toutes les 10 minutes.",
        "Ajouter le poisson fumé et le kplo pour les 10 dernières minutes. La sauce est prête lorsqu'elle est homogène, nappante et qu'un léger film d'huile apparaît en surface.",
        "Goûter, rectifier le sel et ajouter le piment progressivement. Laisser reposer la sauce 5 minutes hors du feu pendant le façonnage du placali.",
        "Humidifier légèrement les mains, façonner le placali en portions lisses et servir la sauce très chaude dans un plat séparé avec la viande et le poisson.",
      ],
      "Placali & palm nut sauce", "The great family classic: fermented cassava dough and generous palm nut sauce for 8 people.", [
        "Gradually whisk cold water into the placali dough until the mixture is completely smooth and free from lumps.",
        "Cook over medium heat for 12 to 15 minutes, stirring constantly with a sturdy spatula. Scrape the base and sides until the dough thickens and turns translucent.",
        "Lower the heat and work the dough for another 3 to 5 minutes. It should be glossy, supple and pull slightly from the pan; cover and keep warm.",
        "Loosen the palm concentrate, bring to a simmer, then add the meat, onions and tomato. Simmer over low heat for 40 minutes, scraping the base every 10 minutes.",
        "Add the smoked fish and kplo for the final 10 minutes. The sauce is ready when even, lightly coating a spoon, with a thin layer of oil on top.",
        "Taste, adjust the salt and add chili gradually. Rest the sauce off the heat for 5 minutes while shaping the placali.",
        "Lightly moisten your hands, shape the placali into smooth portions and serve the very hot sauce separately with the meat and fish.",
      ],
      [["placali-frais", 1200, "g", "base"], ["graine-palme", 800, "g", "base"], ["huile-palme", 4, "tbsp", "fat"], ["maquereau-fume", 400, "g", "protein"], ["kplo-fume", 250, "g", "protein", true], ["concentre-tomate", 150, "g", "base"], ["piment-poudre", 2, "tsp", "spice"], ["soumbala", 8, "g", "aromatic"]]],
    ["alloco-poulet", "Côte d'Ivoire", "mains", "easy", 30, 4, "#F2A900", "🍌", false,
      "Alloco-poulet", "Banane plantain frite et poulet épicé, le duo gourmand de restauration rapide africaine.", [
        "Éponger le poulet, le masser avec le sel, le piment et un filet d'huile, puis couvrir et laisser mariner 20 minutes au frais.",
        "Griller le poulet à feu moyen-vif 25 à 35 minutes en le retournant toutes les 6 à 8 minutes, jusqu'à obtenir une peau dorée et une cuisson homogène près de l'os.",
        "Laisser reposer le poulet 5 minutes sous une feuille posée sans serrer afin que la chair conserve ses jus.",
        "Éplucher les plantains très mûrs et les couper en biais en tranches régulières de 1,5 cm. Saler légèrement juste avant la friture.",
        "Chauffer l'huile à feu vif et frire les plantains en petites quantités 3 à 4 minutes par face, jusqu'à ce que les bords soient dorés et le centre fondant.",
        "Égoutter immédiatement sur une grille ou du papier absorbant. Servir sans attendre avec le poulet reposé et la sauce tomate pimentée à côté.",
      ],
      "Alloco & chicken", "Fried plantain and spicy chicken, the tasty African fast-food duo.", [
        "Pat the chicken dry, rub with salt, chili and a little oil, then cover and refrigerate for 20 minutes.",
        "Grill the chicken over medium-high heat for 25 to 35 minutes, turning every 6 to 8 minutes, until the skin is golden and it is evenly cooked near the bone.",
        "Rest the chicken for 5 minutes under a loosely placed sheet so the meat retains its juices.",
        "Peel the very ripe plantains and cut diagonally into even 1.5 cm slices. Season lightly with salt just before frying.",
        "Heat the oil over high heat and fry the plantains in small batches for 3 to 4 minutes per side, until the edges are golden and the centres soft.",
        "Drain immediately on a rack or absorbent paper. Serve at once with the rested chicken and spicy tomato sauce on the side.",
      ],
      [["banane-plantain", 1, "kg", "base"], ["poulet-fermier", 1, "piece", "protein"], ["huile-palme", 5, "tbsp", "fat"], ["piment-poudre", 1, "tsp", "spice"], ["concentre-tomate", 80, "g", "base"]]],
    ["mafe", "Sénégal", "mains", "easy", 60, 4, "#D65A32", "🥜", true,
      "Mafé", "Ragoût sénégalais crémeux à la pâte d'arachide, viande tendre et riz blanc.",
      ["Dorer la viande assaisonnée 8 à 10 minutes à feu moyen-vif en la retournant pour colorer toutes les faces, puis ajouter les oignons et cuire jusqu'à ce qu'ils soient translucides.", "Ajouter le concentré de tomate et les épices, puis cuire 3 à 4 minutes en raclant le fond, jusqu'à ce que le concentré fonce légèrement et perde son odeur crue.", "Dans un bol séparé, délayer la pâte d'arachide avec de l'eau chaude jusqu'à obtenir un mélange parfaitement lisse, puis le verser progressivement dans la cocotte en remuant.", "Porter à frémissement, couvrir partiellement et mijoter 35 à 40 minutes à feu doux, en remuant le fond toutes les 8 minutes pour éviter que l'arachide n'attache.", "Le mafé est prêt lorsque la viande est tendre et la sauce brillante et nappante. Ajuster le sel et la consistance, laisser reposer 5 minutes, puis servir avec le riz blanc."],
      "Mafé", "Creamy Senegalese peanut stew with tender meat and white rice.",
      ["Brown the seasoned meat over medium-high heat for 8 to 10 minutes, turning until evenly coloured, then add the onions and cook until translucent.", "Add the tomato paste and spices, then cook for 3 to 4 minutes while scraping the base, until the paste darkens slightly and loses its raw smell.", "Whisk the peanut paste with hot water in a separate bowl until completely smooth, then gradually pour it into the pot while stirring.", "Bring to a gentle simmer, partially cover and cook over low heat for 35 to 40 minutes, stirring the base every 8 minutes so the peanut sauce does not catch.", "The mafé is ready when the meat is tender and the sauce is glossy and lightly coats a spoon. Adjust salt and consistency, rest for 5 minutes, then serve with white rice."],
      [["pate-arachide", 300, "g", "base"], ["poulet-fermier", 1, "piece", "protein"], ["concentre-tomate", 100, "g", "base"], ["huile-palme", 2, "tbsp", "fat"], ["piment-poudre", 1, "tsp", "spice"]]],
  ];

  // fix mafe translation (we passed wrong types, redo properly below)
  const recipeIds: Record<string, string> = {};
  for (const r of recipes) {
    const [slug, country, category, difficulty, timeMin, baseServings, color, emoji, popular, frTitle, frDesc, frSteps, enTitle, enDesc, enSteps, ingredients] = r;
    const recipe = await db.recipe.create({
      data: { slug, country, category, difficulty, timeMinutes: timeMin, baseServings, imageColor: color, imageEmoji: emoji, imageUrl: `/recipes/${slug}.webp`, isPopular: popular, status: "published",
        translations: {
          create: [
            { locale: "fr", title: frTitle, description: frDesc, steps: JSON.stringify(frSteps) },
            { locale: "en", title: enTitle, description: enDesc, steps: JSON.stringify(enSteps) },
          ],
        },
      },
    });
    recipeIds[slug] = recipe.id;
    for (const [pSlug, qty, unit, role, optional, alts] of ingredients) {
      const pid = productIds[pSlug];
      if (!pid) { console.warn("missing product for recipe", slug, pSlug); continue; }
      await db.recipeIngredient.create({
        data: { recipeId: recipe.id, productId: pid, quantityPerBase: qty, unit, role, optional: !!optional,
          alternatives: alts ? JSON.stringify(alts.map((s) => productIds[s]).filter(Boolean)) : null },
      });
    }
  }
  console.log(`  ✓ ${recipes.length} recipes seeded`);

  /* ---------------- Marketing ---------------- */
  await db.promotion.create({ data: { code: "BIENVENUE10", type: "percent", value: 10, minOrder: 30, appliesTo: "all", active: true } });
  await db.promotion.create({ data: { code: "FRAIS5", type: "fixed", value: 5, minOrder: 40, appliesTo: "all", active: true } });
  await db.promotion.create({ data: { code: "LIVRAISONOFFERTE", type: "free_shipping", value: 0, minOrder: 50, appliesTo: "all", active: true } });
  await db.giftCard.create({ data: { code: "CADEAU-JMA-25", amount: 25, balance: 25, active: true, expiresAt: daysFromNow(365) } });

  /* ---------------- Demo order + timeline + payments + shipments ---------------- */
  const orderItemsSeed = [
    { pSlug: "placali-frais", qty: 2, recipe: "placali-sauce-graine" },
    { pSlug: "graine-palme", qty: 2, recipe: "placali-sauce-graine" },
    { pSlug: "maquereau-fume", qty: 1, recipe: "placali-sauce-graine" },
    { pSlug: "attieke", qty: 2, recipe: null },
  ];
  let subtotal = 0;
  const lines: Array<{
    productId: string;
    nameFr: string;
    nameEn: string;
    sku: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    thermalClass: string;
    recipeId: string | null;
    recipeNameFr: string | null;
    recipeNameEn: string | null;
    packWeightGrams: number;
    imageUrl: string | null;
  }> = [];
  for (const li of orderItemsSeed) {
    const pid = productIds[li.pSlug];
    const prod = await db.product.findUnique({ where: { id: pid }, include: { translations: true } });
    if (!prod) continue;
    const variant = await db.productVariant.findFirst({ where: { productId: pid, isDefault: true } });
    const price = Number(prod.promoPrice ?? prod.price);
    subtotal += price * li.qty;
    lines.push({ productId: pid, nameFr: prod.traditionalName, nameEn: prod.traditionalName, sku: prod.sku, unitPrice: price, qty: li.qty, lineTotal: price * li.qty, thermalClass: prod.thermalClass, recipeId: li.recipe ? recipeIds[li.recipe] : null, recipeNameFr: li.recipe, recipeNameEn: li.recipe, packWeightGrams: variant?.weightGrams ?? prod.netWeightGrams, imageUrl: prod.imageUrl });
  }
  const vat = subtotal * 0.2 / 1.2;
  const shipping = 6.9;
  const total = subtotal + shipping;
  const order = await db.order.create({
    data: {
      number: "JMA-2024-0001", customerId: customer.id, status: "delivered",
      subtotal, promoDiscount: 0, vatAmount: vat, shippingCost: shipping, total, currency: "EUR",
      weightGrams: lines.reduce((s, l) => s + (l.packWeightGrams * l.qty), 0), packageCount: 2,
      deliveryName: "Awa Traoré", deliveryAddress: "12 rue de la Gare", deliveryCity: "Paris", deliveryPostalCode: "75011", deliveryCountry: "France",
      deliverySlot: "standard", carrierId: carrierChrono.id, paymentMethod: "card",
      items: { create: lines },
      timeline: { create: [
        { status: "paymentConfirmed", label: "Paiement confirmé", at: daysFromNow(-6) },
        { status: "stockReserved", label: "Stock réservé", at: daysFromNow(-6) },
        { status: "preparing", label: "Préparation en cours", at: daysFromNow(-5) },
        { status: "packed", label: "Emballée", at: daysFromNow(-5) },
        { status: "shipped", label: "Expédiée", at: daysFromNow(-4) },
        { status: "delivered", label: "Livrée", at: daysFromNow(-2), actor: "Chrono Frais" },
      ] },
    },
  });
  await db.payment.create({ data: { orderId: order.id, amount: total, method: "card", status: "captured", reference: "pi_demo_001", idempotencyKey: "idem_demo_001" } });
  await db.shipment.createMany({ data: [
    { orderId: order.id, carrierId: carrierChrono.id, trackingNumber: "CHR-2024-0001-A", thermalClass: "AMBIANT", status: "delivered", estimatedDelivery: daysFromNow(-2), actualDelivery: daysFromNow(-2) },
    { orderId: order.id, carrierId: carrierChrono.id, trackingNumber: "CHR-2024-0001-F", thermalClass: "FROZEN", status: "delivered", estimatedDelivery: daysFromNow(-2), actualDelivery: daysFromNow(-2), confirmCode: "4821" },
  ] });
  console.log(`  ✓ demo order seeded`);

  /* ---------------- Audit log ---------------- */
  await db.auditLog.create({ data: { userId: adminUser.id, action: "price_change", entityType: "product", entityId: productIds["graine-palme"], before: '{"price":6.5}', after: '{"price":5.9,"promoPrice":5.9}', reason: "Promotion saisonnière sauce graine", ip: "10.0.0.1" } });
  await db.auditLog.create({ data: { userId: adminUser.id, action: "stock_change", entityType: "product", entityId: productIds["placali-frais"], before: '{"stockQty":80}', after: '{"stockQty":62}', reason: "Réception lot frais Abidjan", ip: "10.0.0.1" } });
  await db.auditLog.create({ data: { userId: adminUser.id, action: "recipe_change", entityType: "recipe", entityId: recipeIds["sauce-graine"], before: '{}', after: '{"baseServings":4}', reason: "Ajustement portions", ip: "10.0.0.1" } });

  /* ---------------- Support ticket ---------------- */
  await db.supportTicket.create({ data: { number: "TKT-0001", customerId: customer.id, orderId: order.id, subject: "Colis bien reçu, merci !", priority: "low", status: "resolved", assignee: "Service client" } });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
