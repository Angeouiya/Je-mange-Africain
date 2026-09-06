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

## Frontend deployment

The production frontend is Cloudflare Workers, not Vercel. Keep the root `wrangler.jsonc` committed as the source of truth for account, Worker name, assets and observability.
The deploy command refuses to publish when production secrets are incomplete or when `DATABASE_URL` still points to a local SQLite database.

```bash
npm run cloudflare:check
npm run cloudflare:build
npm run cloudflare:deploy
```

For a local Workers-runtime preview after a successful vinext build:

```bash
npm run cloudflare:preview
```

## Database deployment

The repository already contains Supabase migrations in `supabase/migrations`. Use those for the linked Supabase project. The Prisma PostgreSQL migration under `prisma/postgresql/migrations` is the baseline for a new, empty standalone PostgreSQL database.

Do not apply both initial migrations to the same populated database. For an existing Supabase database, compare the live schema first and mark the Prisma baseline as applied only after confirming equivalence.

```bash
supabase link --project-ref ahigidhuhqcmxzjxetnw
supabase db push
npm run db:generate:postgres
```

For a new empty PostgreSQL database outside the existing Supabase migration history:

```bash
npm run db:migrate:postgres
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
