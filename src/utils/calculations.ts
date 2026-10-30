import { CartItem, OrderStatus, ShippingMethod, CouponDiscount } from '../types';

/**
 * Formats South African Rand monetary amount from integer cents.
 * e.g. 1499900 -> "R 14,999.00"
 */
export function formatZAR(cents: number): string {
  if (isNaN(cents) || cents === null || cents === undefined) {
    return 'R 0.00';
  }
  const isNegative = cents < 0;
  const absCents = Math.abs(Math.round(cents));
  const rands = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;

  // Format with thousand separators
  const formattedRands = rands.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedCents = remainingCents.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}R ${formattedRands}.${formattedCents}`;
}

/**
 * Calculates South African standard VAT (15%).
 * In South Africa, retail prices are VAT-inclusive by default.
 * Tax amount component of VAT-inclusive price = price - (price / 1.15)
 */
export function calculateIncludedVAT(cents: number, vatRatePercent: number = 15): number {
  if (cents <= 0) return 0;
  const divisor = 1 + vatRatePercent / 100;
  const exVat = Math.round(cents / divisor);
  return cents - exVat;
}

/**
 * Computes Payflex 4 equal instalments from total cents.
 */
export function calculatePayflexInstalments(totalCents: number): {
  instalmentCents: number;
  totalCents: number;
  count: number;
} {
  const instalment = Math.ceil(totalCents / 4);
  return {
    instalmentCents: instalment,
    totalCents,
    count: 4,
  };
}

/**
 * Verifies if requested quantity can be fulfilled based on on-hand and active reservations.
 */
export function validateStockAvailability(params: {
  onHand: number;
  reserved: number;
  requestedQuantity: number;
}): { canFulfill: boolean; availableStock: number } {
  const availableStock = Math.max(0, params.onHand - params.reserved);
  return {
    canFulfill: params.requestedQuantity > 0 && params.requestedQuantity <= availableStock,
    availableStock,
  };
}

/**
 * Computes cart subtotal, discount, shipping, tax, and grand total in integer cents.
 */
export function calculateCartTotals(params: {
  items: Array<{ priceCents: number; quantity: number }>;
  discount?: CouponDiscount | null;
  shippingMethod?: ShippingMethod | null;
  freeShippingThresholdCents?: number;
}): {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
} {
  const subtotalCents = params.items.reduce(
    (acc, item) => acc + Math.max(0, Math.round(item.priceCents)) * Math.max(0, item.quantity),
    0
  );

  let discountCents = 0;
  if (params.discount && params.discount.isActive) {
    if (subtotalCents >= params.discount.minOrderCents) {
      if (params.discount.type === 'PERCENTAGE') {
        discountCents = Math.round((subtotalCents * params.discount.value) / 100);
      } else {
        discountCents = Math.min(subtotalCents, params.discount.value);
      }
    }
  }

  const freeShippingThreshold = params.freeShippingThresholdCents ?? 150000; // R1,500
  let shippingCents = params.shippingMethod ? params.shippingMethod.priceCents : 15000;

  // Free shipping threshold applied
  if (subtotalCents >= freeShippingThreshold && params.shippingMethod?.id !== 'express') {
    shippingCents = 0;
  }

  const taxableTotal = Math.max(0, subtotalCents - discountCents + shippingCents);
  const taxCents = calculateIncludedVAT(taxableTotal, 15);

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: taxableTotal,
  };
}

/**
 * Valid order status transitions to guarantee state machine integrity.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PAYMENT_EXPIRED', 'CANCELLED'],
  PAID: ['PROCESSING', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED', 'FULFILMENT_ON_HOLD'],
  PROCESSING: ['SHIPPED', 'FULFILMENT_ON_HOLD', 'REFUND_PENDING', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED'],
  DELIVERED: ['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAYMENT_CANCELLED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAYMENT_EXPIRED: ['PENDING_PAYMENT', 'CANCELLED'],
  REFUND_PENDING: ['REFUNDED', 'PARTIALLY_REFUNDED', 'PAID'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
  FULFILMENT_ON_HOLD: ['PROCESSING', 'CANCELLED', 'REFUND_PENDING'],
  CANCELLED: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Verifies payment amount received from webhook against expected order amount.
 */
export function verifyPaymentAmount(params: {
  expectedCents: number;
  receivedCents: number;
  toleranceCents?: number;
}): { isValid: boolean; differenceCents: number } {
  const tolerance = params.toleranceCents ?? 0;
  const differenceCents = Math.abs(params.expectedCents - params.receivedCents);
  return {
    isValid: differenceCents <= tolerance,
    differenceCents,
  };
}

/**
 * Generates an authoritative South African order reference.
 * format: MEV-YYYY-XXXXX
 */
export function generateOrderReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `MEV-${year}-${random}`;
}

/**
 * Validates whether a promotional banner or flash deal is currently active based on status and expiry.
 */
export function isPromotionalBannerActive(
  banner: { isActive: boolean; endsAt?: string },
  referenceTime: Date = new Date()
): boolean {
  if (!banner.isActive) return false;
  if (!banner.endsAt) return true;
  const expiry = new Date(banner.endsAt);
  return expiry.getTime() > referenceTime.getTime();
}
