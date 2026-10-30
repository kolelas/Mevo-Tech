import {
  AuditLogEntry,
  CouponDiscount,
  CustomerAccount,
  Order,
  OrderStatus,
  PaymentProvider,
  Product,
  ProductReview,
  PromotionalBanner,
  ShippingAddress,
  ShippingMethod,
  StockMovement,
  StoreSettings,
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

  // Admin Token Management
  getAdminToken(): string | null {
    try {
      return localStorage.getItem('mevo_admin_token');
    } catch {
      return null;
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

  // Admin APIs (Protected by requireAdminAuth)
  async getAdminMetrics(): Promise<any> {
    const res = await fetch('/api/admin/metrics', {
      headers: this.getAdminAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      if (res.status === 401) {
        this.setAdminToken(null);
      }
      throw new Error(data.error || 'Failed to load metrics');
    }
    return data.metrics;
  },

  async getAdminOrders(status?: OrderStatus, search?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);

    const res = await fetch(`/api/admin/orders?${params.toString()}`, {
      headers: this.getAdminAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      if (res.status === 401) {
        this.setAdminToken(null);
      }
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
    const res = await fetch(`/api/admin/orders/${reference}/status`, {
      method: 'POST',
      headers: this.getAdminAuthHeaders(),
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
    const res = await fetch(`/api/admin/orders/${reference}/tracking`, {
      method: 'POST',
      headers: this.getAdminAuthHeaders(),
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
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: this.getAdminAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to adjust inventory');
    return data;
  },

  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const params = productId ? `?productId=${productId}` : '';
    const res = await fetch(`/api/admin/stock-movements${params}`, {
      headers: this.getAdminAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load stock movements');
    return data.movements;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/admin/audit-logs', {
      headers: this.getAdminAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load audit logs');
    return data.logs;
  },

  // Promotional Banners & Seasonal Deals
  async getActivePromotions(): Promise<PromotionalBanner[]> {
    const res = await fetch('/api/promotions/active');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load active promotions');
    return data.banners;
  },

  async getAdminPromotions(): Promise<PromotionalBanner[]> {
    const res = await fetch('/api/admin/promotions', {
      headers: this.getAdminAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load promotions');
    return data.banners;
  },

  async updatePromotion(id: string, updates: Partial<PromotionalBanner>, performedBy?: string): Promise<PromotionalBanner> {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: 'PUT',
      headers: this.getAdminAuthHeaders(),
      body: JSON.stringify({ ...updates, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update promotion');
    return data.banner;
  },

  async createProduct(productData: any, performedBy?: string): Promise<Product> {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: this.getAdminAuthHeaders(),
      body: JSON.stringify({ ...productData, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create product');
    return data.product;
  },

  async updateProduct(id: string, updates: any, performedBy?: string): Promise<Product> {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: this.getAdminAuthHeaders(),
      body: JSON.stringify({ ...updates, performedBy }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update product');
    return data.product;
  },

  // Customer Accounts
  async registerCustomer(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: ShippingAddress;
  }): Promise<{ success: boolean; customer: CustomerAccount }> {
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to register account');
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
};

