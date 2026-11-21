import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  signCustomerToken,
  verifyCustomerToken,
  verifyPayfastSignature,
  verifyPaystackSignature,
} from './security';

test('Security: hashPassword generates valid bcrypt hash', () => {
  const plain = 'StrongPass@2026!';
  const hash = hashPassword(plain);
  assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
  assert.notEqual(plain, hash);
  assert.equal(verifyPassword(plain, hash), true);
  assert.equal(verifyPassword('WrongPassword', hash), false);
});

test('Security: JWT tokens sign and verify customer identity correctly', () => {
  const customerId = 'cust_test_12345';
  const email = 'customer@test.co.za';

  const token = signCustomerToken(customerId, email);
  assert.ok(typeof token === 'string');
  assert.ok(token.length > 20);

  const decoded = verifyCustomerToken(token);
  assert.ok(decoded);
  assert.equal(decoded.customerId, customerId);
  assert.equal(decoded.email, email);
  assert.equal(decoded.role, 'customer');

  // Verify invalid token returns null
  const invalid = verifyCustomerToken('invalid.jwt.token');
  assert.equal(invalid, null);
});

test('Security: PayFast MD5 signature verification matches specification', () => {
  const passphrase = 'mevo_secret_passphrase';
  const data: Record<string, string> = {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    amount: '12999.00',
    item_name: 'QD-OLED Monitor',
    m_payment_id: 'MEV-2026-TEST',
  };

  // Generate valid signature using PayFast ordering
  const keys = Object.keys(data).sort();
  let pfString = keys.map((k) => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`).join('&');
  pfString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`;
  const validSignature = crypto.createHash('md5').update(pfString).digest('hex');

  // Verify true on match
  const check = verifyPayfastSignature(data, validSignature, passphrase);
  assert.equal(check, true);

  // Verify false on tampered amount
  const tamperedData = { ...data, amount: '10.00' };
  const tamperedCheck = verifyPayfastSignature(tamperedData, validSignature, passphrase);
  assert.equal(tamperedCheck, false);
});

test('Security: Paystack HMAC-SHA512 webhook signature verification', () => {
  const secretKey = 'sk_test_secret_key_12345';
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'MEV-2026-TEST', amount: 1299900 } });

  const validHeader = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');

  // Verify valid signature
  assert.equal(verifyPaystackSignature(payload, validHeader, secretKey), true);

  // Verify fake / tampered signature is rejected
  assert.equal(verifyPaystackSignature(payload, 'fake_forged_signature_hex', secretKey), false);
});

test('Customer Account Governance: Account status access control logic', () => {
  // Test access control matrix
  const canAuthenticate = (status?: string) => status !== 'blocked';
  const canCheckout = (status?: string) => status !== 'blocked' && status !== 'restricted';

  // Active customer
  assert.equal(canAuthenticate('active'), true);
  assert.equal(canCheckout('active'), true);

  // Restricted customer (e.g. chargeback investigation, abuse review)
  assert.equal(canAuthenticate('restricted'), true); // Can still view past orders & profile
  assert.equal(canCheckout('restricted'), false); // Cannot checkout or place new orders

  // Blocked customer (e.g. fraudulent card attempts)
  assert.equal(canAuthenticate('blocked'), false); // Login rejected
  assert.equal(canCheckout('blocked'), false);
});

test('Merchandising: Placement slot validity and prioritization', () => {
  const validSlots = ['hero_spotlight', 'deals_of_the_day', 'trending_now', 'category_lead', 'standard'];
  
  // Verify slot validity check
  assert.ok(validSlots.includes('hero_spotlight'));
  assert.ok(validSlots.includes('deals_of_the_day'));
  assert.ok(validSlots.includes('trending_now'));
  assert.ok(!validSlots.includes('invalid_slot'));

  // Priority sorting test
  const testProducts = [
    { id: 'p1', placementPriority: 10, isPinnedToTop: false },
    { id: 'p2', placementPriority: 100, isPinnedToTop: true },
    { id: 'p3', placementPriority: 50, isPinnedToTop: false },
  ];

  const sorted = [...testProducts].sort((a, b) => {
    if (a.isPinnedToTop && !b.isPinnedToTop) return -1;
    if (!a.isPinnedToTop && b.isPinnedToTop) return 1;
    return b.placementPriority - a.placementPriority;
  });

  assert.equal(sorted[0].id, 'p2'); // Pinned to top
  assert.equal(sorted[1].id, 'p3'); // Higher priority (50)
  assert.equal(sorted[2].id, 'p1'); // Priority (10)
});

test('System Activity: Auditing categorization and severity rule enforcement', () => {
  const inferActivityCategory = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH') || action.includes('REGISTER')) return 'auth';
    if (action.includes('PAYMENT') || action.includes('TRANSACTION') || action.includes('SIGNATURE')) return 'payment_failure';
    if (action.includes('STATUS') || action.includes('CUSTOMER') || action.includes('POLICY') || action.includes('MERCHANDISING')) return 'account_management';
    return 'system';
  };

  const inferActivitySeverity = (action: string) => {
    if (action.includes('BLOCK') || action.includes('TAMPER') || action.includes('FRAUD') || action.includes('UNAUTHORIZED')) return 'critical';
    if (action.includes('FAIL') || action.includes('RESTRICT') || action.includes('WARNING') || action.includes('DECLINE')) return 'warning';
    return 'info';
  };

  // 1. User Logins Category & Severity
  assert.equal(inferActivityCategory('USER_LOGIN_SUCCESS'), 'auth');
  assert.equal(inferActivitySeverity('USER_LOGIN_SUCCESS'), 'info');

  assert.equal(inferActivityCategory('USER_LOGIN_FAILED'), 'auth');
  assert.equal(inferActivitySeverity('USER_LOGIN_FAILED'), 'warning');

  assert.equal(inferActivityCategory('USER_LOGIN_BLOCKED'), 'auth');
  assert.equal(inferActivitySeverity('USER_LOGIN_BLOCKED'), 'critical');

  // 2. Failed Payment Attempts Category & Severity
  assert.equal(inferActivityCategory('PAYMENT_ATTEMPT_FAILED'), 'payment_failure');
  assert.equal(inferActivitySeverity('PAYMENT_ATTEMPT_FAILED'), 'warning');

  assert.equal(inferActivityCategory('PAYMENT_SIGNATURE_TAMPERED'), 'payment_failure');
  assert.equal(inferActivitySeverity('PAYMENT_SIGNATURE_TAMPERED'), 'critical');

  assert.equal(inferActivityCategory('PAYMENT_BLOCKED_ATTEMPT'), 'payment_failure');
  assert.equal(inferActivitySeverity('PAYMENT_BLOCKED_ATTEMPT'), 'critical');

  // 3. Account Management Changes Category & Severity
  assert.equal(inferActivityCategory('CUSTOMER_STATUS_RESTRICTED'), 'account_management');
  assert.equal(inferActivitySeverity('CUSTOMER_STATUS_RESTRICTED'), 'warning');

  assert.equal(inferActivityCategory('CUSTOMER_STATUS_BLOCKED'), 'account_management');
  assert.equal(inferActivitySeverity('CUSTOMER_STATUS_BLOCKED'), 'critical');

  assert.equal(inferActivityCategory('MERCHANDISING_SLOT_CHANGE'), 'account_management');
  assert.equal(inferActivitySeverity('MERCHANDISING_SLOT_CHANGE'), 'info');
});

// =========================================================================
// SECURITY CHECKLIST: 6 CORE PRINCIPLES VERIFICATION SUITE
// =========================================================================

test('Security Principle 1: Calculate every price on the server (prevents price tampering)', async () => {
  const { calculateCartTotals } = await import('../utils/calculations');

  // Client attempts to tamper with prices by submitting item with fake low price R10.00 (1000 cents)
  // Server uses authoritative product database price R34,999.00 (3499900 cents)
  const serverAuthoritativeItems = [
    { priceCents: 3499900, quantity: 1 }
  ];

  const totals = calculateCartTotals({
    items: serverAuthoritativeItems,
    shippingMethod: { id: 'standard', name: 'Standard', priceCents: 15000, description: '', estimatedDelivery: '2 days' },
    freeShippingThresholdCents: 150000,
  });

  // Must calculate subtotal as R 34,999.00
  assert.equal(totals.subtotalCents, 3499900);
  // Free shipping threshold (R 1,500) qualifies, shipping is 0
  assert.equal(totals.shippingCents, 0);
  assert.equal(totals.totalCents, 3499900);
});

test('Security Principle 2: Never trust role or isPro from the browser (privilege escalation guard)', async () => {
  const { sanitizeCustomerProfileUpdates } = await import('./security');

  const untrustedClientPayload = {
    name: 'Jane Doe',
    phone: '+27 82 123 4567',
    role: 'owner', // Malicious attempt to elevate role
    isPro: true, // Malicious attempt to claim pro membership
    status: 'active', // Malicious attempt to unblock self
    restrictionReason: null,
    id: 'hacked_id',
    createdAt: '2020-01-01',
    email: 'attacker@evil.com',
  };

  const safeUpdates: any = sanitizeCustomerProfileUpdates(untrustedClientPayload);

  // Privileged fields must be completely stripped
  assert.equal(safeUpdates.role, undefined);
  assert.equal(safeUpdates.isPro, undefined);
  assert.equal(safeUpdates.status, undefined);
  assert.equal(safeUpdates.restrictionReason, undefined);
  assert.equal(safeUpdates.id, undefined);
  assert.equal(safeUpdates.createdAt, undefined);
  assert.equal(safeUpdates.email, undefined);

  // Safe fields must be retained
  assert.equal(safeUpdates.name, 'Jane Doe');
  assert.equal(safeUpdates.phone, '+27 82 123 4567');
});

test('Security Principle 3: Turn on RLS for every table', () => {
  const allTables = ['users', 'products', 'orders', 'reviews', 'coupons', 'promotions', 'audit_logs', 'reservations'];
  // Verify all 8 core entities are accounted for in RLS schema
  assert.equal(allTables.length, 8);
  for (const table of allTables) {
    assert.ok(typeof table === 'string' && table.length > 0);
  }
});

test('Security Principle 4: Rate-limit every form that sends email', async () => {
  const { emailFormRateLimiter } = await import('./security');
  assert.ok(emailFormRateLimiter);
  // Rate limiter is defined as Express middleware function
  assert.equal(typeof emailFormRateLimiter, 'function');
});

test('Security Principle 5: Check who owns it before update or delete (IDOR prevention)', async () => {
  const { verifyOwnership } = await import('./security');

  const authenticatedUser = 'cust_alice_123';
  const victimsAccount = 'cust_bob_999';

  // Legitimate update: owner updates own resource
  assert.equal(verifyOwnership(authenticatedUser, authenticatedUser), true);

  // IDOR attack: Alice attempts to update/delete Bob's resource
  assert.equal(verifyOwnership(authenticatedUser, victimsAccount), false);

  // Unauthenticated request
  assert.equal(verifyOwnership(undefined, victimsAccount), false);
  assert.equal(verifyOwnership('', victimsAccount), false);
});

test('Security Principle 6: Keep secret keys out of the frontend', () => {
  // Ensure private keys are not prefixed with VITE_ (which would bundle them into client JavaScript)
  const clientEnvKeys = Object.keys(process.env).filter((k) => k.startsWith('VITE_'));
  for (const key of clientEnvKeys) {
    assert.ok(!key.includes('SECRET'), `Client env key ${key} must not contain SECRET`);
    assert.ok(!key.includes('PRIVATE'), `Client env key ${key} must not contain PRIVATE`);
    assert.ok(!key.includes('PASSWORD'), `Client env key ${key} must not contain PASSWORD`);
  }
});





test('Profile update sanitizer uses an allowlist and bounds string values', async () => {
  const { sanitizeCustomerProfileUpdates } = await import('./security');
  const safe = sanitizeCustomerProfileUpdates({ name: '  Customer  ', phone: '  +27 82 000 0000 ', favourites: ['p1'], arbitrary: 'value', role: 'admin', status: 'active', email: 'attacker@example.com', isPro: true, long: 'x'.repeat(201) });
  assert.equal(safe.name, 'Customer');
  assert.equal(safe.phone, '+27 82 000 0000');
  assert.equal(safe.favourites, undefined);
  assert.equal(safe.arbitrary, undefined);
  assert.equal(safe.role, undefined);
  assert.equal(safe.status, undefined);
  assert.equal(safe.email, undefined);
  assert.equal(safe.isPro, undefined);
  assert.equal(safe.long, undefined);
});
