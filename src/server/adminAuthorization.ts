import type { Pool, QueryResultRow } from 'pg';

export const ADMIN_ROLES = [
  'owner',
  'admin',
  'inventory_manager',
  'fulfilment_manager',
  'customer_support',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminPermission =
  | 'admin.roles.manage'
  | 'catalog.read'
  | 'catalog.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'orders.read'
  | 'orders.fulfil'
  | 'customers.read'
  | 'customers.support'
  | 'audit.read'
  | 'payments.read';

export interface VerifiedAdminIdentity {
  /** Stable subject from a server-verified identity-provider token. */
  userId: string;
  /** Email from the same verified token, never from request body/headers. */
  email: string;
  emailVerified: boolean;
}

interface AdminRoleRow extends QueryResultRow {
  role: AdminRole;
}

/**
 * Resolves an administrator from the database role registry.
 *
 * This deliberately does not trust client role fields or token role claims.
 * Callers must pass identity values obtained from a verified server-side
 * identity-provider token. Missing tables, database errors, unverified email,
 * disabled users, and identity mismatches all fail closed.
 */
export async function resolveAdminRole(
  pool: Pick<Pool, 'query'>,
  identity: VerifiedAdminIdentity,
): Promise<AdminRole | null> {
  const userId = identity.userId?.trim();
  const email = identity.email?.trim().toLowerCase();

  if (!identity.emailVerified || !userId || !email) return null;

  try {
    const result = await pool.query<AdminRoleRow>(
      `SELECT role
         FROM admin_roles
        WHERE user_id = $1
          AND lower(email) = $2
          AND enabled = TRUE
        LIMIT 1`,
      [userId, email],
    );

    const role = result.rows[0]?.role;
    return ADMIN_ROLES.includes(role) ? role : null;
  } catch {
    // A missing/unavailable role registry must never grant access.
    return null;
  }
}

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  owner: new Set([
    'admin.roles.manage',
    'catalog.read',
    'catalog.write',
    'inventory.read',
    'inventory.write',
    'orders.read',
    'orders.fulfil',
    'customers.read',
    'customers.support',
    'audit.read',
    'payments.read',
  ]),
  admin: new Set([
    'catalog.read',
    'catalog.write',
    'inventory.read',
    'inventory.write',
    'orders.read',
    'orders.fulfil',
    'customers.read',
    'customers.support',
    'audit.read',
    'payments.read',
  ]),
  inventory_manager: new Set([
    'catalog.read',
    'inventory.read',
    'inventory.write',
  ]),
  fulfilment_manager: new Set([
    'catalog.read',
    'inventory.read',
    'orders.read',
    'orders.fulfil',
  ]),
  customer_support: new Set([
    'catalog.read',
    'orders.read',
    'customers.read',
    'customers.support',
  ]),
};

export function hasAdminPermission(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role]?.has(permission));
}

/**
 * Single server-side authorization entry point for future protected routes.
 * It returns false on all identity, role-registry, and permission failures.
 */
export async function authorizeAdminPermission(
  pool: Pick<Pool, 'query'>,
  identity: VerifiedAdminIdentity,
  permission: AdminPermission,
): Promise<boolean> {
  const role = await resolveAdminRole(pool, identity);
  return hasAdminPermission(role, permission);
}
