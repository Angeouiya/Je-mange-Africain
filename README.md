# Je mange Africain

Plateforme e-commerce bilingue dédiée aux produits et recettes africains. Le même projet sert la boutique client, le configurateur de recettes, le suivi de commande et le poste de pilotage administrateur.

## Architecture

- Next.js 16 et React 19 pour les interfaces et les routes API.
- Cloudflare Workers pour l’unique runtime de production, avec Vinext et Wrangler.
- Cloudflare Hyperdrive pour les connexions PostgreSQL.
- Supabase PostgreSQL et Supabase Auth pour les données et les identités.
- Prisma pour les accès typés à la base.
- Vitest et Playwright pour les contrôles unitaires et de parcours.

Le domaine de secours Cloudflare est `https://je-mange-africain.promise-corporation.workers.dev`. L’administration y est disponible sous `/admin` tant que la délégation DNS des domaines personnalisés n’est pas terminée.

## Démarrage local

Prérequis : Node.js 22 et npm.

```bash
npm ci
npm run dev
```

`predev` prépare automatiquement la base SQLite locale et génère le client Prisma. Copiez `.env.example` vers `.env.local` uniquement lorsque vous devez tester une intégration distante ; ne validez jamais ce fichier.

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
npm run cloudflare:check
npm run build
```

Les parcours de navigateur sont lancés avec `npm run test:e2e`. Les commandes de production, les variables attendues et la procédure Supabase sont détaillées dans [docs/production-runbook.md](docs/production-runbook.md).

## Publication

```bash
npm run production:full-audit
npm run cloudflare:deploy
```

Le déploiement est exclusivement Cloudflare. Les secrets déjà enregistrés sur le Worker sont vérifiés et préservés lorsque les valeurs locales ne sont pas disponibles. Les migrations restent une étape séparée et exigent un accès explicite au projet Supabase JMA.
