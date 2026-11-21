import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { getPaymentProvider } from './payment';
import { calculateCartTotals, generateOrderReference, verifyPaymentAmount } from '../utils/calculations';
import { Order, OrderItemSnapshot, PaymentAttempt, PaymentProvider, AuditLogEntry } from '../types';
import {
  apiRateLimiter,
  authRateLimiter,
  checkoutRateLimiter,
  emailFormRateLimiter,
  verifyCustomerToken,
  sanitizeCustomerProfileUpdates,
} from './security';

export const apiRouter = Router();

/**
 * Extracts verified customer identity and browser cart session ID from request headers/JWT.
 */
function getRequesterContext(req: Request): {
  authenticatedCustomerId?: string;
  authenticatedEmail?: string;
  sessionId?: string;
} {
  let authenticatedCustomerId: string | undefined;
  let authenticatedEmail: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const custToken = authHeader.substring(7).trim();
    const decoded = verifyCustomerToken(custToken);
    if (decoded) {
      authenticatedCustomerId = decoded.customerId;
      authenticatedEmail = decoded.email;
    }
  }

  // Never trust caller-controlled identity headers. Customer identity must come
  // from a server-verified bearer token; headers are not proof of ownership.

  const rawSession =
    (req.headers['x-cart-session-id'] as string | undefined) ||
    (req.query.sessionId as string | undefined) ||
    (typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined);

  return {
    authenticatedCustomerId,
    authenticatedEmail,
    sessionId: rawSession && rawSession.trim() !== '' ? rawSession.trim() : undefined,
  };
}

/**
 * Principle 5: Check who owns it before update or delete.
 * Verifies that the caller owns the targeted customer resource.
 */
function verifyCustomerOwnership(req: Request, targetCustomerId?: string, targetEmail?: string): boolean {
  const ctx = getRequesterContext(req);
  if (targetCustomerId && ctx.authenticatedCustomerId && ctx.authenticatedCustomerId === targetCustomerId) {
    return true;
  }
  if (
    targetEmail &&
    ctx.authenticatedEmail &&
    ctx.authenticatedEmail.toLowerCase() === targetEmail.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}


// ---- Public Products & Catalogue ----

apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category, search, minPrice, maxPrice, brand, sort } = req.query;

    const products = db.getProducts({
      category: category as string,
      search: search as string,
      brand: brand as string,
      minPriceCents: minPrice ? Number(minPrice) : undefined,
      maxPriceCents: maxPrice ? Number(maxPrice) : undefined,
      sort: sort as 'price_asc' | 'price_desc' | 'newest',
      onlyActive: true,
    });

    res.json({ success: true, count: products.length, products });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/products/:slug', (req: Request, res: Response) => {
  try {
    const product = db.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Cart Validation ----

apiRouter.post('/cart/validate', (req: Request, res: Response) => {
  try {
    const { items, discountCode, shippingMethodId } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Invalid items array' });
    }

    const validatedItems = [];
    let hasStockIssue = false;

    for (const item of items) {
      const product = db.getProductById(item.productId);
      if (!product || !product.isActive) {
        hasStockIssue = true;
        continue;
      }

      let priceCents = product.promotionalPriceCents || product.priceCents;
      let availableStock = product.onHandQuantity - product.reservedQuantity;
      let variantTitle: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          priceCents = variant.promotionalPriceCents || variant.priceCents;
          availableStock = variant.onHandQuantity - variant.reservedQuantity;
          variantTitle = variant.title;
        }
      }

      const quantity = Math.min(item.quantity, Math.max(1, availableStock));
      if (item.quantity > availableStock) {
        hasStockIssue = true;
      }

      validatedItems.push({
        productId: product.id,
        variantId: item.variantId,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        variantTitle,
        image: product.primaryImage,
        priceCents,
        quantity,
        availableStock,
      });
    }

    const coupon = discountCode ? db.getCoupon(discountCode) : null;
    const shippingMethods = db.getShippingMethods();
    const selectedShipping = shippingMethods.find((s) => s.id === shippingMethodId) || shippingMethods[0];
    const settings = db.getSettings();

    const totals = calculateCartTotals({
      items: validatedItems.map((i) => ({ priceCents: i.priceCents, quantity: i.quantity })),
      discount: coupon,
      shippingMethod: selectedShipping,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
    });

    res.json({
      success: true,
      items: validatedItems,
      totals,
      hasStockIssue,
      appliedDiscount: coupon && coupon.isActive ? coupon : null,
      shippingMethod: selectedShipping,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Abandoned Cart Tracking & Recovery API ----

apiRouter.post('/cart/sync', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const ctx = getRequesterContext(req);
    const {
      sessionId: bodySessionId,
      items,
      discountCode,
      customerEmail,
      customerName,
      customerPhone,
      customerId: requestedCustomerId,
    } = req.body || {};

    const sessionId = (typeof bodySessionId === 'string' && bodySessionId.trim()) || ctx.sessionId;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required to sync cart' });
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items must be an array' });
    }

    // Only bind customerId if requester owns that customer account
    let verifiedCustomerId: string | undefined;
    if (requestedCustomerId) {
      if (!verifyCustomerOwnership(req, requestedCustomerId, customerEmail)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot sync cart to another customer account.',
        });
      }
      verifiedCustomerId = requestedCustomerId;
    } else if (ctx.authenticatedCustomerId) {
      verifiedCustomerId = ctx.authenticatedCustomerId;
    }

    const result = db.syncCartSession({
      sessionId,
      items,
      discountCode,
      customerId: verifiedCustomerId,
      customerEmail: customerEmail || ctx.authenticatedEmail,
      customerName,
      customerPhone,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.post('/cart/abandon', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const ctx = getRequesterContext(req);
    const { sessionId: bodySessionId, customerId: requestedCustomerId, customerEmail, reason } = req.body || {};
    const sessionId = (typeof bodySessionId === 'string' && bodySessionId.trim()) || ctx.sessionId;

    if (requestedCustomerId && !verifyCustomerOwnership(req, requestedCustomerId, customerEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Cannot mark another customer cart abandoned.',
      });
    }

    const verifiedCustomerId = requestedCustomerId || ctx.authenticatedCustomerId;
    const targetEmail = customerEmail || ctx.authenticatedEmail;

    if (!sessionId && !verifiedCustomerId && !targetEmail) {
      return res.status(400).json({ success: false, error: 'sessionId or customer identity is required' });
    }

    const result = db.markCartAbandonedNow({
      sessionId,
      customerId: verifiedCustomerId,
      customerEmail: targetEmail,
      reason,
    });

    res.json({ success: true, captured: result.success, cart: result.cart });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/cart/abandoned', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const ctx = getRequesterContext(req);
    const queryCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId.trim() : undefined;
    const queryEmail = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined;
    const includeActive = req.query.includeActive === 'true';

    // Reject attempts to query another customer's abandoned carts explicitly
    if ((queryCustomerId || queryEmail) && !verifyCustomerOwnership(req, queryCustomerId, queryEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only view your own abandoned carts (Ownership check enforced).',
      });
    }

    const customerId = queryCustomerId || ctx.authenticatedCustomerId;
    const email = queryEmail || ctx.authenticatedEmail;
    const sessionId = ctx.sessionId;

    if (!customerId && !email && !sessionId) {
      return res.json({ success: true, count: 0, carts: [] });
    }

    const carts = db.getAbandonedCartsForOwner({
      customerId,
      email,
      sessionId,
      includeActive,
    });

    res.json({ success: true, count: carts.length, carts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/cart/recover/:token', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const result = db.getAbandonedCartByRecoveryToken(req.params.token);
    if (!result.success || !result.data) {
      const msg = result.error || 'Recovery token invalid';
      const statusCode = msg.includes('expired') || msg.includes('already completed') ? 410 : 404;
      return res.status(statusCode).json({ success: false, error: msg });
    }

    res.json({ success: true, ...result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/cart/abandoned/:id/remind', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const ctx = getRequesterContext(req);
    const { overrideEmail } = req.body || {};

    const result = db.sendRecoveryReminder({
      cartId: req.params.id,
      authenticatedCustomerId: ctx.authenticatedCustomerId,
      authenticatedEmail: ctx.authenticatedEmail,
      sessionId: ctx.sessionId,
      overrideEmail,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      cart: result.cart,
      recoveryUrl: result.recoveryUrl,
      message: result.message,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.delete('/cart/abandoned/:id', apiRateLimiter, (req: Request, res: Response) => {
  try {
    const ctx = getRequesterContext(req);
    const result = db.dismissAbandonedCart({
      cartId: req.params.id,
      authenticatedCustomerId: ctx.authenticatedCustomerId,
      authenticatedEmail: ctx.authenticatedEmail,
      sessionId: ctx.sessionId,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: 'Saved cart dismissed successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Checkout & Stock Reservation ----

apiRouter.post('/checkout/reserve', checkoutRateLimiter, (req: Request, res: Response) => {
  try {
    const { items, sessionId } = req.body;
    if (!Array.isArray(items) || !sessionId) {
      return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    const reservation = db.reserveStock({ items, sessionId });
    if (!reservation.success) {
      return res.status(409).json({ success: false, error: reservation.error });
    }

    res.json({ success: true, reservationIds: reservation.reservationIds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/checkout/create-order', checkoutRateLimiter, (req: Request, res: Response) => {
  try {
    const { items, shippingAddress, shippingMethodId, paymentMethod, discountCode, sessionId, customerId } = req.body;
    const requester = getRequesterContext(req);
    if (!requester.authenticatedCustomerId || requester.authenticatedCustomerId !== customerId) {
      return res.status(401).json({ success: false, error: 'A valid customer session for this account is required.' });
    }

    if (!Array.isArray(items) || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Missing required order fields' });
    }

    // STRICT COMMERCIAL POLICY: No logged out purchase allowed!
    if (!customerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required: No purchase may be completed while logged out. Please sign in or create an account to proceed.',
      });
    }

    const customerAccount = db.getCustomerById(customerId);
    if (!customerAccount) {
      return res.status(401).json({
        success: false,
        error: 'Valid customer account required. Please sign in or register before checking out.',
      });
    }

    // Require verified email
    if (customerAccount.emailVerified === false) {
      return res.status(403).json({
        success: false,
        error: 'Email confirmation required: Please confirm your email address with your 6-digit code before completing checkout.',
      });
    }

    // Enforce Commercial Account Access Rules: Check if customer is restricted or blocked
    if (customerAccount.status === 'blocked') {
      db.recordAuditLog({
        actor: customerAccount.email,
        role: 'customer',
        action: 'PAYMENT_BLOCKED_ATTEMPT',
        targetType: 'PAYMENT',
        targetId: customerAccount.id,
        category: 'payment_failure',
        severity: 'critical',
        details: `Blocked account ${customerAccount.email} attempted order creation. Action halted by security policy.`,
      });
      return res.status(403).json({
        success: false,
        error: 'Your customer account has been suspended by administration. Order creation is blocked.',
      });
    }
    if (customerAccount.status === 'restricted') {
      db.recordAuditLog({
        actor: customerAccount.email,
        role: 'customer',
        action: 'PAYMENT_RESTRICTED_ATTEMPT',
        targetType: 'PAYMENT',
        targetId: customerAccount.id,
        category: 'payment_failure',
        severity: 'warning',
        details: `Restricted account ${customerAccount.email} attempted checkout. Order creation denied. Policy reason: ${customerAccount.restrictionReason || 'Verification hold'}`,
      });
      return res.status(403).json({
        success: false,
        error: `Your account is currently restricted from placing new orders. Reason: ${customerAccount.restrictionReason || 'Administrative verification required. Contact support@mevotech.co.za.'}`,
      });
    }

    // 1. Server recalculates prices and creates authoritative snapshots
    const itemSnapshots: OrderItemSnapshot[] = [];
    for (const item of items) {
      const product = db.getProductById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, error: `Product unavailable: ${item.productId}` });
      }

      let unitPriceCents = product.promotionalPriceCents || product.priceCents;
      let variantTitle: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (variant) {
          unitPriceCents = variant.promotionalPriceCents || variant.priceCents;
          variantTitle = variant.title;
        }
      }

      const totalItemCents = unitPriceCents * item.quantity;
      const taxCents = Math.round(totalItemCents - totalItemCents / 1.15); // 15% VAT

      itemSnapshots.push({
        productId: product.id,
        variantId: item.variantId,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        variantTitle,
        unitPriceCents,
        quantity: item.quantity,
        totalCents: totalItemCents,
        taxCents,
      });
    }

    const coupon = discountCode ? db.getCoupon(discountCode) : null;
    const shippingMethods = db.getShippingMethods();
    const shippingMethod = shippingMethods.find((s) => s.id === shippingMethodId) || shippingMethods[0];
    const settings = db.getSettings();

    const totals = calculateCartTotals({
      items: itemSnapshots.map((i) => ({ priceCents: i.unitPriceCents, quantity: i.quantity })),
      discount: coupon,
      shippingMethod,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
    });

    const reference = generateOrderReference();
    const now = new Date().toISOString();

    // 2. Reserve stock linked directly to this order reference
    const reservation = db.reserveStock({
      items: itemSnapshots.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      sessionId: sessionId || reference,
      orderReference: reference,
    });

    if (!reservation.success) {
      return res.status(409).json({ success: false, error: reservation.error });
    }

    const order: Order = {
      id: `ord_${Date.now()}`,
      reference,
      customerId: customerId || undefined,
      customerEmail: shippingAddress.email,
      customerName: shippingAddress.fullName,
      customerPhone: shippingAddress.phone,
      status: 'PENDING_PAYMENT',
      items: itemSnapshots,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      currency: 'ZAR',
      shippingAddress,
      shippingMethod,
      paymentMethod,
      paymentAttempts: [],
      statusHistory: [
        {
          status: 'PENDING_PAYMENT',
          note: `Order created awaiting ${paymentMethod.toUpperCase()} payment confirmation`,
          updatedBy: 'System Checkout',
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.createOrder(order, sessionId);

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Payments Gateway Initiation & Webhooks ----

apiRouter.post('/payments/initiate', async (req: Request, res: Response) => {
  try {
    const { orderReference, providerId } = req.body;
    const order = db.getOrderByReference(orderReference);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_FAILED') {
      return res.status(400).json({
        success: false,
        error: `Cannot initiate payment for order in status: ${order.status}`,
      });
    }

    const provider = getPaymentProvider(providerId as PaymentProvider);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const paymentAttempt: PaymentAttempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderReference: order.reference,
      provider: providerId as PaymentProvider,
      amountCents: order.totalCents,
      currency: 'ZAR',
      status: 'INITIATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.addPaymentAttempt(order.reference, paymentAttempt);

    const result = await provider.initiatePayment({
      order,
      paymentAttempt,
      returnUrl: `${appUrl}/orders/${order.reference}?payment=success`,
      cancelUrl: `${appUrl}/orders/${order.reference}?payment=cancelled`,
      notifyUrl: `${appUrl}/api/payments/${providerId}/webhook`,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Canonical Webhook Handler (PayFast, Payflex, Ozow, Paystack, Crypto)
apiRouter.post('/payments/:provider/webhook', async (req: Request, res: Response) => {
  try {
    const providerId = req.params.provider as PaymentProvider;
    const provider = getPaymentProvider(providerId);

    const verification = await provider.verifyWebhook(
      req.headers as Record<string, string>,
      req.body
    );

    if (!verification.isValid || !verification.signatureVerified) {
      db.recordAuditLog({
        actor: `${providerId.toUpperCase()} Webhook`,
        role: 'system',
        action: 'PAYMENT_SIGNATURE_TAMPERED',
        targetType: 'PAYMENT',
        targetId: providerId,
        category: 'payment_failure',
        severity: 'critical',
        details: `Security alert: Invalid webhook signature or untrusted payload received for provider ${providerId}`,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid signature or untrusted payload',
      });
    }

    const order = db.getOrderByReference(verification.orderReference);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify amount match in integer cents
    const amountCheck = verifyPaymentAmount({
      expectedCents: order.totalCents,
      receivedCents: verification.amountCents,
    });

    if (verification.status === 'SUCCESSFUL') {
      if (!amountCheck.isValid) {
        db.recordAuditLog({
          actor: `${providerId.toUpperCase()} Webhook`,
          role: 'system',
          action: 'PAYMENT_AMOUNT_MISMATCH',
          targetType: 'PAYMENT',
          targetId: order.reference,
          category: 'payment_failure',
          severity: 'critical',
          details: `Amount mismatch detected for ${order.reference}! Expected R ${(order.totalCents / 100).toFixed(2)}, received R ${(verification.amountCents / 100).toFixed(2)}`,
        });
        db.updateOrderStatus(
          order.reference,
          'FULFILMENT_ON_HOLD',
          `Payment amount mismatch! Expected R ${(order.totalCents / 100).toFixed(2)}, received R ${(verification.amountCents / 100).toFixed(2)}. Transaction ${verification.providerTransactionId}`,
          `${providerId.toUpperCase()} Webhook`
        );
        return res.status(400).json({ success: false, error: 'Payment amount mismatch' });
      }

      // Transition order to PAID and convert inventory reservations to permanent sales
      db.updateOrderStatus(
        order.reference,
        'PAID',
        `Payment verified via ${provider.name}. Gateway Trans ID: ${verification.providerTransactionId}`,
        `${providerId.toUpperCase()} Webhook`
      );
    } else if (verification.status === 'FAILED') {
      db.recordAuditLog({
        actor: `${providerId.toUpperCase()} Gateway`,
        role: 'system',
        action: 'PAYMENT_ATTEMPT_FAILED',
        targetType: 'PAYMENT',
        targetId: order.reference,
        category: 'payment_failure',
        severity: 'warning',
        details: `Payment attempt failed on ${provider.name} for order ${order.reference}. Transaction ID: ${verification.providerTransactionId || 'N/A'}`,
      });
      db.updateOrderStatus(
        order.reference,
        'PAYMENT_FAILED',
        `Payment attempt failed on ${provider.name}. Transaction ID: ${verification.providerTransactionId}`,
        `${providerId.toUpperCase()} Webhook`
      );
    } else if (verification.status === 'CANCELLED') {
      db.updateOrderStatus(
        order.reference,
        'PAYMENT_CANCELLED',
        `Customer cancelled payment on ${provider.name}`,
        `${providerId.toUpperCase()} Webhook`
      );
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Developer sandbox simulated webhook for instant verification in dev
apiRouter.post('/payments/simulate-webhook', async (req: Request, res: Response) => {
  // Simulation must never be available in production deployments.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  try {
    const { orderReference, outcome, provider } = req.body;
    const order = db.getOrderByReference(orderReference);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const providerName = provider || order.paymentMethod;

    if (outcome === 'SUCCESS') {
      db.updateOrderStatus(
        order.reference,
        'PAID',
        `Sandbox payment completed successfully via ${providerName.toUpperCase()}. Stock decremented permanently.`,
        'Sandbox Payment Simulator'
      );
    } else if (outcome === 'FAIL') {
      db.recordAuditLog({
        actor: 'Payment Sandbox Simulator',
        role: 'system',
        action: 'PAYMENT_ATTEMPT_FAILED',
        targetType: 'PAYMENT',
        targetId: order.reference,
        category: 'payment_failure',
        severity: 'warning',
        details: `Simulated payment failure (card decline / 3D Secure timeout) for order ${order.reference} via ${providerName.toUpperCase()}`,
      });
      db.updateOrderStatus(
        order.reference,
        'PAYMENT_FAILED',
        `Sandbox simulated payment failure via ${providerName.toUpperCase()}.`,
        'Sandbox Payment Simulator'
      );
    } else if (outcome === 'CANCEL') {
      db.updateOrderStatus(
        order.reference,
        'PAYMENT_CANCELLED',
        `Sandbox user payment cancelled.`,
        'Sandbox Payment Simulator'
      );
    }

    res.json({ success: true, order: db.getOrderByReference(orderReference) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Orders Lookup & Details ----

apiRouter.get('/orders/:reference', (req: Request, res: Response) => {
  try {
    const order = db.getOrderByReference(req.params.reference);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/orders/lookup', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const { reference, email } = req.body;
    if (!reference || !email) {
      return res.status(400).json({ success: false, error: 'Reference and email are required' });
    }

    const order = db.getOrderByReference(reference.trim().toUpperCase());
    if (!order || order.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(404).json({ success: false, error: 'No matching order found for this email and reference.' });
    }

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Store Information & Settings ----

apiRouter.get('/store/settings', (_req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    const shippingMethods = db.getShippingMethods();
    res.json({ success: true, settings, shippingMethods });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/coupons/validate', (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    const coupon = db.getCoupon(code);
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code' });
    }

    res.json({ success: true, coupon });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/coupons/active', (_req: Request, res: Response) => {
  try {
    const activeCoupons = db.getActiveCoupons();
    res.json({ success: true, coupons: activeCoupons });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});







// ---- Promotional Banners & Seasonal Sales ----

apiRouter.get('/promotions/active', (_req: Request, res: Response) => {
  try {
    const banners = db.getActivePromotionalBanners();
    res.json({ success: true, banners });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// ---- Customer Accounts & Portal API ----

apiRouter.post('/customer/register', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Full name, email, and password are required' });
    }

    const result = db.registerCustomer({ name, email, password, phone, address });
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/customer/verify-email', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit confirmation code are required' });
    }

    const result = db.verifyCustomerEmail(email, code);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/customer/resend-code', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const result = db.resendVerificationCode(email);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/customer/login', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = db.authenticateCustomer(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Social Login / Registration (Google & Facebook SSO)
apiRouter.post('/customer/social-login', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { provider, email, name, avatar, phone } = req.body;
    if (!provider || !email) {
      return res.status(400).json({ success: false, error: 'Provider and email are required for social login' });
    }

    if (provider !== 'google' && provider !== 'facebook') {
      return res.status(400).json({ success: false, error: 'Provider must be google or facebook' });
    }

    const result = db.socialLoginCustomer({
      provider,
      email,
      name: name || (provider === 'google' ? 'Google Customer' : 'Facebook Customer'),
      avatar,
      phone,
    });

    if (!result.success) {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/customer/me', (req: Request, res: Response) => {
  try {
    let customer: any;
    const authHeader = req.headers.authorization;

    // 1. Check cryptographically signed JWT token if present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyCustomerToken(authHeader.substring(7));
      if (decoded?.customerId) {
        customer = db.getCustomerById(decoded.customerId);
      }
    }

    // No caller-controlled headers or query parameters may establish account identity.
    // Customer profile access requires a cryptographically verified bearer token.

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer account not found' });
    }

    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POPIA Section 14 Customer Data Portability Export
apiRouter.get('/customer/export-data', (req: Request, res: Response) => {
  try {
    const requester = getRequesterContext(req);
    const customerId = requester.authenticatedCustomerId;
    if (!customerId) {
      return res.status(401).json({ success: false, error: 'A valid customer session is required.' });
    }

    // Principle 5: Check who owns it before export / update / delete
    if (!verifyCustomerOwnership(req, customerId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only export data for your own account (Ownership check enforced).',
      });
    }

    const exportResult = db.exportCustomerData(customerId);
    if (!exportResult.success) {
      return res.status(404).json(exportResult);
    }

    res.json(exportResult);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POPIA Section 14 Right to be Forgotten (Account Deletion & Data Purge)
apiRouter.post('/customer/delete-account', (req: Request, res: Response) => {
  try {
    const { customerId, confirmation } = req.body;
    if (!customerId || confirmation !== 'PERMANENTLY_DELETE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation string "PERMANENTLY_DELETE" and customerId required to purge account',
      });
    }

    // Principle 5: Check who owns it before update or delete
    if (!verifyCustomerOwnership(req, customerId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only delete your own customer account (Ownership check enforced).',
      });
    }

    const deleteResult = db.deleteCustomerAccount(customerId);
    if (!deleteResult.success) {
      return res.status(404).json(deleteResult);
    }

    res.json(deleteResult);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.put('/customer/profile', (req: Request, res: Response) => {
  try {
    const { customerId, updates } = req.body;
    if (!customerId || !updates) {
      return res.status(400).json({ success: false, error: 'customerId and updates are required' });
    }

    // Principle 5: Check who owns it before update or delete
    if (!verifyCustomerOwnership(req, customerId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only update your own customer profile (Ownership check enforced).',
      });
    }

    // Principle 2: Never trust role or isPro from the browser - sanitize payload
    const safeUpdates = sanitizeCustomerProfileUpdates(updates);

    const result = db.updateCustomerProfile(customerId, safeUpdates);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/customer/favourites/toggle', (req: Request, res: Response) => {
  try {
    const { customerId, productId } = req.body;
    if (!customerId || !productId) {
      return res.status(400).json({ success: false, error: 'customerId and productId are required' });
    }

    // Principle 5: Check who owns it before update or delete
    if (!verifyCustomerOwnership(req, customerId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only modify your own favourites list (Ownership check enforced).',
      });
    }

    const favourites = db.toggleCustomerFavourite(customerId, productId);
    res.json({ success: true, favourites });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


apiRouter.get('/customer/orders', (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || (req.headers['x-customer-email'] as string);
    const customerId = (req.query.customerId as string) || (req.headers['x-customer-id'] as string);

    if (!email && !customerId) {
      return res.status(400).json({ success: false, error: 'Email or customerId required to query orders' });
    }

    // Principle 5: Check who owns it before read or update
    if (!verifyCustomerOwnership(req, customerId, email)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only query your own orders (Ownership check enforced).',
      });
    }

    const orders = db.getCustomerOrders(customerId || email);
    res.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Product Reviews API ----

apiRouter.get('/products/:id/reviews', (req: Request, res: Response) => {
  try {
    const reviews = db.getReviewsForProduct(req.params.id);
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? Number((totalRating / reviews.length).toFixed(1)) : 5.0;

    res.json({
      success: true,
      productId: req.params.id,
      count: reviews.length,
      averageRating,
      reviews,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/products/:id/reviews', (req: Request, res: Response) => {
  try {
    const { authorName, rating, title, comment, userId, customerEmail } = req.body;
    if (!authorName || !rating || !title || !comment) {
      return res.status(400).json({ success: false, error: 'Author name, rating (1-5), title, and comment are required' });
    }

    const result = db.addReview({
      productId: req.params.id,
      userId,
      authorName,
      rating: Number(rating),
      title,
      comment,
      customerEmail,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Price Drop Alert Subscriptions API (Email Rate Limited) ----

apiRouter.post('/products/:productId/price-alerts', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { email, targetType = 'any', customTargetPriceCents, customerId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const result = db.createPriceAlert({
      productId,
      email,
      targetType,
      customTargetPriceCents: customTargetPriceCents ? Number(customTargetPriceCents) : undefined,
      customerId,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

apiRouter.get('/price-alerts', (req: Request, res: Response) => {
  try {
    const email = req.query.email as string | undefined;
    if (email) {
      const alerts = db.getPriceAlertsByEmail(email);
      return res.json({ success: true, count: alerts.length, alerts });
    }

    const alerts = db.getAllPriceAlerts();
    res.json({ success: true, count: alerts.length, alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Principle 5: Check who owns it before update or delete
apiRouter.delete('/price-alerts/:id', (req: Request, res: Response) => {
  try {
    const email = req.query.email as string | undefined;
    const alert = db.getAllPriceAlerts().find((a) => a.id === req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Price alert not found' });
    }

    // Verify ownership: requesting email matches alert email or admin authorized
    if (!verifyCustomerOwnership(req, alert.customerId, alert.email)) {
      if (!email || email.trim().toLowerCase() !== alert.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only delete price alerts created by your email (Ownership check enforced).',
        });
      }
    }

    const success = db.cancelPriceAlert(req.params.id, email || alert.email);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Alert not found or unauthorized' });
    }
    res.json({ success: true, message: 'Price alert cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Principle 4: Rate-limit every form that sends email (Newsletter & Contact Form)
apiRouter.post('/newsletter/subscribe', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    db.recordAuditLog({
      actor: email.trim().toLowerCase(),
      role: 'guest',
      action: 'NEWSLETTER_SUBSCRIBE',
      targetType: 'MARKETING',
      targetId: email.trim().toLowerCase(),
      category: 'system',
      severity: 'info',
      details: `Newsletter subscription confirmed for ${email.trim().toLowerCase()}`,
    });

    res.json({ success: true, message: 'Subscribed to VIP Tech alerts successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/contact/send', emailFormRateLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }

    db.recordAuditLog({
      actor: email.trim().toLowerCase(),
      role: 'guest',
      action: 'CONTACT_FORM_SUBMISSION',
      targetType: 'SUPPORT',
      targetId: email.trim().toLowerCase(),
      category: 'system',
      severity: 'info',
      details: `Customer inquiry received from ${name} (${email}): ${subject || 'General Inquiry'}`,
    });

    res.json({ success: true, message: 'Your message has been sent to MEVO TECH Support.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


apiRouter.post('/products/:productId/simulate-price-drop', (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { newPriceCents } = req.body;

    if (!newPriceCents || Number(newPriceCents) <= 0) {
      return res.status(400).json({ success: false, error: 'newPriceCents is required and must be greater than zero.' });
    }

    const result = db.simulatePriceDrop(productId, Number(newPriceCents));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Ensure unknown /api/* paths always return structured JSON (never empty body or HTML)
apiRouter.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});
