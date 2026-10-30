export type UserRole =
  | 'owner'
  | 'admin'
  | 'inventory_manager'
  | 'fulfilment_manager'
  | 'customer_support'
  | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_EXPIRED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FULFILMENT_ON_HOLD'
  | 'CANCELLED';

export type PaymentProvider = 'payfast' | 'payflex' | 'ozow' | 'paystack' | 'crypto';

export type PaymentAttemptStatus = 'INITIATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  attributeName: string; // e.g. "Configuration" or "Storage"
  attributeValue: string; // e.g. "32GB RAM / 1TB NVMe"
  priceCents: number;
  promotionalPriceCents?: number;
  onHandQuantity: number;
  reservedQuantity: number;
}

export interface ProductSpecification {
  group: string;
  name: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  subCategory?: string;
  tagline: string;
  description: string;
  priceCents: number; // Integer cents in ZAR
  promotionalPriceCents?: number;
  costPriceCents: number;
  primaryImage: string;
  images: string[];
  specifications: ProductSpecification[];
  variants: ProductVariant[];
  onHandQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  warrantyPeriodMonths: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  type: 'RECEIPT' | 'SALE' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'RETURN' | 'DAMAGE';
  quantityChange: number; // positive or negative
  previousOnHand: number;
  newOnHand: number;
  reason: string;
  orderReference?: string;
  performedBy: string;
  timestamp: string;
}

export interface StockReservation {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reservedUntil: string; // ISO string
  orderReference?: string;
  sessionId: string;
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED' | 'RELEASED';
  createdAt: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  brand: string;
  variantTitle?: string;
  image: string;
  priceCents: number;
  quantity: number;
  availableStock: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  company?: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string; // e.g. "Gauteng", "Western Cape", "KwaZulu-Natal"
  postalCode: string;
  deliveryNotes?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  estimatedDelivery: string;
}

export interface OrderItemSnapshot {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  brand: string;
  variantTitle?: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  taxCents: number; // 15% VAT included
}

export interface PaymentAttempt {
  id: string;
  orderReference: string;
  provider: PaymentProvider;
  amountCents: number;
  currency: 'ZAR';
  status: PaymentAttemptStatus;
  providerTransactionId?: string;
  providerReference?: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  note: string;
  updatedBy: string;
  timestamp: string;
}

export interface Order {
  id: string;
  reference: string; // e.g. "MEV-2026-94812"
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number; // 15% South African VAT
  totalCents: number;
  currency: 'ZAR';
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentProvider;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  paymentAttempts: PaymentAttempt[];
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponDiscount {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_CENTS';
  value: number; // percentage (e.g. 10 for 10%) or cents
  minOrderCents: number;
  description: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  taxRatePercent: number; // 15
  freeShippingThresholdCents: number; // e.g. 150000 (R 1,500.00)
  payFastEnabled: boolean;
  payFlexEnabled: boolean;
  ozowEnabled: boolean;
  paystackEnabled: boolean;
  cryptoEnabled: boolean;
  maintenanceMode: boolean;
}

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  kicker: string;
  ctaText: string;
  targetCategory?: string;
  discountCode?: string;
  discountPercent?: number;
  endsAt: string; // ISO string
  isActive: boolean;
  theme: 'electric-blue' | 'charcoal' | 'emerald';
}

export interface ProductReview {
  id: string;
  productId: string;
  userId?: string;
  authorName: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer';
  defaultAddress?: ShippingAddress;
  favourites: string[];
  createdAt: string;
}
