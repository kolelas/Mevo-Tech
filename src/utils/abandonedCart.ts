import { AbandonedCart, AbandonedCartItem, CouponDiscount } from '../types';
import { calculateCartTotals } from './calculations';

export const DEFAULT_ABANDONMENT_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_REMINDER_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_MAX_REMINDERS = 3;
export const DEFAULT_CART_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const MAX_CART_LINE_QUANTITY = 50;

export interface RawCartSyncItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

/**
 * Sanitizes and merges duplicate productId + variantId sync lines from untrusted clients.
 */
export function sanitizeCartSyncItems(rawItems: unknown): RawCartSyncItem[] {
  if (!Array.isArray(rawItems)) return [];

  const merged = new Map<string, RawCartSyncItem>();

  for (const entry of rawItems) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const productId = typeof obj.productId === 'string' ? obj.productId.trim() : '';
    const variantId = typeof obj.variantId === 'string' && obj.variantId.trim() !== ''
      ? obj.variantId.trim()
      : undefined;
    const rawQty = Number(obj.quantity);

    if (!productId || !Number.isFinite(rawQty) || rawQty <= 0) continue;

    const clampedQty = Math.min(MAX_CART_LINE_QUANTITY, Math.max(1, Math.floor(rawQty)));
    const key = `${productId}::${variantId || ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(MAX_CART_LINE_QUANTITY, existing.quantity + clampedQty);
    } else {
      merged.set(key, { productId, variantId, quantity: clampedQty });
    }
  }

  return Array.from(merged.values());
}

/**
 * Computes authoritative abandoned cart totals in ZAR integer cents using server pricing.
 */
export function evaluateAbandonedCartTotals(params: {
  items: AbandonedCartItem[];
  coupon?: CouponDiscount | null;
  freeShippingThresholdCents?: number;
}): {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  estimatedTotalCents: number;
} {
  const itemCount = params.items.reduce((sum, i) => sum + Math.max(0, i.quantity), 0);
  const calc = calculateCartTotals({
    items: params.items.map((i) => ({ priceCents: i.unitPriceCents, quantity: i.quantity })),
    discount: params.coupon || null,
    shippingMethod: {
      id: 'standard',
      name: 'Standard Door-to-Door Courier',
      description: 'Standard Courier',
      priceCents: 15000,
      estimatedDelivery: '2–4 business days',
    },
    freeShippingThresholdCents: params.freeShippingThresholdCents ?? 150000,
  });

  return {
    itemCount,
    subtotalCents: calc.subtotalCents,
    discountCents: calc.discountCents,
    estimatedTotalCents: calc.totalCents,
  };
}

/**
 * Selects the highest-value active recovery incentive coupon eligible for a given subtotal.
 */
export function suggestRecoveryIncentiveCode(subtotalCents: number): string | undefined {
  if (subtotalCents >= 350000) return 'MEVOSUPER';
  if (subtotalCents >= 150000) return 'MEVO150';
  if (subtotalCents >= 100000) return 'MEVOSPRING';
  return undefined;
}

/**
 * Returns true if an ACTIVE non-empty cart has exceeded the abandonment inactivity window.
 */
export function isCartEligibleForAbandonment(
  cart: Pick<AbandonedCart, 'status' | 'items' | 'lastActivityAt'>,
  nowMs: number = Date.now(),
  thresholdMs: number = DEFAULT_ABANDONMENT_THRESHOLD_MS
): boolean {
  if (cart.status !== 'ACTIVE') return false;
  if (!cart.items || cart.items.length === 0) return false;
  const lastActivityMs = Date.parse(cart.lastActivityAt);
  if (!Number.isFinite(lastActivityMs)) return false;
  return nowMs - lastActivityMs >= thresholdMs;
}

/**
 * Returns true if an ACTIVE or ABANDONED cart has passed its expiration timestamp.
 */
export function isCartExpired(
  cart: Pick<AbandonedCart, 'status' | 'expiresAt'>,
  nowMs: number = Date.now()
): boolean {
  if (cart.status !== 'ACTIVE' && cart.status !== 'ABANDONED') return false;
  const expiresMs = Date.parse(cart.expiresAt);
  if (!Number.isFinite(expiresMs)) return false;
  return nowMs >= expiresMs;
}

/**
 * Evaluates whether a recovery reminder email can be dispatched for an abandoned cart.
 */
export function shouldSendRecoveryReminder(
  cart: Pick<AbandonedCart, 'status' | 'customerEmail' | 'items' | 'reminderCount' | 'lastReminderSentAt'>,
  nowMs: number = Date.now(),
  cooldownMs: number = DEFAULT_REMINDER_COOLDOWN_MS,
  maxReminders: number = DEFAULT_MAX_REMINDERS
): boolean {
  if (cart.status !== 'ABANDONED') return false;
  if (!cart.customerEmail || !cart.customerEmail.includes('@')) return false;
  if (!cart.items || cart.items.length === 0) return false;
  if (cart.reminderCount >= maxReminders) return false;

  if (cart.lastReminderSentAt) {
    const lastSentMs = Date.parse(cart.lastReminderSentAt);
    if (Number.isFinite(lastSentMs) && nowMs - lastSentMs < cooldownMs) {
      return false;
    }
  }

  return true;
}

/**
 * Principle 5 (IDOR protection): Verifies whether a requester owns the abandoned cart.
 * Matches verified customerId, verified email, or the matching browser sessionId.
 */
export function verifyAbandonedCartOwnership(
  cart: Pick<AbandonedCart, 'customerId' | 'customerEmail' | 'sessionId'>,
  requester: {
    authenticatedCustomerId?: string;
    authenticatedEmail?: string;
    sessionId?: string;
  }
): boolean {
  if (
    requester.authenticatedCustomerId &&
    cart.customerId &&
    requester.authenticatedCustomerId === cart.customerId
  ) {
    return true;
  }

  if (
    requester.authenticatedEmail &&
    cart.customerEmail &&
    requester.authenticatedEmail.trim().toLowerCase() === cart.customerEmail.trim().toLowerCase()
  ) {
    return true;
  }

  if (
    requester.sessionId &&
    cart.sessionId &&
    requester.sessionId.trim() !== '' &&
    requester.sessionId.trim() === cart.sessionId.trim()
  ) {
    return true;
  }

  return false;
}
