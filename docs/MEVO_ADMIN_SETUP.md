# Mevo Tech administrator setup (non-production first)

This document describes the controlled bootstrap for the server-enforced administrator API. Do not enable this in production until the application, database, identity-provider credentials, backups, and recovery process have been reviewed.

## Required server configuration

Configure these values in the hosting platform's secret/environment manager. Never commit credentials or paste private keys into source files.

- `DATABASE_URL`: PostgreSQL connection URL for the server runtime. Use a dedicated application database user with only the permissions required by the deployed migrations and application.
- `FIREBASE_PROJECT_ID`: Firebase project ID used by the server-side Firebase Admin SDK.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: service-account JSON supplied as a secret, or use the host's workload identity / Application Default Credentials instead. Do not configure both unless the hosting provider requires it.
- `JWT_SECRET`: existing customer-session signing secret. It is separate from Firebase Admin credentials.

The admin API returns HTTP 503 when PostgreSQL is not configured. It returns 401 for missing/invalid/revoked Firebase ID tokens or unverified email, and 403 when the verified Firebase UID/email pair has no enabled row in `admin_roles`.

## Database preparation

1. Provision a non-production PostgreSQL database and backup/restore process.
2. Apply migrations 003, 004, and 005 in order after reviewing them.
3. Verify the `admin_roles` table and the last-owner trigger exist.
4. Create a normal Firebase account for the intended initial owner and complete Firebase email verification.
5. Retrieve that account's Firebase UID from the trusted Firebase project console. Confirm the email and UID independently.

## Initial owner bootstrap

Run the following statement through a trusted database administration session, replacing the placeholders with the verified Firebase UID and email. The bootstrap actor label is an audit string; it is not an identity credential.

```sql
INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
VALUES ('<VERIFIED_FIREBASE_UID>', '<VERIFIED_EMAIL>', 'owner', TRUE, 'manual-bootstrap');
```

Do not create a shared owner account. Each staff member should have an individual Firebase identity and a role appropriate to their duties.

## Verify the admin session

1. Sign in as the bootstrapped account through the existing Firebase client authentication flow.
2. Obtain a Firebase **ID token** from the signed-in user. Do not use a Firebase custom token or the application's customer-session JWT.
3. Send the ID token as `Authorization: Bearer <FIREBASE_ID_TOKEN>` to `GET /api/admin/session`.
4. Confirm the returned UID, normalized email, role, and permission list match the intended owner.
5. Use `POST /api/admin/roles` to grant roles only after confirming the target staff member's Firebase UID and email.

The role API can also disable a staff role with `DELETE /api/admin/roles/<FIREBASE_UID>`. The database trigger prevents disabling or demoting the last enabled owner. Keep at least two individually controlled owner accounts for recovery, and periodically verify both can sign in.

## Current implementation boundary

The admin router currently exposes only session inspection and role assignment/revocation. Product, inventory, order, customer-support, payment, and audit-log management endpoints are not yet connected. The existing commerce runtime still uses in-memory Maps; setting `DATABASE_URL` does not migrate commerce data or make the store persistent.

Do not run production migrations, configure production credentials, or deploy this feature until explicitly approved and separately reviewed.
