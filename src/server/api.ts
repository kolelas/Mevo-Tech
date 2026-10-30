import { Router, Request, Response } from 'express';
import { db } from './db';
import { getPaymentProvider } from './payment';
import { calculateCartTotals, generateOrderReference, verifyPaymentAmount } from '../utils/calculations';
import { Order, OrderItemSnapshot, PaymentAttempt, PaymentProvider } from '../types';
import { authenticateAdmin, verifySession, invalidateSession, requireAdminAuth } from './auth';

export const apiRouter = Router();

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

// ---- Checkout & Stock Reservation ----

apiRouter.post('/checkout/reserve', (req: Request, res: Response) => {
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

apiRouter.post('/checkout/create-order', (req: Request, res: Response) => {
  try {
    const { items, shippingAddress, shippingMethodId, paymentMethod, discountCode, sessionId, customerId } = req.body;

    if (!Array.isArray(items) || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Missing required order fields' });
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

    db.createOrder(order);

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

apiRouter.post('/orders/lookup', (req: Request, res: Response) => {
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

// ---- Admin Authentication Endpoints ----

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const authResult = authenticateAdmin(username, password);

    if (!authResult.success) {
      return res.status(401).json(authResult);
    }

    res.json(authResult);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'];
    } else if (req.body?.token) {
      token = req.body.token;
    }

    if (token) {
      invalidateSession(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/admin/session', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'];
    }

    const session = verifySession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }

    res.json({ success: true, user: session.user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.all(['/admin/verify', '/admin/check'], (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'];
    } else if (req.body?.token) {
      token = req.body.token;
    }

    const session = verifySession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }

    res.json({ success: true, user: session.user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Protected Admin Endpoints (Overview, Stock, Fulfilment, Settings) ----

apiRouter.get('/admin/metrics', requireAdminAuth(), (_req: Request, res: Response) => {
  try {
    const metrics = db.getDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/admin/orders', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const orders = db.getOrders({
      status: status as any,
      search: search as string,
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/orders/:reference/status', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const { status, note, performedBy } = req.body;
    const adminUser = (req as any).adminUser;
    const actor = performedBy || adminUser?.name || 'Admin';

    const result = db.updateOrderStatus(
      req.params.reference,
      status,
      note || `Status manually updated to ${status}`,
      actor
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/orders/:reference/tracking', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const { courierName, trackingNumber, trackingUrl, performedBy } = req.body;
    if (!courierName || !trackingNumber) {
      return res.status(400).json({ success: false, error: 'Courier name and tracking number are required' });
    }

    const adminUser = (req as any).adminUser;
    const actor = performedBy || adminUser?.name || 'Fulfilment Manager';

    const result = db.updateOrderTracking({
      reference: req.params.reference,
      courierName,
      trackingNumber,
      trackingUrl,
      performedBy: actor,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/inventory/adjust', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const { productId, variantId, quantityChange, reason, performedBy } = req.body;
    if (!productId || quantityChange === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'Missing product, quantity change, or reason' });
    }

    const adminUser = (req as any).adminUser;
    const actor = performedBy || adminUser?.name || 'Inventory Manager';

    const result = db.adjustInventory({
      productId,
      variantId,
      quantityChange: Number(quantityChange),
      reason,
      performedBy: actor,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/admin/stock-movements', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const movements = db.getStockMovements(req.query.productId as string);
    res.json({ success: true, movements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.get('/admin/audit-logs', requireAdminAuth(), (_req: Request, res: Response) => {
  try {
    const logs = db.getAuditLogs();
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/products', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const actor = req.body.performedBy || adminUser?.name || 'Admin';
    const product = db.createProduct(req.body, actor);
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.put('/admin/products/:id', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const actor = req.body.performedBy || adminUser?.name || 'Admin';
    const product = db.updateProduct(req.params.id, req.body, actor);
    res.json({ success: true, product });
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

apiRouter.get('/admin/promotions', requireAdminAuth(), (_req: Request, res: Response) => {
  try {
    const banners = db.getAllPromotionalBanners();
    res.json({ success: true, banners });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.post('/admin/promotions', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const actor = req.body.performedBy || adminUser?.name || 'Admin';
    const banner = db.createPromotionalBanner(req.body, actor);
    res.json({ success: true, banner });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

apiRouter.put('/admin/promotions/:id', requireAdminAuth(), (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const actor = req.body.performedBy || adminUser?.name || 'Admin';
    const banner = db.updatePromotionalBanner(req.params.id, req.body, actor);
    res.json({ success: true, banner });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Customer Accounts & Portal API ----

apiRouter.post('/customer/register', (req: Request, res: Response) => {
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

apiRouter.post('/customer/login', (req: Request, res: Response) => {
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

apiRouter.get('/customer/me', (req: Request, res: Response) => {
  try {
    const customerId = (req.headers['x-customer-id'] as string) || (req.query.customerId as string);
    const email = (req.headers['x-customer-email'] as string) || (req.query.email as string);

    let customer = customerId ? db.getCustomerById(customerId) : undefined;
    if (!customer && email) {
      customer = db.getCustomerByEmail(email);
    }

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer account not found' });
    }

    res.json({ success: true, customer });
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

    const result = db.updateCustomerProfile(customerId, updates);
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


