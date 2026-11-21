# Mevo Tech Backend Security Audit — Development Branch

Scope: backend, customer account workspace, and security. The storefront is explicitly out of scope and must not be redesigned, restyled, or refactored.

## Remediations committed in this pass
- Fail closed for social-login claims until provider tokens can be verified server-side.
- Public order tracking now returns a minimal projection, with reduced status-history fields.
- Price-alert deletion requires a signed customer session and resource ownership.
- Price-alert creation is bound to authenticated customer identity (no caller-provided email/customer ID).
- Product reviews require authentication and an order containing the product, and server-derived identity; input lengths/rating validated.
- Duplicate successful webhook callbacks on already-paid orders are safely ignored and logged (basic state-level duplicate guard; not a substitute for durable provider-event idempotency).
- Checkout item quantities must be integer values in a bounded range and invalid variants are rejected.

## Remaining high-risk work (not yet complete)
1. Durable webhook idempotency: persist provider event/transaction IDs with uniqueness constraints and transactionally update order/payment/stock state. Current in-memory order state cannot provide cross-process or restart guarantees.
2. Runtime persistence: the PostgreSQL schema foundation exists, but the runtime database implementation still uses in-memory Maps. Migration is not complete.
3. Admin authorization: audit all admin endpoints and enforce server-side roles/permissions. Client UI role flags are not authorization.
4. Authentication: migrate legacy plaintext password records safely; eliminate plaintext comparison once migration is complete. Review token expiry, revocation, and email-change flows.
5. Checkout: transactional stock reservation/order creation, coupon usage, pricing, and shipping validations.
6. Reviews: unique per-customer/product constraints, moderation, and verified-purchase criteria tied to successful payment/delivery. Current API check is a preliminary control.
7. Payment provider validation: review each adapter's official signature, callback fields, amount/currency and transaction status; reconciliation and refund flows.
8. Security tests: route-level tests for ownership, authentication, rate-limits, callback replay, payment amount mismatch, review authorization and account export/deletion.
9. Account profile UI: regression-check only the customer workspace; no storefront changes.
10. Deployment controls: production secrets, backups, restore test, logging, CI, dependency and vulnerability scanning.

## Guardrails
- Do not merge or deploy to production until test and staging verification is performed and explicitly approved.
- Preserve the existing storefront untouched.
