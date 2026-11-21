# Mevo Tech — Cloudflare staging deployment

This is an optional deployment target named **mevo-tech-staging**. It is separate from the existing live storefront. It does not alter the production domain, DNS, storefront, or live data.

## Architecture

- Cloudflare Worker: request gateway.
- Cloudflare Container: runs the existing Node 22 + Express application and serves the existing Vite-built storefront without redesigning it.
- PostgreSQL: connect a disposable staging database through `DATABASE_URL`.
- Existing migrations are applied only to the staging database after review. Never point this staging Worker at a production database.

## Account plan and cost

Cloudflare Containers are **not available on the Workers Free plan**. They require Workers Paid, currently starting at USD $5/month, with additional usage-based container, Worker, Durable Object and egress charges possible. See the official [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

This configuration is kept in the repository so it can be activated later if you upgrade Cloudflare. It is not required for the free staging deployment.

## Required Cloudflare secrets

When you choose to activate this target, configure these as encrypted secrets in the Cloudflare Worker:

- `JWT_SECRET` — required; generate a unique high-entropy staging secret.
- `DATABASE_URL` — required to exercise PostgreSQL-backed administrator features; point it to a disposable staging PostgreSQL database.
- `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON` — only if staging administrator authentication is being tested.
- Payment-provider keys and webhook secrets — leave unset for dummy-data testing. Payment adapters intentionally fail closed when credentials or verification are absent.
- `GEMINI_API_KEY` — optional, only if the staging build exercises Gemini-backed features.

Do not copy production secrets into staging. Do not commit secret values to Git.

## Deployment

1. Use a Cloudflare Workers Paid account.
2. Connect the `kolelas/Mevo-Tech` GitHub repository.
3. Deploy branch `feature/mevo-commerce-os-foundation` as a separate Worker named `mevo-tech-staging`.
4. Use repository root as build root, install dependencies, and run `bun run deploy:cloudflare:staging`.
5. Ensure Docker is running in the deployment environment because Wrangler builds and pushes the container image from the Dockerfile.
6. Configure the encrypted secrets above and verify the resulting `*.workers.dev` URL.

From a trusted local checkout with Docker running and Wrangler authenticated to the intended Cloudflare account:

```bash
bun install
bun run lint
bun run test
bun run build
bun run deploy:cloudflare:staging
```

## Staging database

Create a new, empty PostgreSQL database. Apply migrations 001–006 in the order documented in `MEVO_ADMIN_SETUP.md`. Run the SQL assertion files from `tests/sql`. Use generated dummy records only. Never use production connection strings.

## Current boundaries

- This configuration targets a separate staging Worker. It does not deploy to the live website.
- The existing production storefront is left unchanged.
- No production DNS changes, domain binding, merge, production migration, or production deployment is part of this setup.
- Before a production cutover, verify complete staging workflows, backup/restore, provider integrations, secrets, and existing live hosting arrangement.
