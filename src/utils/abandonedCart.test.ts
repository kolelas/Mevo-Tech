import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ABANDONMENT_THRESHOLD_MS,
  DEFAULT_MAX_REMINDERS,
  DEFAULT_REMINDER_COOLDOWN_MS,
  evaluateAbandonedCartTotals,
  isCartEligibleForAbandonment,
  isCartExpired,
  sanitizeCartSyncItems,
  shouldSendRecoveryReminder,
  suggestRecoveryIncentiveCode,
  verifyAbandonedCartOwnership,
} from './abandonedCart';
import { db } from '../server/db';
import { Order } from '../types';

describe('Abandoned Cart Pure Domain Helpers', () => {
  it('sanitizes untrusted cart sync items, clamps quantities, and merges duplicates', () => {
    const sanitized = sanitizeCartSyncItems([
      null,
      { productId: '', quantity: 2 },
      { productId: 'prod_studiobook_16', quantity: -3 },
      { productId: 'prod_studiobook_16', variantId: 'var_a', quantity: 2 },
      { productId: ' prod_studiobook_16 ', variantId: 'var_a', quantity: 3 },
      { productId: 'prod_aurora_wifi7_router', quantity: 999 },
    ]);

    assert.equal(sanitized.length, 2);
    assert.deepEqual(sanitized[0], {
      productId: 'prod_studiobook_16',
      variantId: 'var_a',
      quantity: 5,
    });
    assert.deepEqual(sanitized[1], {
      productId: 'prod_aurora_wifi7_router',
      variantId: undefined,
      quantity: 50,
    });
  });

  it('evaluates abandoned cart ZAR integer-cent totals accurately with coupon discounts', () => {
    const res = evaluateAbandonedCartTotals({
      items: [
        {
          productId: 'prod_keychron_pro',
          sku: 'MEV-KB-NOVAPRO',
          name: 'Nova Pro Keyboard',
          brand: 'Nova Gear',
          image: '/img.jpg',
          unitPriceCents: 329900,
          quantity: 1,
          lineTotalCents: 329900,
          availableStock: 10,
        },
      ],
      coupon: {
        code: 'MEVO150',
        type: 'FIXED_CENTS',
        value: 15000,
        minOrderCents: 150000,
        isActive: true,
        description: 'R150 off',
      },
      freeShippingThresholdCents: 150000,
    });

    assert.equal(res.itemCount, 1);
    assert.equal(res.subtotalCents, 329900);
    assert.equal(res.discountCents, 15000);
    // Free shipping unlocked over R1,500 => 329900 - 15000 = 314900
    assert.equal(res.estimatedTotalCents, 314900);
  });

  it('suggests tiered recovery incentive codes based on subtotal', () => {
    assert.equal(suggestRecoveryIncentiveCode(50000), undefined);
    assert.equal(suggestRecoveryIncentiveCode(100000), 'MEVOSPRING');
    assert.equal(suggestRecoveryIncentiveCode(150000), 'MEVO150');
    assert.equal(suggestRecoveryIncentiveCode(350000), 'MEVOSUPER');
  });

  it('detects abandonment eligibility and 30-day expiry boundaries cleanly', () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const recentIso = new Date(now - 5 * 60 * 1000).toISOString();
    const staleIso = new Date(now - DEFAULT_ABANDONMENT_THRESHOLD_MS - 1000).toISOString();

    const dummyItem = {
      productId: 'p1',
      sku: 's1',
      name: 'Item',
      brand: 'Mevo',
      image: '/x.jpg',
      unitPriceCents: 100000,
      quantity: 1,
      lineTotalCents: 100000,
      availableStock: 5,
    };

    assert.equal(
      isCartEligibleForAbandonment({ status: 'ACTIVE', items: [dummyItem], lastActivityAt: recentIso }, now),
      false
    );
    assert.equal(
      isCartEligibleForAbandonment({ status: 'ACTIVE', items: [dummyItem], lastActivityAt: staleIso }, now),
      true
    );
    assert.equal(
      isCartEligibleForAbandonment({ status: 'ACTIVE', items: [], lastActivityAt: staleIso }, now),
      false
    );

    assert.equal(
      isCartExpired({ status: 'ABANDONED', expiresAt: new Date(now - 1000).toISOString() }, now),
      true
    );
    assert.equal(
      isCartExpired({ status: 'RECOVERED', expiresAt: new Date(now - 1000).toISOString() }, now),
      false
    );
  });

  it('enforces reminder email cooldown and max reminder limits', () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const dummyItem = {
      productId: 'p1',
      sku: 's1',
      name: 'Item',
      brand: 'Mevo',
      image: '/x.jpg',
      unitPriceCents: 100000,
      quantity: 1,
      lineTotalCents: 100000,
      availableStock: 5,
    };

    assert.equal(
      shouldSendRecoveryReminder(
        {
          status: 'ABANDONED',
          customerEmail: 'buyer@mevotech.co.za',
          items: [dummyItem],
          reminderCount: 0,
        },
        now
      ),
      true
    );

    // Within 60-minute cooldown window
    assert.equal(
      shouldSendRecoveryReminder(
        {
          status: 'ABANDONED',
          customerEmail: 'buyer@mevotech.co.za',
          items: [dummyItem],
          reminderCount: 1,
          lastReminderSentAt: new Date(now - DEFAULT_REMINDER_COOLDOWN_MS + 5000).toISOString(),
        },
        now
      ),
      false
    );

    // Cooldown elapsed
    assert.equal(
      shouldSendRecoveryReminder(
        {
          status: 'ABANDONED',
          customerEmail: 'buyer@mevotech.co.za',
          items: [dummyItem],
          reminderCount: 1,
          lastReminderSentAt: new Date(now - DEFAULT_REMINDER_COOLDOWN_MS - 1000).toISOString(),
        },
        now
      ),
      true
    );

    // Max cap reached
    assert.equal(
      shouldSendRecoveryReminder(
        {
          status: 'ABANDONED',
          customerEmail: 'buyer@mevotech.co.za',
          items: [dummyItem],
          reminderCount: DEFAULT_MAX_REMINDERS,
          lastReminderSentAt: new Date(now - 10 * DEFAULT_REMINDER_COOLDOWN_MS).toISOString(),
        },
        now
      ),
      false
    );
  });

  it('verifies ownership across customerId, email (case-insensitive), and sessionId', () => {
    const cart = {
      customerId: 'cust_123',
      customerEmail: 'Buyer@Example.com',
      sessionId: 'sess_abc',
    };

    assert.equal(verifyAbandonedCartOwnership(cart, { authenticatedCustomerId: 'cust_123' }), true);
    assert.equal(verifyAbandonedCartOwnership(cart, { authenticatedEmail: 'buyer@example.com' }), true);
    assert.equal(verifyAbandonedCartOwnership(cart, { sessionId: 'sess_abc' }), true);
    assert.equal(verifyAbandonedCartOwnership(cart, { authenticatedCustomerId: 'other', sessionId: 'other_sess' }), false);
  });
});

describe('Database Abandoned Cart Lifecycle Engine', () => {
  it('syncs active cart with server-authoritative pricing, handles empty clear, and re-activates abandoned cart', () => {
    const sessionId = `test_sess_sync_${Date.now()}`;
    const baseMs = Date.now() - 30 * 60 * 1000;

    // 1. Sync product (price comes strictly from catalog DB, not client)
    const synced = db.syncCartSession({
      sessionId,
      items: [{ productId: 'prod_keychron_pro', quantity: 2 }],
      discountCode: 'MEVO150',
      customerId: 'cust_shopper_demo',
      nowMs: baseMs,
    });

    assert.equal(synced.success, true);
    assert.ok(synced.cart);
    assert.equal(synced.cart.status, 'ACTIVE');
    assert.equal(synced.cart.subtotalCents, 329900 * 2);
    assert.equal(synced.cart.discountCents, 15000);
    assert.equal(synced.cart.customerEmail, 'shopper@mevotech.co.za');

    // 2. Sweep inactivity after 20 minutes => transitions to ABANDONED & queues reminder #1
    const sweepResult = db.sweepAbandonedCarts(15 * 60 * 1000, baseMs + 20 * 60 * 1000);
    assert.ok(sweepResult.abandonedCount >= 1);

    const afterSweep = db.getAbandonedCartById(synced.cart.id)!;
    assert.equal(afterSweep.status, 'ABANDONED');
    assert.equal(afterSweep.reminderCount, 1);

    // 3. Returning to cart syncs item updates and re-activates cart to ACTIVE
    const reactivated = db.syncCartSession({
      sessionId,
      items: [{ productId: 'prod_keychron_pro', quantity: 1 }],
      customerId: 'cust_shopper_demo',
      nowMs: baseMs + 25 * 60 * 1000,
    });
    assert.equal(reactivated.cart?.status, 'ACTIVE');
    assert.equal(reactivated.cart?.itemCount, 1);

    // 4. Clearing active cart removes it cleanly
    const cleared = db.syncCartSession({
      sessionId,
      items: [],
      nowMs: baseMs + 26 * 60 * 1000,
    });
    assert.equal(cleared.cart, null);
    assert.equal(db.getAbandonedCartById(synced.cart.id), undefined);
  });

  it('captures checkout exit abandonment, validates recovery token, enforces reminder limits/IDOR, and recovers on order creation', () => {
    const sessionId = `test_sess_recover_${Date.now()}`;
    const baseMs = Date.now() - 10 * 60 * 1000;

    const synced = db.syncCartSession({
      sessionId,
      items: [{ productId: 'prod_aurora_wifi7_router', quantity: 1 }],
      customerId: 'cust_shopper_demo',
      nowMs: baseMs,
    });
    const cartId = synced.cart!.id;
    const token = synced.cart!.recoveryToken;

    // 1. Explicit abandonment at checkout exit
    const abandoned = db.markCartAbandonedNow({
      sessionId,
      reason: 'Exited checkout modal before payment',
      nowMs: baseMs + 1000,
    });
    assert.equal(abandoned.success, true);
    assert.equal(abandoned.cart?.status, 'ABANDONED');
    assert.equal(abandoned.cart?.recoveryIncentiveCode, 'MEVOSUPER');

    // 2. Owner lookup finds cart
    const ownerCarts = db.getAbandonedCartsForOwner({ customerId: 'cust_shopper_demo' });
    assert.ok(ownerCarts.some((c) => c.id === cartId));

    // 3. Recovery token returns live stock-validated items & suggested coupon
    const recoveredLookup = db.getAbandonedCartByRecoveryToken(token);
    assert.equal(recoveredLookup.success, true);
    assert.equal(recoveredLookup.data?.items.length, 1);
    assert.equal(recoveredLookup.data?.items[0].productId, 'prod_aurora_wifi7_router');
    assert.equal(recoveredLookup.data?.suggestedCoupon?.code, 'MEVOSUPER');

    // 4. IDOR guard blocks reminder from wrong user
    const idorAttempt = db.sendRecoveryReminder({
      cartId,
      authenticatedCustomerId: 'cust_other_user',
      authenticatedEmail: 'attacker@evil.example',
      sessionId: 'wrong_session',
    });
    assert.equal(idorAttempt.success, false);
    assert.equal(idorAttempt.statusCode, 403);

    // 5. Owner can send reminder #1, then hits 429 cooldown immediately after
    const remindOk = db.sendRecoveryReminder({
      cartId,
      authenticatedCustomerId: 'cust_shopper_demo',
      nowMs: baseMs + 5000,
    });
    assert.equal(remindOk.success, true);
    assert.equal(remindOk.cart?.reminderCount, 1);

    const remindCooldown = db.sendRecoveryReminder({
      cartId,
      authenticatedCustomerId: 'cust_shopper_demo',
      nowMs: baseMs + 6000,
    });
    assert.equal(remindCooldown.success, false);
    assert.equal(remindCooldown.statusCode, 429);

    // 6. Creating an order marks the abandoned cart RECOVERED and blocks re-use of recovery token
    const ref = `MEV-TEST-${Date.now()}`;
    const order: Order = {
      id: `ord_test_${Date.now()}`,
      reference: ref,
      customerId: 'cust_shopper_demo',
      customerEmail: 'shopper@mevotech.co.za',
      customerName: 'Valued SA Shopper',
      customerPhone: '+27 82 555 0100',
      status: 'PENDING_PAYMENT',
      items: [
        {
          productId: 'prod_aurora_wifi7_router',
          sku: 'MEV-NET-AURORA7',
          name: 'Aurora WiFi 7 Tri-Band Smart Mesh Router',
          brand: 'Aurora Systems',
          unitPriceCents: 949900,
          quantity: 1,
          totalCents: 949900,
          taxCents: Math.round(949900 - 949900 / 1.15),
        },
      ],
      subtotalCents: 949900,
      discountCents: 0,
      shippingCents: 0,
      taxCents: Math.round(949900 - 949900 / 1.15),
      totalCents: 949900,
      currency: 'ZAR',
      shippingAddress: {
        fullName: 'Valued SA Shopper',
        email: 'shopper@mevotech.co.za',
        phone: '+27 82 555 0100',
        streetAddress: '100 West St',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
      },
      shippingMethod: {
        id: 'standard',
        name: 'Standard Door-to-Door Courier',
        description: 'Courier',
        priceCents: 15000,
        estimatedDelivery: '2-4 business days',
      },
      paymentMethod: 'payfast',
      paymentAttempts: [],
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createOrder(order, sessionId);
    const afterOrder = db.getAbandonedCartById(cartId)!;
    assert.equal(afterOrder.status, 'RECOVERED');
    assert.equal(afterOrder.recoveredOrderReference, ref);

    const tokenAfterRecovery = db.getAbandonedCartByRecoveryToken(token);
    assert.equal(tokenAfterRecovery.success, false);
  });

  it('enforces ownership check on dismissAbandonedCart', () => {
    const sessionId = `test_sess_dismiss_${Date.now()}`;
    const synced = db.syncCartSession({
      sessionId,
      items: [{ productId: 'prod_keychron_pro', quantity: 1 }],
      customerEmail: 'owner-dismiss@mevotech.co.za',
    });
    const cartId = synced.cart!.id;

    const denied = db.dismissAbandonedCart({
      cartId,
      sessionId: 'someone_else',
      authenticatedEmail: 'stranger@mevotech.co.za',
    });
    assert.equal(denied.success, false);
    assert.equal(denied.statusCode, 403);

    const allowed = db.dismissAbandonedCart({
      cartId,
      sessionId,
    });
    assert.equal(allowed.success, true);
    assert.equal(db.getAbandonedCartById(cartId), undefined);
  });

  it('resolves synthetic standard and pro-bundle variant IDs when product.variants is empty', () => {
    const sessionId = `test_sess_synth_${Date.now()}`;
    const synced = db.syncCartSession({
      sessionId,
      items: [
        {
          productId: 'prod_apex_mini_studio',
          variantId: 'var_prod_apex_mini_studio_std',
          quantity: 1,
        },
        {
          productId: 'prod_apex_mini_studio',
          variantId: 'var_prod_apex_mini_studio_pro',
          quantity: 1,
        },
      ],
      customerEmail: 'synth@mevotech.co.za',
    });

    assert.equal(synced.success, true);
    assert.ok(synced.cart);
    assert.equal(synced.cart.items.length, 2);
    assert.equal(synced.cart.items[0].unitPriceCents, 3699900);
    assert.equal(synced.cart.items[0].variantTitle, 'Standard Workstation Edition');
    assert.equal(synced.cart.items[1].unitPriceCents, Math.round(3699900 * 1.12));
    assert.equal(synced.cart.items[1].sku, 'MEV-PC-APEXMINI-PRO');

    const abandoned = db.markCartAbandonedNow({
      sessionId,
      reason: 'Customer saved cart from shopping bag',
    });
    assert.equal(abandoned.success, true);
    assert.equal(abandoned.cart?.status, 'ABANDONED');
  });
});

