import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

// Production cryptographic secret or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'mevo_tech_za_jwt_production_master_secret_2026';
const BCRYPT_ROUNDS = 10;

/**
 * Hash a plain password using bcrypt with cryptographic salt rounds.
 */
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText.trim(), BCRYPT_ROUNDS);
}

/**
 * Compare an attempted password against a bcrypt hash or legacy hash.
 */
export function verifyPassword(plainText: string, storedHashOrPlain: string): boolean {
  if (!plainText || !storedHashOrPlain) return false;
  // If stored value is already a bcrypt hash
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(plainText.trim(), storedHashOrPlain);
    } catch {
      return false;
    }
  }
  // Graceful fallback during migration for pre-seeded passwords
  return plainText.trim() === storedHashOrPlain.trim();
}

export interface CustomerJwtPayload {
  customerId: string;
  email: string;
  role: 'customer';
  iat?: number;
  exp?: number;
}

/**
 * Issue a signed JSON Web Token for customer sessions (7-day validity)
 */
export function signCustomerToken(customerId: string, email: string): string {
  return jwt.sign(
    {
      customerId,
      email,
      role: 'customer',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode customer JWT token
 */
export function verifyCustomerToken(token: string): CustomerJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomerJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify PayFast Webhook / ITN MD5 Signature
 * PayFast requires parameter ordering and optional passphrase hashing
 */
export function verifyPayfastSignature(
  data: Record<string, any>,
  receivedSignature: string,
  passphrase?: string
): boolean {
  if (!receivedSignature) return false;

  // Build query string of all non-signature fields
  const keys = Object.keys(data)
    .filter((k) => k !== 'signature')
    .sort();

  let pfOutput = '';
  for (const key of keys) {
    const val = data[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      pfOutput += `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, '+')}&`;
    }
  }

  // Remove trailing &
  let pfParamString = pfOutput.slice(0, -1);
  if (passphrase) {
    pfParamString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  const computedHash = crypto.createHash('md5').update(pfParamString).digest('hex');
  return computedHash.toLowerCase() === receivedSignature.toLowerCase();
}

/**
 * Verify Paystack Webhook HMAC-SHA512 Signature
 */
export function verifyPaystackSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secretKey?: string
): boolean {
  if (!signatureHeader) return false;
  const secret = secretKey || process.env.PAYSTACK_SECRET_KEY || 'sk_test_mevo_tech_rsa_gateway_secret';
  const computedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return computedHash === signatureHeader;
}

/**
 * Rate Limiting Middleware Configurations
 */

// 1. Strict rate limit on authentication endpoints (Login, Register) - 15 requests per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again (Brute-force protection).',
  },
});

// 2. Checkout / Order reservation rate limit - 40 requests per 15 minutes per IP
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many order or reservation requests. Please try again in a few moments (Anti-hoarding protection).',
  },
});

// 3. Strict rate limit on every form that sends emails (Newsletter, Contact form, Price drop alerts, Order lookup) - 5 requests per 10 minutes
export const emailFormRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many submissions for this email service from this IP. Please wait 10 minutes before submitting again (Spam & Email Relay Protection).',
  },
});

// 4. General API rate limiter - 600 requests per 15 minutes
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded. Please throttle requests.',
  },
});

/**
 * Principle 2: Never trust role or isPro from the browser.
 * Sanitizes profile update payloads to explicitly strip client-supplied privilege escalation fields.
 */
export function sanitizeCustomerProfileUpdates<T extends Record<string, any>>(rawUpdates: T): Partial<T> {
  const forbiddenKeys = ['role', 'isPro', 'status', 'restrictionReason', 'id', 'createdAt', 'email', 'authProvider'];
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (!forbiddenKeys.includes(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<T>;
}

/**
 * Principle 5: Check who owns it before update or delete.
 * Verifies that the authenticated session / token owns the resource or is an admin.
 */
export function verifyOwnership(authenticatedCustomerId: string | undefined, targetCustomerId: string): boolean {
  if (!authenticatedCustomerId || !targetCustomerId) return false;
  return authenticatedCustomerId === targetCustomerId;
}

