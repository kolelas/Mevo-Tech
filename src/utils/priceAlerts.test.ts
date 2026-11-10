import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePriceAlertEmail,
  calculateTargetPriceCents,
  shouldTriggerPriceAlert,
  calculatePriceDropMetrics,
} from './priceAlerts';

test('validatePriceAlertEmail: accurately verifies standard email formats', () => {
  assert.equal(validatePriceAlertEmail('shopper@gmail.com'), true);
  assert.equal(validatePriceAlertEmail('john.doe@techcorp.co.za'), true);
  assert.equal(validatePriceAlertEmail('buyer+alerts@sub.domain.org'), true);

  // Invalid formats
  assert.equal(validatePriceAlertEmail(''), false);
  assert.equal(validatePriceAlertEmail('invalid-email'), false);
  assert.equal(validatePriceAlertEmail('@no-user.com'), false);
  assert.equal(validatePriceAlertEmail('spaces in@email.com'), false);
  assert.equal(validatePriceAlertEmail('no-domain@'), false);
});

test('calculateTargetPriceCents: calculates threshold targets correctly', () => {
  const currentPrice = 3499900; // R 34,999.00

  // Any drop: 1 cent below current
  const anyTarget = calculateTargetPriceCents(currentPrice, 'any');
  assert.equal(anyTarget, 3499899);

  // 10% discount target
  const tenPercentTarget = calculateTargetPriceCents(currentPrice, '10_percent');
  assert.equal(tenPercentTarget, Math.round(3499900 * 0.9)); // 3149910

  // 20% discount target
  const twentyPercentTarget = calculateTargetPriceCents(currentPrice, '20_percent');
  assert.equal(twentyPercentTarget, Math.round(3499900 * 0.8)); // 2799920

  // Custom target price
  const customTarget = calculateTargetPriceCents(currentPrice, 'custom', 2999900);
  assert.equal(customTarget, 2999900);
});

test('shouldTriggerPriceAlert: evaluates whether a drop triggers an automated notification', () => {
  const baselinePrice = 3499900; // R 34,999.00

  // Price increases or remains same -> should NOT trigger
  assert.equal(shouldTriggerPriceAlert(baselinePrice, 3499900), false);
  assert.equal(shouldTriggerPriceAlert(baselinePrice, 3899900), false);

  // Baseline price drops by R500 with 'any' drop target -> SHOULD trigger
  assert.equal(shouldTriggerPriceAlert(baselinePrice, 3449900), true);

  // Specific 10% threshold: R 31,499.10
  const tenPercentThreshold = 3149910;
  // A small drop to R 33,000 does not hit the 10% target
  assert.equal(shouldTriggerPriceAlert(baselinePrice, 3300000, tenPercentThreshold), false);
  // A drop to R 30,000 DOES hit the 10% target
  assert.equal(shouldTriggerPriceAlert(baselinePrice, 3000000, tenPercentThreshold), true);
  // Exactly matching the target price triggers
  assert.equal(shouldTriggerPriceAlert(baselinePrice, tenPercentThreshold, tenPercentThreshold), true);
});

test('calculatePriceDropMetrics: calculates savings amount and percent off', () => {
  const initial = 100000; // R 1,000.00
  const dropped = 80000; // R 800.00

  const metrics = calculatePriceDropMetrics(initial, dropped);
  assert.equal(metrics.isDrop, true);
  assert.equal(metrics.dropCents, 20000); // R 200.00
  assert.equal(metrics.percentOff, 20);

  // Price increase
  const higher = 120000;
  const noDropMetrics = calculatePriceDropMetrics(initial, higher);
  assert.equal(noDropMetrics.isDrop, false);
  assert.equal(noDropMetrics.dropCents, 0);
  assert.equal(noDropMetrics.percentOff, 0);
});
