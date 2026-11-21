# Mevo Tech — Cloudflare staging deployment

This deployment target is intentionally named **mevo-tech-staging**. It is separate from the existing live storefront. It does not alter the production domain, DNS, storefront, or live data.

## Architecture

- Cloudflare Worker: request gateway and isolated staging entry point.
- Cloudflare Container: runs the existing Node 22 + Express application and serves the existing Vite-built storefront without redesigning it.
- PostgreSQL: connect a disposable staging database through `DATABASE_URL`.
- Existing migrations are applied only to the staging database after review. Never point this staging Worker at a production database.

Cloudflare Containers are available on the Workers Paid plan. A Cloudflare account, Workers Paid plan, and Docker-compatible build environment are required for the first deployment.

## Required Cloudflare secrets

Set these in Workers & Pages → mevo-tech-staging → Settings → Variables and Secrets. Use encrypted secrets for credentials:

- `JWT_SECRET` — required; generate a unique high-entropy staging secret.
- `DATABASE_URL` — required to exercise PostgreSQL-backed administrator features; point it to a disposable staging PostgreSQL database.
- `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON` — only if staging administrator authentication is being tested.
- Payment-provider keys and webhook secrets — leave unset for dummy-data testing. Payment adapters intentionally fail closed when credentials or verification are absent.
- `GEMINI_API_KEY` — optional, only if the staging build exercises Gemini-backed features.

Do not copy production secrets into staging. Do not commit secret values to Git.

## GitHub / Workers Builds

1. In Cloudflare, open Workers & Pages and create or connect a Worker named `mevo-tech-staging`.
2. Connect the `kolelas/Mevo-Tech` GitHub repository.
3. Use `feature/mevo-commerce-os-foundation` as the staging branch. Do not set this feature branch as the production branch for the existing live site.
4. Use the repository root as the build root. Install dependencies with Bun, run the normal CI checks, and use `npx wrangler deploy` as the staging deploy command.
5. Configure the encrypted secrets above before the first deploy.
6. Confirm the resulting `*.workers.dev` URL and test `/health`, customer account UI, admin authentication, and dummy catalogue/order/support workflows.

Alternatively, from a trusted local checkout with Docker running and Wrangler authenticated to the intended Cloudflare account, run `bun install`, `bun run build`, then `bun run deploy:cloudflare:staging`.

## Staging database

Create a new, empty PostgreSQL database. Apply migrations 001–006 in the order documented in `MEVO_ADMIN_SETUP.md`. Run the SQL assertion files from `tests/sql`. Use generated dummy records only. Never use production connection strings.

## Current boundaries

- This configuration targets a separate staging Worker. It does not deploy to the live website.
- The current production storefront is left unchanged.
- No production DNS changes, domain binding, merge, production migration, or production deployment is part of this setup.
- Before a production cutover, verify the complete staging workflows, backup/restore, provider integrations, secrets, and existing live hosting arrangement.
