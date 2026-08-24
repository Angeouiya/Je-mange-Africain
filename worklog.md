# Worklog — « Je mange Africain »

Plateforme e-commerce alimentaire africaine bilingue (FR/EN).
Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Prisma (SQLite) + Zustand.

## Décision de périmètre (architecte)

Le cahier des charges décrit une plateforme enterprise complète (34 sections). Dans cet environnement, **une seule route `/` est visible par l'utilisateur**. Décisions professionnelles cohérentes :

1. **Application monopage riche** : toute la navigation client + l'administration sont rendues sur `/` via un routeur de vues côté client (Zustand `useView`). Cela garantit une expérience fluide et un aperçu complet du produit dans l'environnement de preview.
2. **Cœur stratégique prioritaire** : le **moteur de recettes intelligentes** (configurateur : nombre de personnes → quantités → conditionnements → restes → coût total → coût/personne → panier modifiable) est réellement fonctionnel, calculé côté serveur, bilingue.
3. **Bilingue réel** : FR/EN avec switch qui conserve la vue courante ; recherche reconnaissant les alias (Kplô / Kplo / beef skin → même produit).
4. **Données de démonstration réalistes** : vrais produits africains (placali, attiéké, graine de palme, gombo, kplô, etc.), marques, entrepôts, lots FEFO, recettes liées aux produits.
5. **Commandes** : machine d'états + réservation de stock + traçabilité des lots réellement implémentées en base.
6. **Paiement** : flux vérifié côté serveur (intent → confirmation serveur → webhook simulé vérifié) — pas de paiement réel (pas de clé Stripe), mais le parcours est sécurisé par conception.
7. Pas de portail vendeur externe (conforme au modèle « entreprise unique vendeuse »).

---
Task ID: 0
Agent: architecte (principal)
Task: Initialiser le worklog, le design system (palette marque, logo), le layout, le dictionnaire i18n, le shell de page avec routeur de vues, le store Zustand.

Work Log:
- Lecture complète du cahier des charges (1456 lignes).
- Création du worklog (ce fichier).
- Création du logo SVG « Je mange Africain » (marmite + Afrique + vapeur + feuille + piment), variantes claire/sombre, favicon.
- Définition des tokens de design (palette terre cuite / jaune doré / vert forêt / noir charbon / blanc crème) dans globals.css.
- Mise en place du layout (police Poppins + Caveat pour la marque, Provider langue/thème, Toaster + Sonner).
- Dictionnaire i18n FR/EN centralisé (lib/i18n.ts).
- Store Zustand `useStore` : langue, vue courante, panier, favoris, auth simulée, paramètres.
- Shell de page `page.tsx` avec routeur de vues (home, catalog, product, recipes, recipe-config, cart, checkout, orders, account, admin, info-pages).

Stage Summary:
- Fondations posées. Les agents suivants construisent : (A) storefront + moteur de recettes + panier + checkout + API ; (B) administration + API admin.
- Convention : composants dans `src/components/storefront`, `src/components/admin`, `src/components/shared`. API dans `src/app/api/**`. Store dans `src/lib/store.ts`. Recettes dans `src/lib/recipe-engine.ts`. Types dans `src/lib/types.ts`.

---
Task ID: A+B (executed by architect directly)
Agent: architecte (principal) — build executed in-place
Task: Build the full storefront (Task A) + admin dashboard (Task B) + all API routes + recipe engine, since the delegated subagent tasks timed out.

Work Log:
- Created `src/lib/format.ts` (price/weight/volume/date/unit formatters, normalize for accent-insensitive search, thermal/status color helpers).
- Created `src/lib/recipe-engine.ts` (THE core): computes per-ingredient needed qty (scaled by people/adults/children/portion), converts units (g/kg/ml/L/tbsp/tsp/piece), rounds packs up, computes bought qty/leftover/line total, handles protein choice (fish/meat/none), kplô injection, spice-level scaling + fresh chili injection, have-at-home removal, substitutes for unavailable, totals (cost/cost-per-person/weight/thermal split/packages).
- Created API routes: `/api/catalog`, `/api/products/[id]`, `/api/search` (accent+alias aware: Kplô/Kplo/beef skin → same product), `/api/recipes`, `/api/recipes/[id]`, `/api/recipes/[id]/calculate` (engine endpoint), `/api/checkout` (server-verified: recomputes prices, reserves stock FEFO, creates order+items+timeline+payment+shipments+audit in a transaction), `/api/orders`, `/api/orders/[id]`, `/api/promotions/validate`, `/api/shipping/quote`, `/api/categories`, `/api/brands`, `/api/admin/{dashboard,stock,customers,audit}`.
- Shared components: ProductImage (emoji on branded gradient), ProductCard, RecipeCard, QtyStepper, LanguageSwitch, SearchBar (debounced, suggestions, accent-insensitive, finds recipes too).
- Storefront chrome: Header (logo, country/postal popover, FR/EN switch keeping current view, search, nav, cart badge, mobile sheet), MobileNav (fixed bottom bar), Footer (kente stripe, 4 columns, newsletter, legal links, sticky mt-auto).
- Storefront views: HomeView (hero with /hero.jpg, stats, categories, bestsellers, recipes, promo banner, commitments, delivery info), CatalogView (sidebar filters + sort + search + pagination + mobile filter sheet), ProductDetailView (variants, tabs, nutrition table, aliases, related, recipes), RecipesView (category chips + grid), RecipeConfiguratorView (CORE — left config form: people/adults/children/portion/protein/kplo/spice/formula/have-at-home; right live calculation: ingredients table with pack steppers, leftover, availability, substitutes; sticky summary: total/cost-per-person/weight/thermal split; add-all-to-cart with recipe grouping), CartView (recipe-grouped lines, coupon, shipping quote, thermal split, summary), CheckoutView (3-step stepper, address/slot/method/card, server-side order creation), OrderConfirmationView, OrdersView (reorder/invoice), OrderTrackingView (timeline, shipments, address, map placeholder), AccountView (login simulated, profile/favorites/saved recipes/loyalty/wallet/settings), InfoView (about/help FAQ accordion/contact form/legal pages).
- Admin: AdminView with retractable charcoal sidebar (9 modules), Dashboard (12 KPI cards + top products/recipes + conversion/countries/carriers), Products/Recipes tables, Stock (FEFO batches with expiry coloring), Orders (state machine badges), Customers, Payments, Audit log (sensitive actions), Settings.
- Rewrote `src/app/page.tsx` as the client view-router shell (mount gate to avoid hydration mismatch, AnimatePresence transitions, sticky footer pattern, admin view rendered full-screen without storefront chrome).
- Lint: clean (`bun run lint` passes with 0 errors). Fixed `formatQty` import (moved to recipe-engine). Fixed React 19 `react-hooks/set-state-in-effect` lint rule for legitimate fetch/sync patterns.

Stage Summary:
- Full bilingual (FR/EN) storefront + admin working on single `/` route via client-side view switching.
- Recipe engine genuinely functional: live calculation, pack overrides, leftovers, cost-per-person, thermal split, substitutes, add-to-cart with recipe grouping.
- Search recognizes aliases (Kplô/Kplo/beef skin → kplo-fume product).
- Checkout is server-verified: recomputes prices, reserves stock FEFO, creates order + payment + shipments + audit in a transaction.
- All shadcn/ui components used; brand palette (terre cuite / jaune doré / vert forêt / noir charbon / blanc crème) applied throughout; sticky footer; mobile bottom nav.
- Next: Agent Browser self-verification of the golden path.

---
Task ID: 5
Agent: architecte (principal) — Agent Browser self-verification
Task: End-to-end verification of the golden path with Agent Browser.

Work Log:
- Opened http://localhost:3000/ → home renders (hero, 8 categories, bestsellers: Placali/Attiéké/Farine de mil/Kplô fumé/Poulet/Maquereau/Gombo/Feuilles de manioc, popular recipes). Title correct.
- Language switch FR→EN: UI switches, brand name « Je mange Africain » preserved, view stays on home. ✓
- Search "beef skin" → found "🥩 Smoked kplô ↳ beef skin Meats & traditional €9.90" (matched alias shown). Confirms bilingual accent-insensitive alias search (Kplô/Kplo/beef skin → same product). ✓
- Recipe configurator (Placali & palm nut sauce, 8 people): engine computed — Placali 1.2 kg → 3 packs / 300 g leftover / €20.70 ; Palm nuts 800 g → 2 packs / 200 g leftover / €11.80 ; etc. Summary: Total €70.40 · Cost/person €8.80 · Weight 5.1 kg · 2 parcels (Frozen + Ambient) · 7 reusable leftovers. ✓
- "Add all to cart" → cart shows recipe basket grouped "Recipe basket: Placali & palm nut sauce €70.40" with 8 lines, qty steppers, subtotal €70.40, VAT €11.73, shipping €3.54, coupons (BIENVENUE10/FRAIS5/LIVRAISONOFFERTE). ✓
- Admin dashboard: 12 KPI cards (revenue today €2840, month €48200, 142 orders, avg basket €34.80, 38% margin, logistics €3.20, 7 to prepare, 1 late, 0 at risk, 0 out of stock, 2 expiring, 1 claim) + top products/recipes + conversion 3.8% + countries + carriers. ✓
- Admin Stock module: 78 active batches, 14 expiring soon, FEFO-sorted table (Plantain 30 Aug → Soumbala 31 Aug → Placali 1 Sep …). ✓
- Sticky footer verified: root wrapper `min-h-screen flex flex-col`, footer `mt-auto`. Admin view is full-screen (no storefront chrome). ✓

Stage Summary:
- All core flows browser-verified: bilingual switch, alias search, recipe engine calculation, cart with recipe grouping, admin KPIs + FEFO stock, sticky footer.
- No runtime errors; lint passes clean (0 errors).
