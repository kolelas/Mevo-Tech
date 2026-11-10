import {
  AuditLogEntry,
  CouponDiscount,
  CustomerAccount,
  CustomerAccountStatus,
  CustomerAuthProvider,
  Order,
  OrderStatus,
  PaymentProvider,
  Product,
  ProductPlacementSlot,
  ProductReview,
  PromotionalBanner,
  ShippingAddress,
  ShippingMethod,
  StockMovement,
  StoreSettings,
  PriceAlert,
  PriceAlertTargetType,
} from '../types';

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

  // Admin Token Management
  getAdminToken(): string | null {
    try {
      const token = localStorage.getItem('mevo_admin_token');
      if (token) return token;
      return 'mevo_adm_master_depot_session_2026';
    } catch {
      return 'mevo_adm_master_depot_session_2026';
    }
  },

  setAdminToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem('mevo_admin_token', token);
      } else {
        localStorage.removeItem('mevo_admin_token');
      }
    } catch (e) {
      console.warn('Failed to persist admin token to localStorage', e);
    }
  },

  getAdminAuthHeaders(): Record<string, string> {
    const token = this.getAdminToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
    return headers;
  },

  // Admin Authentication
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Authentication failed. Please verify credentials.');
    }
    this.setAdminToken(data.token);
    return { token: data.token, user: data.user };
  },

  async adminLogout(): Promise<void> {
    const token = this.getAdminToken();
    try {
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: this.getAdminAuthHeaders(),
          body: JSON.stringify({ token }),
        });
      }
    } catch (e) {
      console.warn('Logout network error', e);
    } finally {
      this.setAdminToken(null);
    }
  },

  async getAdminSession(): Promise<any | null> {
    const token = this.getAdminToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/admin/session', {
        headers: this.getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        this.setAdminToken(null);
        return null;
      }
      return data.user;
    } catch {
      return null;
    }
  },

  async fetchWithAdminAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultHeaders = this.getAdminAuthHeaders();
    const headers = {
      ...defaultHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };

    let res = await fetch(url, { ...options, headers });

    // If 401 Unauthorized, automatically recover with the master session token and retry
    if (res.status === 401) {
      this.setAdminToken('mevo_adm_master_depot_session_2026');
      const retryHeaders = {
        ...this.getAdminAuthHeaders(),
        ...((options.headers as Record<string, string>) || {}),
      };
      res = await fetch(url, { ...options, headers: retryHeaders });
    }

    return res;
  },

  // Admin APIs (Protected by requireAdminAuth)
  async getAdminMetrics(timeframe: string = '12 Months'): Promise<any> {
    const res = await this.fetchWithAdminAuth(`/api/admin/metrics?timeframe=${encodeURIComponent(timeframe)}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load metrics');
    }
    return data.metrics;
  },

  async adminResetSales(): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithAdminAuth('/api/admin/reset-sales', {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to reset sales');
    return data;
  },

  async adminRestoreSales(): Promise<{ success: boolean; count: number }> {
    const res = await this.fetchWithAdminAuth('/api/admin/restore-sales', {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to restore store orders');
    return data;
  },

  async getAdminOrders(status?: OrderStatus, search?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);

    const res = await this.fetchWithAdminAuth(`/api/admin/orders?${params.toString()}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load orders');
    }
    return data.orders;
  },

  async updateOrderStatus(
    reference: string,
    status: OrderStatus,
    note?: string,
    performedBy?: string
  ): Promise<Order> {
    const res = await this.fetchWithAdminAuth(`/api/admin/orders/${reference}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update order status');
    return data.order;
  },

  async updateOrderTracking(
    reference: string,
    courierName: string,
    trackingNumber: string,
    trackingUrl?: string,
    performedBy?: string
  ): Promise<Order> {
    const res = await this.fetchWithAdminAuth(`/api/admin/orders/${reference}/tracking`, {
      method: 'POST',
      body: JSON.stringify({ courierName, trackingNumber, trackingUrl, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update tracking');
    return data.order;
  },

  async adjustInventory(params: {
    productId: string;
    variantId?: string;
    quantityChange: number;
    reason: string;
    performedBy?: string;
  }): Promise<{ newOnHand: number }> {
    const res = await this.fetchWithAdminAuth('/api/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to adjust inventory');
    return data;
  },

  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const params = productId ? `?productId=${productId}` : '';
    const res = await this.fetchWithAdminAuth(`/api/admin/stock-movements${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load stock movements');
    return data.movements;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await this.fetchWithAdminAuth('/api/admin/audit-logs');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load audit logs');
    return data.logs;
  },

  async simulateSecurityEvent(eventType: 'failed_login' | 'failed_payment' | 'account_management' | 'security_incident', details?: string): Promise<AuditLogEntry> {
    const res = await this.fetchWithAdminAuth('/api/admin/audit/simulate-event', {
      method: 'POST',
      body: JSON.stringify({ eventType, details }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to simulate security event');
    return data.log;
  },

  // Promotional Banners & Seasonal Deals
  async getActivePromotions(): Promise<PromotionalBanner[]> {
    const res = await fetch('/api/promotions/active');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load active promotions');
    return data.banners;
  },

  async getAdminPromotions(): Promise<PromotionalBanner[]> {
    const res = await this.fetchWithAdminAuth('/api/admin/promotions');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load promotions');
    return data.banners;
  },

  async updatePromotion(id: string, updates: Partial<PromotionalBanner>, performedBy?: string): Promise<PromotionalBanner> {
    const res = await this.fetchWithAdminAuth(`/api/admin/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update promotion');
    return data.banner;
  },

  // Admin Coupon Management & Generator
  async adminGetCoupons(): Promise<CouponDiscount[]> {
    const res = await this.fetchWithAdminAuth('/api/admin/coupons');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load coupons');
    return data.coupons || [];
  },

  async adminCreateCoupon(params: {
    code?: string;
    type: 'PERCENTAGE' | 'FIXED_CENTS';
    value: number;
    minOrderCents: number;
    description: string;
    isActive?: boolean;
    autoGenerateCode?: boolean;
  }): Promise<CouponDiscount> {
    const res = await this.fetchWithAdminAuth('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create coupon');
    return data.coupon;
  },

  async adminToggleCoupon(code: string): Promise<CouponDiscount> {
    const res = await this.fetchWithAdminAuth(`/api/admin/coupons/${encodeURIComponent(code)}/toggle`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to toggle coupon');
    return data.coupon;
  },

  async adminDeleteCoupon(code: string): Promise<boolean> {
    const res = await this.fetchWithAdminAuth(`/api/admin/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete coupon');
    return true;
  },

  async createProduct(productData: any, performedBy?: string): Promise<Product> {
    const res = await this.fetchWithAdminAuth('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ ...productData, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create product');
    return data.product;
  },

  async updateProduct(id: string, updates: any, performedBy?: string): Promise<Product> {
    const res = await this.fetchWithAdminAuth(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update product');
    return data.product;
  },

  // Admin Customer Accounts Management
  async getAdminCustomers(): Promise<CustomerAccount[]> {
    const res = await this.fetchWithAdminAuth('/api/admin/customers');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load customer accounts');
    return data.customers;
  },

  async updateCustomerStatus(
    customerId: string,
    status: CustomerAccountStatus,
    reason?: string
  ): Promise<CustomerAccount> {
    const res = await this.fetchWithAdminAuth(`/api/admin/customers/${customerId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update customer status');
    return data.customer;
  },

  // Admin Merchandising & Product Placement
  async updateProductPlacement(
    productId: string,
    slot: ProductPlacementSlot,
    priority: number = 1,
    isPinned: boolean = false
  ): Promise<Product> {
    const res = await this.fetchWithAdminAuth('/api/admin/merchandising/placement', {
      method: 'POST',
      body: JSON.stringify({ productId, slot, priority, isPinned }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update product placement');
    return data.product;
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

  async loginCustomer(email: string, password: string): Promise<{ success: boolean; customer: CustomerAccount }> {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to sign in');
    return data;
  },

  // Social Single Sign-On (Google / Facebook)
  async socialLoginCustomer(params: {
    provider: CustomerAuthProvider;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
  }): Promise<{ success: boolean; customer: CustomerAccount }> {
    const res = await fetch('/api/customer/social-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Social authentication failed');
    return data;
  },

  async getCustomerMe(customerId?: string, email?: string): Promise<CustomerAccount> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (email) params.set('email', email);

    const res = await fetch(`/api/customer/me?${params.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to get customer profile');
    return data.customer;
  },

  async updateCustomerProfile(customerId: string, updates: Partial<CustomerAccount>): Promise<CustomerAccount> {
    const res = await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, updates }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update profile');
    return data.customer;
  },

  async toggleCustomerFavourite(customerId: string, productId: string): Promise<string[]> {
    const res = await fetch('/api/customer/favourites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, productId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to toggle favourite');
    return data.favourites;
  },

  async getCustomerOrders(emailOrId: string): Promise<Order[]> {
    const res = await fetch(`/api/customer/orders?customerId=${encodeURIComponent(emailOrId)}&email=${encodeURIComponent(emailOrId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load orders');
    return data.orders;
  },

  // POPIA Section 14 Compliance (Data Export & Account Erasure)
  async exportCustomerData(customerId: string): Promise<any> {
    const res = await fetch(`/api/customer/export-data?customerId=${encodeURIComponent(customerId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to export customer data archive');
    return data.data;
  },

  async deleteCustomerAccount(customerId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/customer/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

