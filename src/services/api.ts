import {
  AbandonedCart,
  CouponDiscount,
  CustomerAccount,
  CustomerAuthProvider,
  Order,
  PaymentProvider,
  Product,
  ProductReview,
  PromotionalBanner,
  RecoveredCartResponse,
  ShippingAddress,
  ShippingMethod,
  StoreSettings,
  PriceAlert,
  PriceAlertTargetType,
} from '../types';

const CUSTOMER_TOKEN_KEY = 'mevo_customer_token_v1';
const CUSTOMER_SESSION_KEY = 'mevo_tech_customer_session_v2';
const CART_SESSION_ID_KEY = 'mevo_cart_session_id';

function readStoredCustomerSummary(): { id?: string; email?: string } {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      id: typeof parsed?.id === 'string' ? parsed.id : undefined,
      email: typeof parsed?.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return {};
  }
}

function readStoredCartSessionId(): string | undefined {
  try {
    const sid = localStorage.getItem(CART_SESSION_ID_KEY);
    return sid && sid.trim() !== '' ? sid.trim() : undefined;
  } catch {
    return undefined;
  }
}

export const api = {
  // Products
  async getProducts(params?: {
    category?: string;
    search?: string;
    brand?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest';
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.brand) searchParams.set('brand', params.brand);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.minPrice) searchParams.set('minPrice', params.minPrice.toString());
    if (params?.maxPrice) searchParams.set('maxPrice', params.maxPrice.toString());

    const res = await fetch(`/api/products?${searchParams.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load products');
    return data.products;
  },

  async getProductBySlug(slug: string): Promise<Product> {
    const res = await fetch(`/api/products/${slug}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Product not found');
    return data.product;
  },

  // Cart & Pricing
  async validateCart(params: {
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    discountCode?: string;
    shippingMethodId?: string;
  }): Promise<{
    items: any[];
    totals: {
      subtotalCents: number;
      discountCents: number;
      shippingCents: number;
      taxCents: number;
      totalCents: number;
    };
    appliedDiscount: CouponDiscount | null;
    shippingMethod: ShippingMethod;
    hasStockIssue: boolean;
  }> {
    const res = await fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Validation failed');
    return data;
  },

  // Checkout
  async createOrder(params: {
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    shippingAddress: ShippingAddress;
    shippingMethodId: string;
    paymentMethod: PaymentProvider;
    discountCode?: string;
    sessionId?: string;
    customerId?: string;
  }): Promise<Order> {
    const res = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create order');
    return data.order;
  },

  // Payment Initiation
  async initiatePayment(orderReference: string, providerId: PaymentProvider): Promise<any> {
    const res = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference, providerId }),
    });
    const data = await res.json();
    return data;
  },

  // Sandbox Webhook Simulator (for browser verification)
  async simulatePaymentWebhook(
    orderReference: string,
    outcome: 'SUCCESS' | 'FAIL' | 'CANCEL',
    provider?: PaymentProvider
  ): Promise<Order> {
    const res = await fetch('/api/payments/simulate-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference, outcome, provider }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to simulate payment');
    return data.order;
  },

  // Order Details & Lookup
  async getOrderByReference(reference: string): Promise<Order> {
    const res = await fetch(`/api/orders/${reference}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Order not found');
    return data.order;
  },

  async lookupOrder(reference: string, email: string): Promise<Order> {
    const res = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Order lookup failed');
    return data.order;
  },

  // Store & Settings
  async getStoreInfo(): Promise<{ settings: StoreSettings; shippingMethods: ShippingMethod[] }> {
    const res = await fetch('/api/store/settings');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch settings');
    return { settings: data.settings, shippingMethods: data.shippingMethods };
  },

  async validateCoupon(code: string): Promise<CouponDiscount> {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Invalid coupon');
    return data.coupon;
  },

  async getActiveCoupons(): Promise<CouponDiscount[]> {
    const res = await fetch('/api/coupons/active');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch active coupons');
    return data.coupons || [];
  },

  // Promotional Banners & Seasonal Deals
  async getActivePromotions(): Promise<PromotionalBanner[]> {
    const res = await fetch('/api/promotions/active');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load active promotions');
    return data.banners;
  },

  // Customer JWT & Identity Header Helpers
  getCustomerToken(): string | null {
    try {
      return localStorage.getItem(CUSTOMER_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setCustomerToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      }
    } catch {
      // ignore storage errors
    }
  },

  getCustomerAuthHeaders(options?: {
    sessionId?: string;
    customerId?: string;
    email?: string;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getCustomerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const storedCustomer = readStoredCustomerSummary();
    const customerId = options?.customerId || storedCustomer.id;
    const email = options?.email || storedCustomer.email;
    const sessionId = options?.sessionId || readStoredCartSessionId();

    if (customerId) headers['x-customer-id'] = customerId;
    if (email) headers['x-customer-email'] = email;
    if (sessionId) headers['x-cart-session-id'] = sessionId;
    return headers;
  },

  // Abandoned Cart Sync, Capture & Recovery
  async syncCart(params: {
    sessionId: string;
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    discountCode?: string;
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<{ success: boolean; cart: AbandonedCart | null }> {
    const res = await fetch('/api/cart/sync', {
      method: 'POST',
      headers: this.getCustomerAuthHeaders({
        sessionId: params.sessionId,
        customerId: params.customerId,
        email: params.customerEmail,
      }),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to sync cart');
    return data;
  },

  async markCartAbandoned(params: {
    sessionId: string;
    customerId?: string;
    customerEmail?: string;
    reason?: string;
  }): Promise<{ success: boolean; captured: boolean; cart: AbandonedCart | null }> {
    const res = await fetch('/api/cart/abandon', {
      method: 'POST',
      headers: this.getCustomerAuthHeaders({
        sessionId: params.sessionId,
        customerId: params.customerId,
        email: params.customerEmail,
      }),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to mark cart abandoned');
    return data;
  },

  async getAbandonedCarts(options?: {
    sessionId?: string;
    customerId?: string;
    email?: string;
    includeActive?: boolean;
  }): Promise<AbandonedCart[]> {
    const query = new URLSearchParams();
    if (options?.sessionId) query.set('sessionId', options.sessionId);
    if (options?.customerId) query.set('customerId', options.customerId);
    if (options?.email) query.set('email', options.email);
    if (options?.includeActive) query.set('includeActive', 'true');

    const res = await fetch(`/api/cart/abandoned?${query.toString()}`, {
      headers: this.getCustomerAuthHeaders({
        sessionId: options?.sessionId,
        customerId: options?.customerId,
        email: options?.email,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load saved carts');
    return data.carts || [];
  },

  async recoverAbandonedCart(token: string): Promise<RecoveredCartResponse> {
    const res = await fetch(`/api/cart/recover/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to restore saved cart');
    return {
      cart: data.cart,
      items: data.items,
      suggestedCoupon: data.suggestedCoupon || null,
      hasStockChanges: Boolean(data.hasStockChanges),
    };
  },

  async sendAbandonedCartReminder(
    cartId: string,
    options?: {
      sessionId?: string;
      customerId?: string;
      email?: string;
      overrideEmail?: string;
    }
  ): Promise<{ success: boolean; cart: AbandonedCart; recoveryUrl: string; message: string }> {
    const res = await fetch(`/api/cart/abandoned/${encodeURIComponent(cartId)}/remind`, {
      method: 'POST',
      headers: this.getCustomerAuthHeaders({
        sessionId: options?.sessionId,
        customerId: options?.customerId,
        email: options?.email,
      }),
      body: JSON.stringify({
        sessionId: options?.sessionId,
        overrideEmail: options?.overrideEmail,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to send recovery email');
    return data;
  },

  async dismissAbandonedCart(
    cartId: string,
    options?: {
      sessionId?: string;
      customerId?: string;
      email?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/cart/abandoned/${encodeURIComponent(cartId)}`, {
      method: 'DELETE',
      headers: this.getCustomerAuthHeaders({
        sessionId: options?.sessionId,
        customerId: options?.customerId,
        email: options?.email,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to dismiss saved cart');
    return data;
  },

  // Customer Accounts
  async registerCustomer(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: ShippingAddress;
  }): Promise<{
    success: boolean;
    requiresEmailVerification?: boolean;
    verificationCode?: string;
    customer?: CustomerAccount;
    message?: string;
  }> {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to register account');
    return data;
  },

  async verifyCustomerEmail(email: string, code: string): Promise<{ success: boolean; customer: CustomerAccount; token?: string }> {
    const res = await fetch('/api/customer/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Email verification failed');
    if (data.token) this.setCustomerToken(data.token);
    return data;
  },

  async resendVerificationCode(email: string): Promise<{ success: boolean; verificationCode?: string; message: string }> {
    const res = await fetch('/api/customer/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to resend code');
    return data;
  },

  async loginCustomer(email: string, password: string): Promise<{ success: boolean; customer: CustomerAccount; token?: string }> {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to sign in');
    if (data.token) this.setCustomerToken(data.token);
    return data;
  },

  // Social Single Sign-On (Google / Facebook)
  async socialLoginCustomer(params: {
    provider: CustomerAuthProvider;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
  }): Promise<{ success: boolean; customer: CustomerAccount; token?: string }> {
    const res = await fetch('/api/customer/social-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Social authentication failed');
    if (data.token) this.setCustomerToken(data.token);
    return data;
  },

  async getCustomerMe(customerId?: string, email?: string): Promise<CustomerAccount> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (email) params.set('email', email);

    const res = await fetch(`/api/customer/me?${params.toString()}`, {
      headers: this.getCustomerAuthHeaders({ customerId, email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to get customer profile');
    return data.customer;
  },

  async updateCustomerProfile(customerId: string, updates: Partial<CustomerAccount>): Promise<CustomerAccount> {
    const res = await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: this.getCustomerAuthHeaders({ customerId }),
      body: JSON.stringify({ customerId, updates }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update profile');
    return data.customer;
  },

  async toggleCustomerFavourite(customerId: string, productId: string): Promise<string[]> {
    const res = await fetch('/api/customer/favourites/toggle', {
      method: 'POST',
      headers: this.getCustomerAuthHeaders({ customerId }),
      body: JSON.stringify({ customerId, productId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to toggle favourite');
    return data.favourites;
  },

  async getCustomerOrders(emailOrId: string): Promise<Order[]> {
    const isEmail = emailOrId.includes('@');
    const query = isEmail
      ? `email=${encodeURIComponent(emailOrId)}`
      : `customerId=${encodeURIComponent(emailOrId)}`;
    const res = await fetch(`/api/customer/orders?${query}`, {
      headers: this.getCustomerAuthHeaders(isEmail ? { email: emailOrId } : { customerId: emailOrId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load orders');
    return data.orders;
  },

  // POPIA Section 14 Compliance (Data Export & Account Erasure)
  async exportCustomerData(customerId: string): Promise<any> {
    const res = await fetch(`/api/customer/export-data?customerId=${encodeURIComponent(customerId)}`, {
      headers: this.getCustomerAuthHeaders({ customerId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to export customer data archive');
    return data.data;
  },

  async deleteCustomerAccount(customerId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/customer/delete-account', {
      method: 'POST',
      headers: this.getCustomerAuthHeaders({ customerId }),
      body: JSON.stringify({ customerId, confirmation: 'PERMANENTLY_DELETE' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to process account deletion');
    return data;
  },

  // Product Reviews
  async getProductReviews(productId: string): Promise<{ reviews: ProductReview[]; averageRating: number; count: number }> {
    const res = await fetch(`/api/products/${productId}/reviews`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load reviews');
    return {
      reviews: data.reviews,
      averageRating: data.averageRating,
      count: data.count,
    };
  },

  async postProductReview(productId: string, review: {
    authorName: string;
    rating: number;
    title: string;
    comment: string;
    userId?: string;
    customerEmail?: string;
  }): Promise<ProductReview> {
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to post review');
    return data.review;
  },

  // Price Drop Alerts
  async createPriceAlert(params: {
    productId: string;
    email: string;
    targetType: PriceAlertTargetType;
    customTargetPriceCents?: number;
    customerId?: string;
  }): Promise<{ success: boolean; alert: PriceAlert; message: string }> {
    const res = await fetch(`/api/products/${params.productId}/price-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to subscribe to price alert');
    return data;
  },

  async getPriceAlerts(email?: string): Promise<PriceAlert[]> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`/api/price-alerts${query}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch price alerts');
    return data.alerts;
  },

  async cancelPriceAlert(alertId: string, email?: string): Promise<{ success: boolean; message: string }> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`/api/price-alerts/${alertId}${query}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to cancel price alert');
    return data;
  },

  async simulatePriceDrop(productId: string, newPriceCents: number): Promise<{ success: boolean; triggeredAlerts: PriceAlert[]; product: Product }> {
    const res = await fetch(`/api/products/${productId}/simulate-price-drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPriceCents }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to simulate price drop');
    return data;
  },
};

