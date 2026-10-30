import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatZAR,
  calculateIncludedVAT,
  calculatePayflexInstalments,
  validateStockAvailability,
  calculateCartTotals,
  canTransitionOrderStatus,
  verifyPaymentAmount,
  generateOrderReference,
  isPromotionalBannerActive,
} from './calculations';

test('formatZAR formats South African Rand from integer cents correctly', () => {
  assert.equal(formatZAR(0), 'R 0.00');
  assert.equal(formatZAR(100), 'R 1.00');
  assert.equal(formatZAR(1499900), 'R 14,999.00');
  assert.equal(formatZAR(2599), 'R 25.99');
  assert.equal(formatZAR(12500000), 'R 125,000.00');
});

test('calculateIncludedVAT correctly derives 15% South African VAT', () => {
  // R1,150.00 (115000 cents) includes R150.00 (15000 cents) VAT
  const vat = calculateIncludedVAT(115000, 15);
  assert.equal(vat, 15000);

  // R0 has 0 VAT
  assert.equal(calculateIncludedVAT(0), 0);
});

test('calculatePayflexInstalments splits amount into 4 equal payments', () => {
  const result = calculatePayflexInstalments(400000); // R4,000.00
  assert.equal(result.count, 4);
  assert.equal(result.instalmentCents, 100000); // R1,000.00 each

  // Odd amount rounds up safely to prevent underpayment
  const odd = calculatePayflexInstalments(100001);
  assert.equal(odd.instalmentCents, 25001);
});

test('validateStockAvailability checks onHand and reservations', () => {
  // 10 on hand, 3 reserved -> 7 available
  const check1 = validateStockAvailability({ onHand: 10, reserved: 3, requestedQuantity: 5 });
  assert.equal(check1.availableStock, 7);
  assert.equal(check1.canFulfill, true);

  const check2 = validateStockAvailability({ onHand: 10, reserved: 3, requestedQuantity: 8 });
  assert.equal(check2.availableStock, 7);
  assert.equal(check2.canFulfill, false);

  // Zero quantity is invalid
  const check3 = validateStockAvailability({ onHand: 10, reserved: 0, requestedQuantity: 0 });
  assert.equal(check3.canFulfill, false);
});

test('calculateCartTotals calculates subtotal, discounts, shipping and 15% VAT', () => {
  const items = [
    { priceCents: 100000, quantity: 2 }, // R2,000.00 (above R1,500 free shipping)
  ];

  const standardShipping = {
    id: 'standard',
    name: 'Standard Door Courier',
    description: 'Courier Guy / Fastway',
    priceCents: 15000,
    estimatedDelivery: '2-4 business days',
  };

  const totals = calculateCartTotals({
    items,
    shippingMethod: standardShipping,
  });

  assert.equal(totals.subtotalCents, 200000);
  assert.equal(totals.shippingCents, 0); // Free shipping threshold met
  assert.equal(totals.totalCents, 200000);
  assert.equal(totals.taxCents, calculateIncludedVAT(200000, 15));

  // Test discount code 10%
  const totalsWithDiscount = calculateCartTotals({
    items,
    shippingMethod: standardShipping,
    discount: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrderCents: 50000,
      description: '10% off',
      isActive: true,
    },
  });

  assert.equal(totalsWithDiscount.discountCents, 20000); // R200.00
  assert.equal(totalsWithDiscount.totalCents, 180000); // R1,800.00
});

test('canTransitionOrderStatus strictly enforces valid state transitions', () => {
  assert.equal(canTransitionOrderStatus('PENDING_PAYMENT', 'PAID'), true);
  assert.equal(canTransitionOrderStatus('PENDING_PAYMENT', 'PAYMENT_FAILED'), true);
  assert.equal(canTransitionOrderStatus('PAID', 'PROCESSING'), true);
  assert.equal(canTransitionOrderStatus('PROCESSING', 'SHIPPED'), true);
  assert.equal(canTransitionOrderStatus('SHIPPED', 'DELIVERED'), true);

  // Invalid jumps
  assert.equal(canTransitionOrderStatus('PENDING_PAYMENT', 'SHIPPED'), false);
  assert.equal(canTransitionOrderStatus('CANCELLED', 'PAID'), false);
  assert.equal(canTransitionOrderStatus('REFUNDED', 'SHIPPED'), false);
});

test('verifyPaymentAmount checks expected vs received amount', () => {
  assert.equal(verifyPaymentAmount({ expectedCents: 50000, receivedCents: 50000 }).isValid, true);
  assert.equal(verifyPaymentAmount({ expectedCents: 50000, receivedCents: 49900 }).isValid, false);
});

test('generateOrderReference creates compliant format', () => {
  const ref = generateOrderReference();
  assert.match(ref, /^MEV-\d{4}-\d{5}$/);
});

test('isPromotionalBannerActive checks active status and future expiration', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  // Active banner in future
  assert.equal(isPromotionalBannerActive({ isActive: true, endsAt: future }), true);

  // Inactive flag overrides future date
  assert.equal(isPromotionalBannerActive({ isActive: false, endsAt: future }), false);

  // Past banner is expired
  assert.equal(isPromotionalBannerActive({ isActive: true, endsAt: past }), false);

  // Active banner with no end date is valid indefinitely
  assert.equal(isPromotionalBannerActive({ isActive: true }), true);
});
