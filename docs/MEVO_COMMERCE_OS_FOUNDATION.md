# Mevo Commerce OS — integration foundation

This branch starts the backend modernization and customer experience upgrade without replacing the current storefront.

## Architecture decision
- Preserve the current React 19 + TypeScript + Vite + Express application.
- Keep the existing storefront API contracts stable during the transition.
- Build a modular backend; avoid prematurely splitting into microservices.
- PostgreSQL will become the authoritative store for transactional commerce data.
- Identity and commerce authorization must be separated. Admin authorization must be enforced server-side.
- Payment state is verified server-side through provider verification/webhook validation. Never accept browser claims as proof of payment.
- Inventory reservation, order creation, payment events and refunds must use transactional/idempotent patterns.
- The admin and customer experience are upgraded in parallel.

## Migration sequence
1. Inventory existing contracts, data and dependencies; add regression tests.
2. Harden identity/ownership and payment verification; isolate simulators to non-production.
3. Establish PostgreSQL schema/migrations and migration/backfill tooling.
4. Migrate products, customers, orders, stock, coupon and payment state behind compatibility services.
5. Add admin auth, roles/permissions, audit trail and admin route shell.
6. Build admin modules in order: command centre, orders, product catalog, inventory/purchasing, customers, payment/finance, shipping/returns, analytics, automation, integrations and system health.
7. Upgrade customer account, product discovery, product details, cart, checkout, tracking and post-purchase experience.
8. Add integration/load/security tests, monitoring, backup verification, staging rollout and production release checklist.

## Production acceptance requirements
- No privileged endpoint without server-side authorization.
- Customer ownership comes from verified server identity, not caller-controlled identity headers.
- Production startup fails if critical secrets are absent or unsafe.
- Payment webhooks have signature/provider verification and replay/idempotency protections.
- Test/simulated payment endpoints cannot be enabled in production.
- Inventory and payment changes are transaction-safe and idempotent.
- Every sensitive administrative action is auditable.
- Migrations and rollback/restore procedures are documented and rehearsed.
- Customer UI remains responsive, accessible and usable on mobile.

## Current status
This branch begins with customer-account visual polish and this migration blueprint. These are not a claim that the backend migration or production security audit is complete.
