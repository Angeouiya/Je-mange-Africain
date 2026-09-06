# Production runbook

## Runtime services

- Next.js 16 serves the customer storefront, the separate `/admin` surface and API routes.
- Cloudflare Workers is the frontend runtime for production builds, generated with vinext and deployed through Wrangler on account `82164eca9557f63e18984230deac12bc`.
- Supabase Auth owns customer and administrator sessions; the two applications keep separate cookies and authorization flows.
- PostgreSQL is selected automatically when `DATABASE_URL` starts with `postgres://` or `postgresql://`. SQLite remains a local fixture fallback only.
- Upstash Redis provides distributed rate limiting and payment-attempt velocity. The app falls back to a local limiter if Redis is unavailable.
- Stripe Payment Element collects payment details. The server creates and verifies PaymentIntents, and the signed webhook reconciles asynchronous events.

## Required environment

Configure the variables documented in `.env.example` in the production host. Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` or `UPSTASH_REDIS_REST_TOKEN` to the browser.

Use the pooled Supabase PostgreSQL connection for the application runtime. Keep a direct database URL available for operational migrations when the provider requires it.
Production is pinned to Supabase project `JMA` (`ahigidhuhqcmxzjxetnw`) and Cloudflare account `82164eca9557f63e18984230deac12bc`. The release guard refuses another Supabase URL, including previous staging projects.

The production autopilot prints only key names and readiness states. It never prints secret values.

```bash
npm run production:audit
npm run production:check-supabase
npm run production:open-dashboards
```

## Frontend deployment

The production frontend is Cloudflare Workers, not Vercel. Keep the root `wrangler.jsonc` committed as the source of truth for account, Worker name, assets and observability.
The first Cloudflare release publishes on `https://je-mange-africain.jobbook-africa.workers.dev`. `je-mange-africain.com` stays a prepared final domain and will be attached later once DNS is ready.
The deploy command refuses to publish when production secrets are incomplete, when `DATABASE_URL` still points to a local SQLite database, or when Supabase points to a project other than `JMA` (`ahigidhuhqcmxzjxetnw`).

```bash
npm run cloudflare:check
npm run cloudflare:build
npm run cloudflare:deploy
```

For an existing Worker, refresh secrets without deploying code:

```bash
npm run production:sync-cloudflare
```

To create the Cloudflare Worker before the production secrets are ready, publish the safe bootstrap Worker on `workers.dev`:

```bash
npm run cloudflare:create
```

For the first complete application release, `npm run cloudflare:deploy` uses a temporary secrets file with `wrangler deploy --secrets-file`, so the bootstrap Worker is replaced by the real platform and configured in the same release.

For a local Workers-runtime preview after a successful vinext build:

```bash
npm run cloudflare:preview
```

## Database deployment

The repository already contains Supabase migrations in `supabase/migrations`. Use those for the linked Supabase project. The Prisma PostgreSQL migration under `prisma/postgresql/migrations` is the baseline for the application runtime schema.

Do not apply both initial migrations to the same populated database. For an existing Supabase database, compare the live schema first and mark the Prisma baseline as applied only after confirming equivalence.

```bash
npm run production:check-supabase
npm run production:link-supabase
npm run production:push-supabase
npm run db:generate:postgres
```

`production:link-supabase` needs `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in the local deployment environment. `production:push-supabase` can also use `DIRECT_URL` or a PostgreSQL `DATABASE_URL` directly.

For the Prisma-managed production release path:

```bash
npm run production:migrate-supabase
```

For a full release once every key is present:

```bash
npm run production:release
```

## Stripe

Create a webhook endpoint at `/api/payments/webhook` and subscribe to:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

Store its signing secret in `STRIPE_WEBHOOK_SECRET`. Payment is intentionally unavailable when Stripe keys are absent; the platform never fabricates a successful payment.

## Release checks

```bash
npm audit
npm run lint
npm test
npm run test:e2e
npm run build
npm run cloudflare:build
```
