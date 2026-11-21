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


## Paystack adapter hardening and tests (follow-up)
- Paystack configuration no longer uses a built-in sample secret as a fallback. A blank secret remains unconfigured; sample/placeholder-like secrets are not treated as configured.
- Paystack HMAC-SHA512 adapter comparison uses format validation and constant-time comparison.
- Added adapter tests for valid/forged/malformed Paystack signatures and fail-closed unconfigured behavior, and for Ozow/crypto's currently unverified status.
- Tests are added but have not been executed in this environment. Express raw-body capture, provider reconciliation, and end-to-end tests remain outstanding.


## Raw-body webhook verification groundwork
- Express JSON middleware now captures the exact original JSON payload bytes as `rawBody`.
- The Paystack webhook handler now passes this captured body to its verification adapter instead of re-serializing parsed JSON, avoiding signature mismatch caused by JSON formatting changes.
- Paystack signature format validation and timing-safe comparison are implemented in the adapter.
- This is legacy `X-Paystack-Signature` verification; migration to the current signing-secret header format and timestamp/replay validation remains outstanding. Provider-event idempotency and transactional processing also remain outstanding.
- These code changes are not tested or deployed in this environment.


## Current Paystack signing-secret verification (latest)
- Added support for the current `Paystack-Signature` header using the `PAYSTACK_WEBHOOK_SECRET` environment variable (must be the full `whsec_...` value).
- Verifies the timestamped HMAC-SHA512 over `timestamp + "." + raw body`, enforces Paystack's ±300-second window, supports multiple `v1` signatures during secret rotation, and uses constant-time comparison.
- If the current-format header is present but invalid, the adapter does not fall back to the deprecated header (prevents signature downgrade). If it is absent, legacy `X-Paystack-Signature` verification remains available using `PAYSTACK_SECRET_KEY` for migration.
- Corrected adapter test import paths and added tests for the timestamped format, stale timestamps, malformed/duplicate timestamp fields, and downgrade resistance. The adapter test file is now included in the package test script.
- The test suite has not yet been run. This does not implement durable event idempotency, database transactions, or provider reconciliation. Configure the webhook signing secret only in the deployment environment after verifying the provider's test/live mode; no credentials were changed here.


## Payment event and currency safeguards (latest)
- Paystack order state changes are now limited to signed `charge.success` and `charge.failed` events. Other signed event families cannot be interpreted as checkout payment confirmation.
- Paystack transaction amount must be a positive safe integer, and its currency is read from the signed event rather than assumed from local configuration.
- The webhook handler now requires both amount and currency to match the order before marking it paid. Mismatches are placed on fulfilment hold and logged.
- Payflex webhook handling now fails closed. The existing adapter had been treating caller-supplied status fields as verified without an authentication contract; those payloads can no longer mark orders paid.
- Repaired malformed literal newline escapes in the payment-state guard in `src/server/api.ts`; this was a source-integrity correction, not a storefront change.
- Adapter tests cover Paystack current/legacy signatures, stale timestamps, multiple signature entries, downgrade resistance, event allowlisting, currency extraction, and fail-closed behavior for Payflex/Ozow/crypto. Tests are configured but remain unexecuted.
- PayFast and Payflex initiation adapters still contain placeholder/simulated behavior; do not enable live payment until provider APIs, webhook verification, transaction reconciliation, and end-to-end tests are completed.


## Continuous integration verification (latest)
- Added a GitHub Actions workflow for TypeScript validation, automated tests, and the Vite production build.
- The run for commit `602349cf54757d3612cd7d0feddcb3468aab575b` completed successfully: typecheck passed, all 59 tests passed, and the production build completed.
- CI surfaced and enabled correction of malformed raw-body middleware line breaks in `server.ts` and a TypeScript narrowing issue in the customer-orders route.
- The repository's pre-existing `bun.lock` did not match `package.json`; CI currently runs `bun install` to refresh it in the runner. The refreshed lockfile is not committed yet, so frozen-lockfile installs remain a follow-up cleanup.
- The build reports non-blocking warnings for `__dirname` in `vite.config.ts` and a JavaScript chunk above 500 kB. These are recorded for later build optimization and do not block this verification.
- This CI result validates the current branch snapshot only; it is not staging, live payment, database migration, or production deployment approval.

## Developer payment simulator access control (follow-up)
- The simulated payment endpoint now remains unavailable in production and is additionally disabled in every environment unless `MEVO_ENABLE_PAYMENT_SIMULATOR=true` is explicitly set.
- Requests are rate-limited, require a verified customer bearer session, and must match the order's customer ID. Invalid outcomes are rejected, and already-paid orders cannot be modified by the simulator.
- Simulation audit entries identify the authenticated customer and clearly label the result as test-only; the simulator does not constitute provider confirmation.
- This is a development/testing control only. It does not implement durable webhook idempotency or replace provider-side verification. Route-level tests and staging validation remain required.

## Payment gateway configuration fail-closed follow-up
- Removed built-in sample/sandbox merchant credentials from PayFast, Ozow, Payflex and crypto provider constructors. Missing credentials now leave the adapters unconfigured.
- Provider configuration checks reject common sample/placeholder/sandbox values. The payment initiation route now returns HTTP 503 before creating a payment attempt when the selected provider is not configured.
- PayFast webhook signature comparison now validates the expected hexadecimal signature format and uses a timing-safe comparison; verification also requires a configured provider.
- Added adapter regression tests for PayFast valid/forged signatures and for default/placeholder gateway configuration.
- Important: these safeguards do not make the currently stubbed provider initiation/refund flows production-ready. Ozow, Payflex and crypto webhook verification remain fail-closed; PayFast callback origin/provider reconciliation, amount checks, and route-level tests remain required. No provider secrets were added or changed.
