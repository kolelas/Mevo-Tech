# Mevo Tech Backend Cutover Plan

Storefront code and presentation are excluded from this plan.

## Workstream 1 — Authorization
- Use verified server identity and centrally evaluated roles; UI visibility is not authorization.
- Admin role records are seeded through a controlled bootstrap operation, not public endpoints.
- Every privileged API operation requires a role-specific authorization middleware.
- Deny by default; log privileged actions and revoke access promptly.
- Firestore email allowlist is transitional; role claims and DB roles must be reconciled.

## Workstream 2 — Persistence
- Migration 003 adds RBAC, payment event ledger, attempt ledger, reservation and order event tables.
- Next: select a supported PostgreSQL driver, configuration/connection lifecycle, repository interfaces, transaction boundaries, migrations runner, backup and restore testing.
- Maps runtime remains authoritative until migration and integration tests pass; no partial shadow writes.

## Workstream 3 — Webhook idempotency
- Adapter must provide stable event ID, provider transaction ID, verified status and amount/currency.
- Insert ledger event under unique provider/event ID in a transaction.
- Lock order and payment attempt; verify amount, currency, order state and valid transitions.
- Update payment, order and stock/reservations in same transaction.
- Duplicate event must return successful acknowledgement without repeated side effects.
- Reconciliation and refund handling are separate; do not infer provider success from browser return URLs.

## Workstream 4 — Transactional checkout
- Server-side prices and shipping are authoritative.
- Lock/validate stock and variants; reserve stock; validate coupon limits; create order/payment attempt atomically.
- Roll back all changes on failure; reservation expiry releases stock safely.
- Add concurrency, duplicate request, coupon exhaustion and stock oversell tests.

## Workstream 5 — Customer account/reviews
- Retain strict customer identity binding and minimal projections.
- Add review uniqueness and paid/delivered order verification, moderation, export/delete tests and account UI regression tests.
- UI-only regression checks are permitted; storefront is unchanged.

## Workstream 6 — Verification and deployment
- Run typecheck, build, unit tests, rules emulator tests and API integration tests.
- Audit dependency/security scanning, secrets, rate limits and logging.
- Staging payment sandbox tests, backup/restore drill, privacy/POPIA review.
- Production deployment, merge and live migration require explicit owner approval.

## Current limitations
Migration 003 is additive SQL only; not applied. No PostgreSQL runtime, transactional webhook processing, admin management API, CI pipeline, staging test, or production deployment has been activated or verified.
