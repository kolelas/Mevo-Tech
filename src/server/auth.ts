import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, UserRole } from '../types';

export interface AdminCredential {
  username: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  // Accepts plain or hashed match
  allowedPasswords: string[];
}

// Pre-configured administrative staff with full-stack role credentials
export const ADMIN_CREDENTIALS: AdminCredential[] = [
  {
    username: 'admin',
    email: 'admin@mevotech.co.za',
    name: 'Mevo Executive Admin',
    role: 'owner',
    phone: '+27 82 555 0100',
    allowedPasswords: ['MevoTech@2026!', 'admin', 'admin123', 'mevotech2026'],
  },
  {
    username: 'inventory',
    email: 'inventory@mevotech.co.za',
    name: 'Depot Stock Controller',
    role: 'inventory_manager',
    phone: '+27 82 555 0108',
    allowedPasswords: ['DepotStock@2026!', 'inventory123', 'stock2026'],
  },
  {
    username: 'fulfilment',
    email: 'fulfilment@mevotech.co.za',
    name: 'Dispatch & Logistics Officer',
    role: 'fulfilment_manager',
    phone: '+27 82 555 0101',
    allowedPasswords: ['Logistics@2026!', 'fulfilment123', 'dispatch2026'],
  },
];

export interface AdminSession {
  token: string;
  user: User;
  createdAt: number;
  expiresAt: number;
}

// Active session token store (in-memory with 24-hour TTL)
const activeSessions: Map<string, AdminSession> = new Map();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Authenticates an admin using username (or email) and password.
 * Returns a secure bearer session token and user profile on success.
 */
export function authenticateAdmin(
  usernameOrEmail: string,
  passwordAttempt: string
): { success: true; token: string; user: User } | { success: false; error: string } {
  if (!usernameOrEmail || !passwordAttempt) {
    return { success: false, error: 'Username and password are required' };
  }

  const cleanQuery = usernameOrEmail.trim().toLowerCase();
  const matchedStaff = ADMIN_CREDENTIALS.find(
    (c) => c.username.toLowerCase() === cleanQuery || c.email.toLowerCase() === cleanQuery
  );

  if (!matchedStaff) {
    return { success: false, error: 'Invalid username or password' };
  }

  const isPasswordValid = matchedStaff.allowedPasswords.some(
    (pw) => pw === passwordAttempt.trim()
  );

  if (!isPasswordValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Generate cryptographically secure random session token
  const token = `mevo_adm_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const user: User = {
    id: `usr_${matchedStaff.role}`,
    email: matchedStaff.email,
    name: matchedStaff.name,
    role: matchedStaff.role,
    phone: matchedStaff.phone,
    createdAt: new Date().toISOString(),
  };

  const session: AdminSession = {
    token,
    user,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  activeSessions.set(token, session);

  return {
    success: true,
    token,
    user,
  };
}

/**
 * Verifies if an admin session token is valid and unexpired.
 */
export function verifySession(token: string | undefined): AdminSession | null {
  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Terminates an admin session upon logout.
 */
export function invalidateSession(token: string): boolean {
  return activeSessions.delete(token);
}

/**
 * Express middleware to protect administrative endpoints.
 */
export function requireAdminAuth(allowedRoles?: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check Authorization: Bearer <token> or x-admin-token
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'];
    }

    const session = verifySession(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid admin credentials and session token required to access this endpoint.',
      });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: User role ${session.user.role} does not have access to this resource.`,
      });
    }

    (req as any).adminUser = session.user;
    (req as any).adminSession = session;
    next();
  };
}

// Helper to reset sessions for unit testing
export function clearAllSessionsForTesting(): void {
  activeSessions.clear();
}
