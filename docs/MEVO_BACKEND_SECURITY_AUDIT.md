# Mevo Tech Backend Security Audit — Development Branch

Scope: backend, customer account workspace, and security. The storefront is explicitly out of scope and must not be redesigned, restyled, or refactored.

## Remediations committed in this pass
- Fail closed for social-login claims until provider tokens can be verified server-side.
- Public order tracking now returns a minimal projection, with reduced status-history fields.
- Price-alert deletion requires a signed customer session and resource ownership.
- Price-alert creation is bound to authenticated customer identity (no caller-provided email/customer ID).
- Product reviews require authentication and an order containing the product, and server-derived identity; input lengths/rating validated.
- Webhook callbacks against already-paid orders are ignored and logged to prevent status downgrades (basic state-level guard; not a substitute for durable provider-event idempotency).
- Checkout item quantities must be integer values in a bounded range and invalid variants are rejected.
- Cart validation now rejects malformed/non-bounded quantities and invalid variant IDs instead of silently pricing invalid variants as base products.
- Public product-review responses now use a narrow projection and omit internal customer IDs, customer emails, and moderation/internal fields.
- Customer account deletion target is derived from verified session identity and requires explicit confirmation.
- Customer profile updates now use a strict allowlist (name and phone only), bounded string values, and trim normalization; unknown fields are discarded.

## Remaining high-risk work (not yet complete)
- The API currently exposes no dedicated admin router; administrative management functions may be client/database-layer workflows and must be mapped and moved behind server-side authorization before production.
1. Durable webhook idempotency: persist provider event/transaction IDs with uniqueness constraints and transactionally update order/payment/stock state. Current in-memory order state cannot provide cross-process or restart guarantees.
2. Runtime persistence: the PostgreSQL schema foundation exists, but the runtime database implementation still uses in-memory Maps. Migration is not complete.
3. Admin authorization: audit all admin endpoints and enforce server-side roles/permissions. Client UI role flags are not authorization.
4. Authentication: opportunistic legacy plaintext-password upgrade on successful login exists in the in-memory authentication path; confirm coverage against persistent production records and eliminate legacy comparison once migration is complete. Review token expiry, revocation, and email-change flows.
5. Checkout: transactional stock reservation/order creation, coupon usage, pricing, and shipping validations.
6. Reviews: unique per-customer/product constraints, moderation, and verified-purchase criteria tied to successful payment/delivery. Current API check is a preliminary control.
7. Payment provider validation: review each adapter's official signature, callback fields, amount/currency and transaction status; reconciliation and refund flows.
8. Security tests: route-level tests for ownership, authentication, rate-limits, callback replay, payment amount mismatch, review authorization and account export/deletion.
9. Account profile UI: regression-check only the customer workspace; no storefront changes.
10. Deployment controls: production secrets, backups, restore test, logging, CI, dependency and vulnerability scanning.
11. Cart validation remains advisory and must not be treated as the final checkout authority; stock and price must be rechecked transactionally at order creation.

## Batch implementation groundwork (migration 003)
- Added additive PostgreSQL tables for managed admin roles, unique provider webhook event IDs/transaction IDs, payment-attempt ledger, inventory reservations and order-status event history.
- Migration 003 is not applied, and runtime code is not switched to PostgreSQL. No production credentials or schema changes were performed.
- The payment webhook endpoint is not yet using the new event ledger; event deduplication/processing must be implemented in a transaction and tested before production.
- Admin role table is groundwork only; API routes currently do not expose an admin management router. The frontend's admin path is not proof of authorization. Server-side admin management must be designed and wired to verified identity/custom claims and DB-backed roles.
- Checkout/stock/coupon/payment transitions remain in-memory and non-transactional until the runtime migration is complete.
- Provider-specific webhook event IDs need reliable extraction from each adapter and reconciliation strategy before ledger adoption.
- Review constraints and migration tests remain unimplemented at runtime; SQL groundwork in earlier migration is not activated.

## Firestore rules hardening in this pass\n- Admin checks now require verified email and support Firebase custom role claims (`owner`/`admin`) while retaining the legacy email allowlist for transition. This hybrid is transitional, not the final admin identity design.\n- Price-alert creation is now limited to signed-in Firebase users with verified email, matching the authenticated token email, a bounded product ID, an allowlisted payload shape, and ACTIVE initial state.\n- Customers can delete their own price-alert documents; admin updates remain restricted.\n- This rules patch has not been deployed or emulator-tested. The runtime/API may not use Firestore for these records.\n\n## Additional migration foundation committed
- Added `002_webhook_review_constraints.sql`: a unique provider/event ID table to support durable webhook idempotency and persistent review constraints (unique customer/product/order, rating bounds, moderation state).
- These constraints are groundwork only. They are not wired to the active in-memory runtime and have not been applied to a database.
- Expanded cutover checklist at `docs/MEVO_BACKEND_SECURITY_AUDIT.md` to include transactional persistence, auth code delivery/expiry, account deletion/POPIA review, checkout concurrency, monitoring and staging.

## Guardrails
- Do not merge or deploy to production until test and staging verification is performed and explicitly approved.
- Preserve the existing storefront untouched.


## Payment adapter fail-closed remediation (latest)
- Paystack webhook validation now fails closed if the secret is not configured; previously the unconfigured branch accepted the payload as valid.
- Ozow and crypto webhook adapters now report invalid/unverified webhook authentication, preventing the API handler from accepting their payloads as verified payment notifications. These providers require real provider verification/reconciliation before being enabled for live checkout.
- These code changes are not a substitute for provider-specific integration tests, raw-body handling, official verification, or reconciliation. No payment configuration or production environment was changed.
