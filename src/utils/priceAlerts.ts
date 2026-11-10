import { PriceAlertTargetType } from '../types';

/**
 * Validates whether an email string meets standard RFC syntax requirements.
 */
export function validatePriceAlertEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Standard RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Derives the target price in integer cents according to the selected alert threshold strategy.
 */
export function calculateTargetPriceCents(
  currentPriceCents: number,
  targetType: PriceAlertTargetType,
  customPriceCents?: number
): number {
  if (currentPriceCents <= 0) return 0;

  switch (targetType) {
    case '10_percent':
      // 10% below current price
      return Math.round(currentPriceCents * 0.9);
    case '20_percent':
      // 20% below current price
      return Math.round(currentPriceCents * 0.8);
    case 'custom':
      if (typeof customPriceCents === 'number' && customPriceCents > 0) {
        return Math.min(customPriceCents, currentPriceCents - 100);
      }
      return currentPriceCents - 100;
    case 'any':
    default:
      // Any decrease: 1 cent or R1 below current price
      return currentPriceCents - 1;
  }
}

/**
 * Evaluates whether a new updated price should trigger an automated notification.
 */
export function shouldTriggerPriceAlert(
  initialPriceCents: number,
  newPriceCents: number,
  targetPriceCents?: number
): boolean {
  if (newPriceCents <= 0 || initialPriceCents <= 0) return false;

  // The price MUST be strictly lower than the initial baseline price
  if (newPriceCents >= initialPriceCents) return false;

  // If a specific target price threshold was defined, price must be <= targetPriceCents
  if (typeof targetPriceCents === 'number' && targetPriceCents > 0) {
    return newPriceCents <= targetPriceCents;
  }

  // Any drop trigger
  return true;
}

/**
 * Computes savings metrics when an item drops in price.
 */
export function calculatePriceDropMetrics(
  initialPriceCents: number,
  newPriceCents: number
): {
  dropCents: number;
  percentOff: number;
  isDrop: boolean;
} {
  if (newPriceCents >= initialPriceCents) {
    return {
      dropCents: 0,
      percentOff: 0,
      isDrop: false,
    };
  }

  const dropCents = initialPriceCents - newPriceCents;
  const percentOff = Math.round((dropCents / initialPriceCents) * 100);

  return {
    dropCents,
    percentOff,
    isDrop: true,
  };
}
