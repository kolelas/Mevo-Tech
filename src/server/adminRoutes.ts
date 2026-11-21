import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Pool } from 'pg';
import {
  ADMIN_ROLES,
  hasAdminPermission,
  resolveAdminRole,
  type AdminRole,
  type VerifiedAdminIdentity,
} from './adminAuthorization';
import { verifyFirebaseAdminIdentity } from './firebaseAdminIdentity';

type IdentityVerifier = (token: string) => Promise<VerifiedAdminIdentity | null>;

function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && token.length <= 16_384 ? token : null;
}

export function createAdminRouter(
  pool: Pick<Pool, 'query'> | null,
  verifyIdentity: IdentityVerifier = verifyFirebaseAdminIdentity,
) {
  const router = Router();

  const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!pool) {
      return res.status(503).json({
        success: false,
        error: 'Administrator services are unavailable until the database is configured.',
      });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: 'A valid administrator sign-in is required.' });
    }

    try {
      const identity = await verifyIdentity(token);
      if (!identity) {
        return res.status(401).json({ success: false, error: 'A valid administrator sign-in is required.' });
      }

      const role = await resolveAdminRole(pool, identity);
      if (!role) {
        return res.status(403).json({ success: false, error: 'Administrator access has not been granted.' });
      }

      res.locals.adminIdentity = identity;
      res.locals.adminRole = role;
      next();
    } catch {
      return res.status(503).json({ success: false, error: 'Administrator authorization is temporarily unavailable.' });
    }
  };

  router.use(authenticateAdmin);

  router.get('/session', (_req, res) => {
    const role = res.locals.adminRole as AdminRole;
    res.json({
      success: true,
      administrator: {
        userId: (res.locals.adminIdentity as VerifiedAdminIdentity).userId,
        email: (res.locals.adminIdentity as VerifiedAdminIdentity).email,
        role,
        permissions: [
          'admin.roles.manage',
          'catalog.read',
          'catalog.write',
          'inventory.read',
          'inventory.write',
          'orders.read',
          'orders.fulfil',
          'customers.read',
          'customers.support',
        ].filter((permission) => hasAdminPermission(role, permission as Parameters<typeof hasAdminPermission>[1])),
      },
    });
  });

  router.post('/roles', async (req, res) => {
    const role = res.locals.adminRole as AdminRole;
    if (!hasAdminPermission(role, 'admin.roles.manage')) {
      return res.status(403).json({ success: false, error: 'Owner permission is required to manage administrator roles.' });
    }

    const { userId, email, role: requestedRole } = req.body || {};
    if (
      typeof userId !== 'string' || !userId.trim() || userId.length > 256 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 ||
      typeof requestedRole !== 'string' || !ADMIN_ROLES.includes(requestedRole as AdminRole)
    ) {
      return res.status(400).json({ success: false, error: 'A valid userId, email, and administrator role are required.' });
    }

    const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
    try {
      await pool!.query(
        `INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT (user_id) DO UPDATE
           SET email = EXCLUDED.email,
               role = EXCLUDED.role,
               enabled = TRUE,
               granted_by = EXCLUDED.granted_by,
               updated_at = now()`,
        [userId.trim(), email.trim().toLowerCase(), requestedRole, identity.userId],
      );
      return res.status(201).json({ success: true, message: 'Administrator role saved.' });
    } catch {
      return res.status(503).json({ success: false, error: 'Administrator role could not be saved.' });
    }
  });

  return router;
}
