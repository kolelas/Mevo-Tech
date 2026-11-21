import crypto from 'crypto';
import {
  AbandonedCart,
  AbandonedCartItem,
  AuditLogEntry,
  CartItem,
  CouponDiscount,
  CustomerAccount,
  CustomerAuthProvider,
  Order,
  OrderStatus,
  PaymentAttempt,
  Product,
  ProductReview,
  PromotionalBanner,
  RecoveredCartResponse,
  ShippingMethod,
  StockMovement,
  StockReservation,
  StoreSettings,
  PriceAlert,
  PriceAlertTargetType,
} from '../types';
import { canTransitionOrderStatus } from '../utils/calculations';
import { hashPassword, verifyPassword, signCustomerToken, sanitizeCustomerProfileUpdates } from './security';
import { calculateTargetPriceCents, shouldTriggerPriceAlert, validatePriceAlertEmail } from '../utils/priceAlerts';
import {
  DEFAULT_ABANDONMENT_THRESHOLD_MS,
  DEFAULT_CART_EXPIRY_MS,
  DEFAULT_MAX_REMINDERS,
  DEFAULT_REMINDER_COOLDOWN_MS,
  evaluateAbandonedCartTotals,
  isCartEligibleForAbandonment,
  isCartExpired,
  RawCartSyncItem,
  sanitizeCartSyncItems,
  shouldSendRecoveryReminder,
  suggestRecoveryIncentiveCode,
  verifyAbandonedCartOwnership,
} from '../utils/abandonedCart';

// Modern persistent transactional database state with automatic reservation expiry & abandoned cart sweep
class Database {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private reservations: Map<string, StockReservation> = new Map();
  private stockMovements: StockMovement[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private priceAlerts: Map<string, PriceAlert> = new Map();
  private abandonedCarts: Map<string, AbandonedCart> = new Map();

  private customers: Map<string, { account: CustomerAccount; passwordHash: string; verificationCode?: string; verificationExpires?: string }> = new Map();
  private reviews: Map<string, ProductReview[]> = new Map();
  private coupons: Map<string, CouponDiscount> = new Map();
  private promotionalBanners: Map<string, PromotionalBanner> = new Map();
  private settings: StoreSettings;
  private shippingMethods: ShippingMethod[] = [];

  constructor() {
    this.settings = {
      storeName: 'Mevo Tech',
      supportEmail: 'support@mevotech.co.za',
      supportPhone: '+27 11 884 9200',
      address: 'Sandton City Office Tower, 5th Floor, Sandton, Johannesburg, 2196, South Africa',
      taxRatePercent: 15,
      freeShippingThresholdCents: 150000, // R1,500.00
      payFastEnabled: true,
      payFlexEnabled: true,
      ozowEnabled: true,
      paystackEnabled: true,
      cryptoEnabled: true,
      maintenanceMode: false,
    };

    this.shippingMethods = [
      {
        id: 'standard',
        name: 'Standard Door-to-Door Courier',
        description: 'Reliable delivery via The Courier Guy / DPD Laser (2-4 business days nationwide)',
        priceCents: 15000, // R150.00 (free over R1,500)
        estimatedDelivery: '2–4 business days',
      },
      {
        id: 'express',
        name: 'Express Overnight Priority',
        description: 'Next business day priority air freight to major South African metros',
        priceCents: 28000, // R280.00
        estimatedDelivery: '1 business day (Major Metros)',
      },
    ];

    this.seedCoupons();
    this.seedPromotions();
    this.seedProducts();
    this.seedCustomers();
    this.seedReviews();
    this.seedCustomerOrders();
    this.seedAbandonedCarts();
    this.seedSystemActivityLogs();

    // Start background reservation expiry & abandoned cart sweep every 30 seconds (unref'd to allow clean exit)
    const cleanupInterval = setInterval(() => {
      this.reapExpiredReservations();
      this.sweepAbandonedCarts();
    }, 30000);
    if (typeof cleanupInterval === 'object' && cleanupInterval !== null && 'unref' in cleanupInterval) {
      cleanupInterval.unref();
    }
  }

  //Seeded customers below

  private seedCustomers() {
    const defaultCustomer: CustomerAccount = {
      id: 'cust_blacquebeat',
      email: 'blacquebeat@gmail.com',
      name: 'Blacque Beat',
      phone: '+27 83 456 7890',
      role: 'customer',
      authProvider: 'google',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastLoginAt: new Date().toISOString(),
      favourites: ['prod_lumina_34_oled', 'prod_aeon_elite_anc'],
      defaultAddress: {
        fullName: 'Blacque Beat',
        email: 'blacquebeat@gmail.com',
        phone: '+27 83 456 7890',
        streetAddress: '14 Rivonia Road',
        suburb: 'Sandhurst',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        deliveryNotes: 'Depot courier dispatch · Ring security buzzer at gate',
      },
      emailVerified: true,
      createdAt: '2026-01-15T08:00:00Z',
    };

    this.customers.set(defaultCustomer.id, {
      account: defaultCustomer,
      passwordHash: hashPassword('Password@2026'),
    });

    const shopperDemo: CustomerAccount = {
      id: 'cust_shopper_demo',
      email: 'shopper@mevotech.co.za',
      name: 'Valued SA Shopper',
      phone: '+27 82 555 0100',
      role: 'customer',
      authProvider: 'local',
      status: 'active',
      lastLoginAt: '2026-10-25T11:20:00Z',
      favourites: ['prod_studiobook_pro_16'],
      defaultAddress: {
        fullName: 'Valued SA Shopper',
        email: 'shopper@mevotech.co.za',
        phone: '+27 82 555 0100',
        streetAddress: '88 Grayston Drive',
        suburb: 'Sandown',
        city: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
      },
      emailVerified: true,
      createdAt: '2026-02-01T08:00:00Z',
    };

    this.customers.set(shopperDemo.id, {
      account: shopperDemo,
      passwordHash: hashPassword('Password@2026'),
    });

    // Restricted Account: can login and browse, but restricted from placing new checkout orders
    const restrictedCustomer: CustomerAccount = {
      id: 'cust_restricted_demo',
      email: 'sipho.dlm@facebook-login.co.za',
      name: 'Sipho Dlamini',
      phone: '+27 82 999 1122',
      role: 'customer',
      authProvider: 'facebook',
      status: 'restricted',
      restrictionReason: 'Temporary security verification required: 2 consecutive high-value chargeback inquiries from bank',
      statusUpdatedAt: '2026-10-28T14:00:00Z',
      lastLoginAt: '2026-10-29T09:15:00Z',
      favourites: ['prod_lumina_34_oled'],
      defaultAddress: {
        fullName: 'Sipho Dlamini',
        email: 'sipho.dlm@facebook-login.co.za',
        phone: '+27 82 999 1122',
        streetAddress: '45 Kloof Street',
        suburb: 'Gardens',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
      },
      createdAt: '2026-02-10T10:00:00Z',
    };

    this.customers.set(restrictedCustomer.id, {
      account: restrictedCustomer,
      passwordHash: hashPassword('Password@2026'),
    });

    // Blocked Account: completely suspended from accessing the platform / login blocked
    const blockedCustomer: CustomerAccount = {
      id: 'cust_blocked_bot',
      email: 'fraud.origin@card-tester.net',
      name: 'Fraud Suspicion User',
      phone: '+27 80 000 9999',
      role: 'customer',
      authProvider: 'local',
      status: 'blocked',
      restrictionReason: 'Automated card-testing script detected by rate limiting heuristics (15 rapid failed transactions)',
      statusUpdatedAt: '2026-10-30T02:15:00Z',
      lastLoginAt: '2026-10-30T02:14:00Z',
      favourites: [],
      createdAt: '2026-03-01T02:15:00Z',
    };

    this.customers.set(blockedCustomer.id, {
      account: blockedCustomer,
      passwordHash: hashPassword('Password@2026'),
    });
  }

  private seedReviews() {
    const initialReviews: Record<string, ProductReview[]> = {
      prod_lumina_34_oled: [
        {
          id: 'rev_lumina_1',
          productId: 'prod_lumina_34_oled',
          userId: 'cust_blacquebeat',
          authorName: 'Blacque Beat',
          rating: 5,
          title: 'Unbelievable QD-OLED contrast and zero ghosting',
          comment: 'The 175Hz refresh rate makes simulation and video editing ultra smooth. The deep blacks and wide color gamut are unmatched.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-26T14:15:00Z',
        },
        {
          id: 'rev_lumina_2',
          productId: 'prod_lumina_34_oled',
          authorName: 'Farhan K.',
          rating: 5,
          title: 'They look beautiful, and the display quality is just next level!',
          comment: 'Packaged securely and arrived next day in Sandton. The single cable USB-C 90W PD powers my laptop with ease.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-22T09:40:00Z',
        },
        {
          id: 'rev_lumina_3',
          productId: 'prod_lumina_34_oled',
          authorName: 'Thabo M.',
          rating: 5,
          title: 'I am happy with the monitor, right size and incredible HDR',
          comment: 'Best display investment for engineering and gaming. Official 3-year burn-in local warranty provided total peace of mind.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-18T16:20:00Z',
        },
      ],
      prod_aeon_elite_anc: [
        {
          id: 'rev_aeon_1',
          productId: 'prod_aeon_elite_anc',
          userId: 'cust_blacquebeat',
          authorName: 'Blacque Beat',
          rating: 5,
          title: 'Audiophile planar precision with great noise cancelling',
          comment: 'The planar magnetic drivers provide staggering acoustic resolution. Active noise cancellation blocks out background office hum effortlessly.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-27T11:00:00Z',
        },
        {
          id: 'rev_aeon_2',
          productId: 'prod_aeon_elite_anc',
          authorName: 'Jean-Pierre D.',
          rating: 5,
          title: 'Superb soundstage and build quality',
          comment: 'Aluminum hinges, memory foam ear cups, and 45dB noise suppression. Battery easily lasts 40+ hours.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-20T17:30:00Z',
        },
      ],
      prod_studiobook_pro_16: [
        {
          id: 'rev_sb_1',
          productId: 'prod_studiobook_pro_16',
          authorName: 'Sarah L.',
          rating: 5,
          title: 'Absolute workstation powerhouse',
          comment: 'Liquid metal cooling keeps this cool even during 4K RED RAW renders. The 120Hz OLED screen is color graded factory-calibrated.',
          isVerifiedPurchase: true,
          createdAt: '2026-10-24T12:00:00Z',
        },
      ],
    };

    for (const [prodId, revList] of Object.entries(initialReviews)) {
      this.reviews.set(prodId, revList);
    }
  }

  private seedCustomerOrders() {
    const deliveredOrder: Order = {
      id: 'ord_seed_blacque_1',
      reference: 'MEV-2026-84910',
      customerId: 'cust_blacquebeat',
      customerEmail: 'blacquebeat@gmail.com',
      customerName: 'Blacque Beat',
      customerPhone: '+27 83 456 7890',
      status: 'DELIVERED',
      items: [
        {
          productId: 'prod_aeon_elite_anc',
          sku: 'MEV-AUD-AEON',
          name: 'Aeon Elite Wireless ANC Headphones',
          brand: 'Aeon Acoustics',
          unitPriceCents: 449900,
          quantity: 1,
          totalCents: 449900,
          taxCents: 58683,
        },
      ],
      subtotalCents: 449900,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 58683,
      totalCents: 449900,
      currency: 'ZAR',
      shippingAddress: {
        fullName: 'Blacque Beat',
        email: 'blacquebeat@gmail.com',
        phone: '+27 83 456 7890',
        streetAddress: '14 Rivonia Road',
        suburb: 'Sandhurst',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
      },
      shippingMethod: {
        id: 'standard',
        name: 'Standard Door-to-Door Courier',
        description: 'Reliable delivery via The Courier Guy (Free over R1,500)',
        priceCents: 0,
        estimatedDelivery: '2–4 business days',
      },
      paymentMethod: 'payflex',
      courierName: 'The Courier Guy',
      trackingNumber: 'TCG-JHB-84910',
      trackingUrl: 'https://thecourierguy.co.za/tracking?waybill=TCG-JHB-84910',
      dispatchedAt: '2026-10-23T09:00:00Z',
      deliveredAt: '2026-10-25T14:30:00Z',
      paymentAttempts: [
        {
          id: 'pay_seed_1',
          orderReference: 'MEV-2026-84910',
          provider: 'payflex',
          amountCents: 449900,
          currency: 'ZAR',
          status: 'SUCCESSFUL',
          providerTransactionId: 'PFX_84910_OK',
          createdAt: '2026-10-23T08:30:00Z',
          updatedAt: '2026-10-23T08:31:00Z',
        },
      ],
      statusHistory: [
        { status: 'PENDING_PAYMENT', note: 'Order placed via online store', updatedBy: 'Customer', timestamp: '2026-10-23T08:30:00Z' },
        { status: 'PAID', note: 'Payflex 4-instalment plan approved', updatedBy: 'Payment Gateway', timestamp: '2026-10-23T08:31:00Z' },
        { status: 'PROCESSING', note: 'Depot picked and bench-verified at Sandton warehouse', updatedBy: 'Warehouse Operations', timestamp: '2026-10-23T08:45:00Z' },
        { status: 'SHIPPED', note: 'Handed over to The Courier Guy driver', updatedBy: 'Logistics Officer', timestamp: '2026-10-23T09:00:00Z' },
        { status: 'DELIVERED', note: 'Signed for by Blacque Beat at Sandhurst gate', updatedBy: 'Courier Driver', timestamp: '2026-10-25T14:30:00Z' },
      ],
      createdAt: '2026-10-23T08:30:00Z',
      updatedAt: '2026-10-25T14:30:00Z',
    };

    const shippedOrder: Order = {
      id: 'ord_seed_blacque_2',
      reference: 'MEV-2026-91044',
      customerId: 'cust_blacquebeat',
      customerEmail: 'blacquebeat@gmail.com',
      customerName: 'Blacque Beat',
      customerPhone: '+27 83 456 7890',
      status: 'SHIPPED',
      items: [
        {
          productId: 'prod_lumina_34_oled',
          sku: 'MEV-MON-LUMINA34',
          name: 'Lumina 34" Curved QD-OLED Gaming Monitor',
          brand: 'Mevo Lumina',
          unitPriceCents: 2199900,
          quantity: 1,
          totalCents: 2199900,
          taxCents: 286943,
        },
      ],
      subtotalCents: 2199900,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 286943,
      totalCents: 2199900,
      currency: 'ZAR',
      shippingAddress: {
        fullName: 'Blacque Beat',
        email: 'blacquebeat@gmail.com',
        phone: '+27 83 456 7890',
        streetAddress: '14 Rivonia Road',
        suburb: 'Sandhurst',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
      },
      shippingMethod: {
        id: 'express',
        name: 'Express Overnight Priority',
        description: 'Next business day priority air freight to major South African metros',
        priceCents: 0,
        estimatedDelivery: '1 business day (Major Metros)',
      },
      paymentMethod: 'payfast',
      courierName: 'RAM Hand-to-Hand Couriers',
      trackingNumber: 'RAM-EXP-91044',
      trackingUrl: 'https://ram.co.za/track?awb=RAM-EXP-91044',
      dispatchedAt: '2026-10-29T10:15:00Z',
      paymentAttempts: [
        {
          id: 'pay_seed_2',
          orderReference: 'MEV-2026-91044',
          provider: 'payfast',
          amountCents: 2199900,
          currency: 'ZAR',
          status: 'SUCCESSFUL',
          providerTransactionId: 'PF_91044_VERIFIED',
          createdAt: '2026-10-29T09:50:00Z',
          updatedAt: '2026-10-29T09:52:00Z',
        },
      ],
      statusHistory: [
        { status: 'PENDING_PAYMENT', note: 'Order placed via online store', updatedBy: 'Customer', timestamp: '2026-10-29T09:50:00Z' },
        { status: 'PAID', note: 'Instant EFT payment confirmed by PayFast', updatedBy: 'Payment Gateway', timestamp: '2026-10-29T09:52:00Z' },
        { status: 'PROCESSING', note: 'Pre-flight calibration and double box packaging at Sandton Depot', updatedBy: 'Warehouse Operations', timestamp: '2026-10-29T10:00:00Z' },
        { status: 'SHIPPED', note: 'Collected by RAM Couriers express line haul vehicle', updatedBy: 'Logistics Officer', timestamp: '2026-10-29T10:15:00Z' },
      ],
      createdAt: '2026-10-29T09:50:00Z',
      updatedAt: '2026-10-29T10:15:00Z',
    };

    this.orders.set(deliveredOrder.reference, deliveredOrder);
    this.orders.set(shippedOrder.reference, shippedOrder);
  }

  private seedCoupons() {
    const initialCoupons: CouponDiscount[] = [
      {
        code: 'MEVO150',
        type: 'FIXED_CENTS',
        value: 15000, // R150.00 off
        minOrderCents: 150000, // R1,500 minimum
        description: 'R150 off orders over R1,500 across entire store',
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 42,
      },
      {
        code: 'MEVOSPRING',
        type: 'PERCENTAGE',
        value: 10,
        minOrderCents: 100000, // R1,000 minimum
        description: '10% discount on tech orders over R1,000.00',
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 89,
      },
      {
        code: 'FIRSTTECH',
        type: 'FIXED_CENTS',
        value: 25000, // R250.00 off
        minOrderCents: 200000, // R2,000 minimum
        description: 'R250.00 off first tech orders over R2,000.00',
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 31,
      },
      {
        code: 'MEVOSUPER',
        type: 'PERCENTAGE',
        value: 15,
        minOrderCents: 350000, // R3,500 minimum
        description: '15% off premium workstation hardware and rigs',
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 18,
      },
    ];

    for (const c of initialCoupons) {
      this.coupons.set(c.code.toUpperCase(), c);
    }
  }

  private seedPromotions() {
    // 3 days in the future for current seasonal campaign
    const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const banners: PromotionalBanner[] = [
      {
        id: 'promo_spring_2026',
        kicker: 'SOUTH AFRICA SPRING TECH SALE',
        title: 'Spring Creator & Pro Workstation Upgrade',
        subtitle: 'Save up to R 4,000 on StudioBook laptops and 34" Curved OLED displays with immediate Sandton dispatch. Use code MEVOSPRING for an extra 10% off.',
        ctaText: 'Shop Creator Deals',
        targetCategory: 'Laptops & Notebooks',
        discountCode: 'MEVOSPRING',
        discountPercent: 10,
        endsAt,
        isActive: true,
        theme: 'electric-blue',
      },
      {
        id: 'promo_flash_audio_2026',
        kicker: 'LIMITED 48-HOUR FLASH INVENTORY',
        title: 'Audiophile Planar Headsets & CNC Mechanical Keyboards',
        subtitle: 'Aeon Elite ANC headphones and custom gasket mechanical gear in stock. Split into 4x interest-free instalments with Payflex.',
        ctaText: 'Explore Audio & Gear',
        targetCategory: 'Audio & Peripherals',
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        theme: 'charcoal',
      },
    ];

    for (const b of banners) {
      this.promotionalBanners.set(b.id, b);
    }
  }

  private seedProducts() {
    const now = new Date().toISOString();

    const initialProducts: Product[] = [
      {
        id: 'prod_studiobook_16',
        slug: 'mevo-studiobook-pro-16',
        name: 'Mevo StudioBook Pro 16',
        sku: 'MEV-NB-16PRO',
        brand: 'Mevo Precision',
        category: 'Laptops & Notebooks',
        subCategory: 'Creator & Workstation',
        tagline: 'Aerospace-grade aluminum 16-inch workstation with 3.2K 120Hz OLED display',
        description: 'Engineered in precision CNC aluminum, the StudioBook Pro 16 packs the flagship Intel Core Ultra 9 processor, 32GB LPDDR5X RAM, and 1TB NVMe PCIe 4.0 storage. Features factory color-calibrated 100% DCI-P3 OLED panel, glass precision haptic touchpad, and 90Wh all-day battery with 140W USB-C GaN fast charging.',
        priceCents: 3899900, // R 38,999.00
        promotionalPriceCents: 3499900, // R 34,999.00
        costPriceCents: 2700000,
        primaryImage: '/src/assets/images/product_laptop_pro_1793053698062.jpg',
        images: [
          '/src/assets/images/product_laptop_pro_1793053698062.jpg',
          '/src/assets/images/hero_tech_showcase_1793053698167.jpg',
        ],
        specifications: [
          { group: 'Processor', name: 'CPU', value: 'Intel Core Ultra 9 185H (16 Cores, 22 Threads, up to 5.1GHz)' },
          { group: 'Display', name: 'Panel', value: '16.0" 3.2K (3200x2000) OLED 16:10, 120Hz, 0.2ms, 600 nits HDR' },
          { group: 'Memory & Storage', name: 'RAM', value: '32GB LPDDR5X 7467MHz Dual Channel' },
          { group: 'Memory & Storage', name: 'SSD', value: '1TB M.2 PCIe 4.0 NVMe (Expandable slot available)' },
          { group: 'Connectivity', name: 'Ports', value: '2x Thunderbolt 4, 1x HDMI 2.1, 1x USB-A 3.2 Gen2, SD Express 7.0' },
          { group: 'Battery', name: 'Capacity', value: '90Wh Lithium-Polymer, up to 14 hours video playback' },
        ],
        variants: [
          {
            id: 'var_sb16_32_1tb',
            sku: 'MEV-NB-16PRO-32-1TB',
            title: '32GB RAM / 1TB NVMe SSD',
            attributeName: 'Configuration',
            attributeValue: '32GB / 1TB',
            priceCents: 3499900,
            onHandQuantity: 14,
            reservedQuantity: 0,
          },
          {
            id: 'var_sb16_64_2tb',
            sku: 'MEV-NB-16PRO-64-2TB',
            title: '64GB RAM / 2TB NVMe SSD',
            attributeName: 'Configuration',
            attributeValue: '64GB / 2TB',
            priceCents: 4299900,
            onHandQuantity: 8,
            reservedQuantity: 0,
          },
        ],
        onHandQuantity: 22,
        reservedQuantity: 0,
        lowStockThreshold: 4,
        isActive: true,
        isFeatured: true,
        isNewArrival: true,
        warrantyPeriodMonths: 24, // 2-Year South African on-site warranty
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_lumina_34_oled',
        slug: 'lumina-34-curved-qd-oled',
        name: 'Lumina 34" Curved QD-OLED Creator Monitor',
        sku: 'MEV-MON-34OLED',
        brand: 'Lumina Display',
        category: 'Monitors & Displays',
        subCategory: 'Curved OLED',
        tagline: '3440x1440 UWQHD 175Hz 0.03ms QD-OLED with factory calibration',
        description: 'Immerse yourself in infinite contrast and ultra-fast 0.03ms response times with Quantum Dot OLED technology. Equipped with 1800R curvature, 99.3% DCI-P3 color gamut, Delta E < 1 factory calibration report, USB-C 90W Power Delivery, and integrated KVM switch.',
        priceCents: 2199900, // R 21,999.00
        costPriceCents: 1600000,
        primaryImage: '/src/assets/images/product_monitor_ultrawide_1793053698041.jpg',
        images: ['/src/assets/images/product_monitor_ultrawide_1793053698041.jpg'],
        specifications: [
          { group: 'Panel', name: 'Technology', value: 'Samsung Quantum Dot OLED (QD-OLED)' },
          { group: 'Resolution', name: 'Native', value: '3440 x 1440 UWQHD (21:9 Aspect Ratio)' },
          { group: 'Refresh Rate', name: 'Frequency', value: '175Hz with AMD FreeSync Premium Pro' },
          { group: 'Color Accuracy', name: 'Gamut', value: '99.3% DCI-P3, 149% sRGB, True Black 400' },
          { group: 'I/O', name: 'Connectivity', value: '2x DisplayPort 1.4, 1x HDMI 2.1, USB-C with 90W PD, 4x USB 3.2' },
        ],
        variants: [],
        onHandQuantity: 11,
        reservedQuantity: 0,
        lowStockThreshold: 3,
        isActive: true,
        isFeatured: true,
        warrantyPeriodMonths: 36, // 3-Year Burn-in protection warranty
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_apex_station_pro',
        slug: 'apex-station-pro-workstation',
        name: 'Apex Station Pro Custom Workstation',
        sku: 'MEV-PC-APEXPRO',
        brand: 'Mevo Precision',
        category: 'Desktops & Workstations',
        subCategory: 'High Performance',
        tagline: 'Liquid-cooled AMD Ryzen 9 7950X, RTX 4080 Super, 64GB DDR5',
        description: 'Built by Mevo Tech master technicians in Johannesburg. Each system undergoes a rigorous 48-hour thermal and stability benchmark prior to dispatch. Encased in a brushed aluminum and tinted tempered glass chassis with dual 360mm custom liquid cooling loops.',
        priceCents: 5899900, // R 58,999.00
        promotionalPriceCents: 5499900, // R 54,999.00
        costPriceCents: 4400000,
        primaryImage: '/src/assets/images/product_desktop_workstation_1793053699096.jpg',
        images: ['/src/assets/images/product_desktop_workstation_1793053699096.jpg'],
        specifications: [
          { group: 'Processor', name: 'CPU', value: 'AMD Ryzen 9 7950X (16 Cores, 32 Threads, 5.7GHz Max Boost)' },
          { group: 'Graphics', name: 'GPU', value: 'NVIDIA GeForce RTX 4080 Super 16GB GDDR6X' },
          { group: 'Motherboard', name: 'Chipset', value: 'ASUS ROG Strix X670E-E Gaming WiFi' },
          { group: 'RAM', name: 'Capacity', value: '64GB (2x32GB) Corsair Dominator Titanium DDR5 6000MHz' },
          { group: 'Storage', name: 'Primary SSD', value: '2TB Samsung 990 PRO PCIe 4.0 NVMe M.2' },
          { group: 'Power', name: 'PSU', value: 'Corsair RM1000x 1000W 80+ Gold Fully Modular' },
        ],
        variants: [],
        onHandQuantity: 5,
        reservedQuantity: 0,
        lowStockThreshold: 2,
        isActive: true,
        isFeatured: true,
        warrantyPeriodMonths: 36,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_aeon_elite_anc',
        slug: 'aeon-elite-wireless-anc-headphones',
        name: 'Aeon Elite Wireless ANC Headphones',
        sku: 'MEV-AUD-AEON',
        brand: 'Aeon Acoustics',
        category: 'Audio & Peripherals',
        subCategory: 'Over-Ear Headphones',
        tagline: 'Audiophile planar-magnetic precision with 45dB hybrid adaptive noise cancelling',
        description: 'Precision engineered for discerning listeners and audio production. Features custom 40mm beryllium diaphragm drivers, Sony LDAC high-resolution wireless streaming, memory foam protein leather earcups, and crystal-clear beamforming microphone array for conference calls.',
        priceCents: 649900, // R 6,499.00
        costPriceCents: 420000,
        primaryImage: '/src/assets/images/product_headphones_anc_1793053698607.jpg',
        images: ['/src/assets/images/product_headphones_anc_1793053698607.jpg'],
        specifications: [
          { group: 'Acoustics', name: 'Transducer', value: '40mm Custom Beryllium-Coated Dynamic Drivers' },
          { group: 'Noise Cancellation', name: 'ANC', value: 'Adaptive Hybrid Active Noise Cancellation (-45dB attenuation)' },
          { group: 'Wireless', name: 'Codecs', value: 'LDAC, AAC, aptX Adaptive, SBC, Bluetooth 5.3 Multipoint' },
          { group: 'Battery', name: 'Playtime', value: '40 hours with ANC active, 15 min charge provides 6 hours' },
          { group: 'Weight', name: 'Mass', value: '265g' },
        ],
        variants: [],
        onHandQuantity: 34,
        reservedQuantity: 0,
        lowStockThreshold: 6,
        isActive: true,
        isFeatured: true,
        isNewArrival: true,
        warrantyPeriodMonths: 24,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_keychron_pro',
        slug: 'nova-pro-wireless-mechanical-keyboard',
        name: 'Nova Pro CNC Wireless Mechanical Keyboard',
        sku: 'MEV-KB-NOVAPRO',
        brand: 'Nova Gear',
        category: 'Audio & Peripherals',
        subCategory: 'Keyboards',
        tagline: 'Gasket-mounted CNC aluminum 75% mechanical keyboard with hot-swappable switches',
        description: 'Custom acoustic dampening foam, factory lubed tactile switches, PBT double-shot keycaps, and triple connectivity (Bluetooth 5.2, 2.4GHz wireless dongle, and USB-C). Compatible with macOS and Windows.',
        priceCents: 329900, // R 3,299.00
        costPriceCents: 210000,
        primaryImage: '/src/assets/images/hero_tech_showcase_1793053698167.jpg',
        images: ['/src/assets/images/hero_tech_showcase_1793053698167.jpg'],
        specifications: [
          { group: 'Layout', name: 'Form Factor', value: '75% Compact (84 Keys)' },
          { group: 'Mounting', name: 'Style', value: 'Gasket Mount with Poron foam dampening' },
          { group: 'Switches', name: 'Type', value: 'Gateron Pro Brown Tactile (Hot-swappable 3/5 pin)' },
          { group: 'Connectivity', name: 'Modes', value: 'Tri-mode (2.4GHz Wireless, Bluetooth 5.2, USB-C)' },
        ],
        variants: [],
        onHandQuantity: 18,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        isActive: true,
        warrantyPeriodMonths: 12,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_terasync_4tb_nvme',
        slug: 'terasync-gen5-4tb-nvme-ssd',
        name: 'TeraSync Gen5 4TB NVMe M.2 SSD',
        sku: 'MEV-SSD-4TBG5',
        brand: 'TeraSync',
        category: 'Storage Devices',
        subCategory: 'Internal SSDs',
        tagline: 'Next-gen PCIe 5.0 speed up to 14,000 MB/s sequential read with graphene heat spreader',
        description: 'Unleash peak sustained read and write throughput for 8K video editing, heavy gaming, and AI data models. Engineered with 232-layer 3D TLC NAND and dedicated Phison E26 controller.',
        priceCents: 899900, // R 8,999.00
        costPriceCents: 680000,
        primaryImage: '/src/assets/images/category_storage_ssd_1793214066602.jpg',
        images: ['/src/assets/images/category_storage_ssd_1793214066602.jpg'],
        specifications: [
          { group: 'Performance', name: 'Sequential Read', value: 'Up to 14,000 MB/s' },
          { group: 'Performance', name: 'Sequential Write', value: 'Up to 12,000 MB/s' },
          { group: 'Form Factor', name: 'Interface', value: 'PCIe Gen 5.0 x4, NVMe 2.0 (M.2 2280)' },
          { group: 'Endurance', name: 'TBW', value: '3000 Terabytes Written' },
        ],
        variants: [],
        onHandQuantity: 15,
        reservedQuantity: 0,
        lowStockThreshold: 3,
        isActive: true,
        warrantyPeriodMonths: 60, // 5-year warranty
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_terasync_extreme_portable',
        slug: 'terasync-rugged-extreme-2tb-portable-ssd',
        name: 'TeraSync Rugged Extreme 2TB Portable USB4 SSD',
        sku: 'MEV-SSD-2TBEXT',
        brand: 'TeraSync',
        category: 'Storage Devices',
        subCategory: 'External & Portable SSDs',
        tagline: 'Up to 3,800 MB/s USB4 / Thunderbolt speeds with IP67 dust & drop-proof armor',
        description: 'Designed for on-location South African documentary filmmakers and photographers. Encased in shock-absorbing elastomer with IP67 water, dust, and 3-meter drop resistance. Works natively across Mac, Windows, iPadOS, and Android.',
        priceCents: 549900, // R 5,499.00
        costPriceCents: 390000,
        primaryImage: '/src/assets/images/category_storage_ssd_1793214066602.jpg',
        images: ['/src/assets/images/category_storage_ssd_1793214066602.jpg'],
        specifications: [
          { group: 'Performance', name: 'Transfer Rate', value: 'Up to 3,800 MB/s via USB4 40Gbps' },
          { group: 'Durability', name: 'Ingress Protection', value: 'IP67 Water and Dust Resistant, 3m drop drop-tested' },
          { group: 'Security', name: 'Encryption', value: 'Hardware AES 256-bit password protection' },
        ],
        variants: [],
        onHandQuantity: 20,
        reservedQuantity: 0,
        lowStockThreshold: 4,
        isActive: true,
        isNewArrival: true,
        warrantyPeriodMonths: 36,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_aurora_wifi7_router',
        slug: 'aurora-wifi-7-tri-band-smart-mesh-router',
        name: 'Aurora WiFi 7 Tri-Band Smart Mesh Router',
        sku: 'MEV-NET-AURORA7',
        brand: 'Aurora Systems',
        category: 'Networking & Smart Home',
        subCategory: 'Routers & Mesh',
        tagline: '19 Gbps combined tri-band WiFi 7 with dual 10GbE multi-gigabit ethernet ports',
        description: 'Future-proof your South African fiber connection. Supports 320MHz ultra-wide channels, Multi-Link Operation (MLO), up to 250 connected devices, and comprehensive built-in parental and network security.',
        priceCents: 949900, // R 9,499.00
        costPriceCents: 710000,
        primaryImage: '/src/assets/images/category_wifi7_router_1793214079340.jpg',
        images: ['/src/assets/images/category_wifi7_router_1793214079340.jpg'],
        specifications: [
          { group: 'Wireless', name: 'Standard', value: 'IEEE 802.11be WiFi 7 (6GHz, 5GHz, 2.4GHz)' },
          { group: 'Throughput', name: 'Speed', value: 'Up to 19,000 Mbps aggregate' },
          { group: 'Ports', name: 'Ethernet', value: '2x 10GbE WAN/LAN, 4x 2.5GbE LAN, 1x USB 3.0' },
          { group: 'Coverage', name: 'Area', value: 'Up to 350 sq meters per node' },
        ],
        variants: [],
        onHandQuantity: 12,
        reservedQuantity: 0,
        lowStockThreshold: 3,
        isActive: true,
        warrantyPeriodMonths: 24,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_aerobook_14',
        slug: 'mevo-aerobook-ultra-14',
        name: 'Mevo AeroBook Ultra 14',
        sku: 'MEV-NB-14AERO',
        brand: 'Mevo Precision',
        category: 'Laptops & Notebooks',
        subCategory: 'Ultrabooks & Portables',
        tagline: '1.08kg Carbon-magnesium ultralight with Intel Core Ultra 7 and 2.8K 120Hz OLED',
        description: 'Engineered for executive mobility and remote work across South Africa. Features a featherlight magnesium-carbon chassis, 18-hour real-world battery life, 65W GaN fast charger, and anti-glare 2.8K 120Hz OLED screen.',
        priceCents: 2699900, // R 26,999.00
        promotionalPriceCents: 2499900,
        costPriceCents: 1950000,
        primaryImage: '/src/assets/images/product_laptop_pro_1793053698062.jpg',
        images: ['/src/assets/images/product_laptop_pro_1793053698062.jpg'],
        specifications: [
          { group: 'Processor', name: 'CPU', value: 'Intel Core Ultra 7 155H (16 Cores, up to 4.8GHz)' },
          { group: 'Display', name: 'Panel', value: '14.0" 2.8K (2880x1800) OLED 16:10, 120Hz, 500 nits' },
          { group: 'Memory & Storage', name: 'RAM', value: '32GB LPDDR5X 7467MHz' },
          { group: 'Memory & Storage', name: 'SSD', value: '1TB PCIe 4.0 NVMe M.2' },
          { group: 'Weight', name: 'Mass', value: '1.08 kg' },
        ],
        variants: [],
        onHandQuantity: 16,
        reservedQuantity: 0,
        lowStockThreshold: 4,
        isActive: true,
        isNewArrival: true,
        warrantyPeriodMonths: 24,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_lumina_27_colormaster',
        slug: 'lumina-colormaster-27-4k-display',
        name: 'Lumina ColorMaster 27" 4K Creator Monitor',
        sku: 'MEV-MON-27CM',
        brand: 'Lumina Display',
        category: 'Monitors & Displays',
        subCategory: 'Color-Critical Displays',
        tagline: '3840x2160 IPS Black with 2000:1 contrast, 99% AdobeRGB & 96W USB-C PD',
        description: 'The definitive reference monitor for South African graphic designers, photographers, and video editors. IPS Black technology delivers double the contrast ratio of traditional IPS panels. Equipped with built-in motorized colorimeter for automated hardware calibration.',
        priceCents: 1449900, // R 14,499.00
        costPriceCents: 1050000,
        primaryImage: '/src/assets/images/product_monitor_ultrawide_1793053698041.jpg',
        images: ['/src/assets/images/product_monitor_ultrawide_1793053698041.jpg'],
        specifications: [
          { group: 'Panel', name: 'Technology', value: '27.0" 4K UHD (3840x2160) IPS Black' },
          { group: 'Color Accuracy', name: 'Gamut', value: '99% Adobe RGB, 98% DCI-P3, Delta E < 1.5' },
          { group: 'Connectivity', name: 'I/O', value: 'Thunderbolt 4 (96W PD daisy-chain), HDMI 2.1, DisplayPort 1.4' },
          { group: 'Stand', name: 'Ergonomics', value: 'Height, swivel, tilt, and 90° pivot' },
        ],
        variants: [],
        onHandQuantity: 18,
        reservedQuantity: 0,
        lowStockThreshold: 4,
        isActive: true,
        warrantyPeriodMonths: 36,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_apex_mini_studio',
        slug: 'apex-studio-mini-ai-workstation',
        name: 'Apex Studio Mini AI Workstation',
        sku: 'MEV-PC-APEXMINI',
        brand: 'Mevo Precision',
        category: 'Desktops & Workstations',
        subCategory: 'Compact Workstations',
        tagline: '12-Litre Small Form Factor powerhouse: Ryzen 7 7800X3D, RTX 4070 Super, 32GB DDR5',
        description: 'Engineered for compact desk setups without compromising compute throughput. Features a custom ventilated sandblasted aluminum chassis, whisper-quiet magnetic levitation cooling fans, and front-accessible 40Gbps USB4 ports.',
        priceCents: 3699900, // R 36,999.00
        costPriceCents: 2850000,
        primaryImage: '/src/assets/images/product_desktop_workstation_1793053699096.jpg',
        images: ['/src/assets/images/product_desktop_workstation_1793053699096.jpg'],
        specifications: [
          { group: 'Processor', name: 'CPU', value: 'AMD Ryzen 7 7800X3D (8 Cores, 16 Threads, 3D V-Cache)' },
          { group: 'Graphics', name: 'GPU', value: 'NVIDIA GeForce RTX 4070 Super 12GB GDDR6X' },
          { group: 'RAM', name: 'Memory', value: '32GB DDR5 6000MHz Low Profile' },
          { group: 'Storage', name: 'SSD', value: '2TB PCIe 4.0 NVMe SSD' },
          { group: 'Chassis', name: 'Volume', value: '12.2 Litres, 6061-T6 Aluminum' },
        ],
        variants: [],
        onHandQuantity: 7,
        reservedQuantity: 0,
        lowStockThreshold: 2,
        isActive: true,
        warrantyPeriodMonths: 36,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const p of initialProducts) {
      this.products.set(p.id, p);

      // Record initial inventory receipt in audit trail
      this.stockMovements.push({
        id: `mov_init_${p.id}`,
        productId: p.id,
        sku: p.sku,
        type: 'RECEIPT',
        quantityChange: p.onHandQuantity,
        previousOnHand: 0,
        newOnHand: p.onHandQuantity,
        reason: 'Initial warehouse intake for Mevo Tech Johannesburg depot',
        performedBy: 'System Init',
        timestamp: now,
      });
    }
  }

  // ---- Product Queries & Operations ----

  getProducts(filters?: {
    category?: string;
    search?: string;
    minPriceCents?: number;
    maxPriceCents?: number;
    brand?: string;
    onlyActive?: boolean;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'relevance';
  }): Product[] {
    let list = Array.from(this.products.values());

    if (filters?.onlyActive !== false) {
      list = list.filter((p) => p.isActive);
    }

    if (filters?.category && filters.category !== 'all') {
      const catLower = filters.category.toLowerCase();
      list = list.filter((p) => p.category.toLowerCase().includes(catLower));
    }

    if (filters?.brand) {
      list = list.filter((p) => p.brand.toLowerCase() === filters.brand?.toLowerCase());
    }

    if (filters?.minPriceCents !== undefined) {
      list = list.filter((p) => (p.promotionalPriceCents || p.priceCents) >= filters.minPriceCents!);
    }

    if (filters?.maxPriceCents !== undefined) {
      list = list.filter((p) => (p.promotionalPriceCents || p.priceCents) <= filters.maxPriceCents!);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filters?.sort === 'price_asc') {
      list.sort((a, b) => (a.promotionalPriceCents || a.priceCents) - (b.promotionalPriceCents || b.priceCents));
    } else if (filters?.sort === 'price_desc') {
      list.sort((a, b) => (b.promotionalPriceCents || b.priceCents) - (a.promotionalPriceCents || a.priceCents));
    } else if (filters?.sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }

  getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  getProductBySlug(slug: string): Product | undefined {
    return Array.from(this.products.values()).find((p) => p.slug === slug);
  }

  // ---- Authoritative Inventory & Reservation Management ----

  /**
   * Concurrency-safe temporary reservation for checkout (15-minute TTL).
   * Prevents overselling without permanently decrementing stock.
   */
  reserveStock(params: {
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    sessionId: string;
    orderReference?: string;
  }): { success: boolean; reservationIds: string[]; error?: string } {
    // 1. Verify availability for all items first (all-or-nothing atomicity)
    for (const item of params.items) {
      const product = this.products.get(item.productId);
      if (!product || !product.isActive) {
        return { success: false, reservationIds: [], error: `Product not available: ${item.productId}` };
      }

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return { success: false, reservationIds: [], error: `Variant not found: ${item.variantId}` };
        }
        const available = variant.onHandQuantity - variant.reservedQuantity;
        if (available < item.quantity) {
          return {
            success: false,
            reservationIds: [],
            error: `Insufficient stock for "${product.name} - ${variant.title}". Only ${available} available.`,
          };
        }
      } else {
        const available = product.onHandQuantity - product.reservedQuantity;
        if (available < item.quantity) {
          return {
            success: false,
            reservationIds: [],
            error: `Insufficient stock for "${product.name}". Only ${available} available.`,
          };
        }
      }
    }

    // 2. Perform reservations
    const now = new Date();
    const reservedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutes
    const createdReservationIds: string[] = [];

    for (const item of params.items) {
      const product = this.products.get(item.productId)!;
      const resId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId)!;
        variant.reservedQuantity += item.quantity;
        product.reservedQuantity += item.quantity;
      } else {
        product.reservedQuantity += item.quantity;
      }

      const reservation: StockReservation = {
        id: resId,
        productId: item.productId,
        variantId: item.variantId,
        sku: product.sku,
        quantity: item.quantity,
        reservedUntil,
        orderReference: params.orderReference,
        sessionId: params.sessionId,
        status: 'ACTIVE',
        createdAt: now.toISOString(),
      };

      this.reservations.set(resId, reservation);
      createdReservationIds.push(resId);
    }

    return { success: true, reservationIds: createdReservationIds };
  }

  /**
   * Release reservation when checkout is cancelled or payment fails.
   */
  releaseReservation(reservationId: string, reason: string = 'Checkout cancelled'): void {
    const res = this.reservations.get(reservationId);
    if (!res || res.status !== 'ACTIVE') return;

    res.status = 'RELEASED';
    const product = this.products.get(res.productId);
    if (product) {
      product.reservedQuantity = Math.max(0, product.reservedQuantity - res.quantity);
      if (res.variantId) {
        const variant = product.variants.find((v) => v.id === res.variantId);
        if (variant) {
          variant.reservedQuantity = Math.max(0, variant.reservedQuantity - res.quantity);
        }
      }
    }
  }

  /**
   * Converts reservation to completed sale and permanently decrements on-hand stock upon verified payment.
   */
  convertReservationToSale(orderReference: string): void {
    const activeRes = Array.from(this.reservations.values()).filter(
      (r) => r.orderReference === orderReference && r.status === 'ACTIVE'
    );

    const now = new Date().toISOString();

    for (const res of activeRes) {
      res.status = 'CONVERTED';
      const product = this.products.get(res.productId);
      if (product) {
        const prevOnHand = product.onHandQuantity;
        product.reservedQuantity = Math.max(0, product.reservedQuantity - res.quantity);
        product.onHandQuantity = Math.max(0, product.onHandQuantity - res.quantity);

        if (res.variantId) {
          const variant = product.variants.find((v) => v.id === res.variantId);
          if (variant) {
            variant.reservedQuantity = Math.max(0, variant.reservedQuantity - res.quantity);
            variant.onHandQuantity = Math.max(0, variant.onHandQuantity - res.quantity);
          }
        }

        this.stockMovements.push({
          id: `mov_sale_${Date.now()}_${res.id}`,
          productId: product.id,
          variantId: res.variantId,
          sku: res.sku,
          type: 'SALE',
          quantityChange: -res.quantity,
          previousOnHand: prevOnHand,
          newOnHand: product.onHandQuantity,
          reason: `Fulfilment for confirmed order ${orderReference}`,
          orderReference,
          performedBy: 'Payment Gateway Webhook',
          timestamp: now,
        });
      }
    }
  }

  /**
   * Automatic background reaper releasing expired reservations (>15 min).
   */
  reapExpiredReservations(): void {
    const now = new Date().toISOString();
    for (const res of this.reservations.values()) {
      if (res.status === 'ACTIVE' && res.reservedUntil < now) {
        res.status = 'EXPIRED';
        const product = this.products.get(res.productId);
        if (product) {
          product.reservedQuantity = Math.max(0, product.reservedQuantity - res.quantity);
          if (res.variantId) {
            const variant = product.variants.find((v) => v.id === res.variantId);
            if (variant) {
              variant.reservedQuantity = Math.max(0, variant.reservedQuantity - res.quantity);
            }
          }
        }
      }
    }
  }

  // ---- Orders & Fulfilment ----

  createOrder(order: Order, sessionId?: string): Order {
    this.orders.set(order.reference, order);
    this.recordAuditLog({
      actor: order.customerEmail,
      role: 'customer',
      action: 'CREATE_ORDER',
      targetType: 'ORDER',
      targetId: order.reference,
      details: `Created order ${order.reference} totaling R ${(order.totalCents / 100).toFixed(2)} with payment method ${order.paymentMethod}`,
    });

    this.markCartRecovered({
      sessionId,
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      orderReference: order.reference,
    });

    return order;
  }

  getOrderByReference(reference: string): Order | undefined {
    return this.orders.get(reference);
  }

  updateOrderStatus(
    reference: string,
    nextStatus: OrderStatus,
    note: string,
    updatedBy: string
  ): { success: boolean; order?: Order; error?: string } {
    const order = this.orders.get(reference);
    if (!order) return { success: false, error: 'Order not found' };

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      return {
        success: false,
        error: `Illegal state transition from ${order.status} to ${nextStatus}`,
      };
    }

    const prevStatus = order.status;
    order.status = nextStatus;
    const now = new Date().toISOString();
    order.updatedAt = now;
    order.statusHistory.push({
      status: nextStatus,
      note,
      updatedBy,
      timestamp: now,
    });

    // If transitioned to PAID, convert stock reservations to permanent sale deductions
    if (nextStatus === 'PAID' && prevStatus !== 'PAID') {
      this.convertReservationToSale(order.reference);
      this.markCartRecovered({
        customerId: order.customerId,
        customerEmail: order.customerEmail,
        orderReference: order.reference,
      });
    }

    this.recordAuditLog({
      actor: updatedBy,
      role: 'system',
      action: 'ORDER_STATUS_UPDATE',
      targetType: 'ORDER',
      targetId: reference,
      details: `Order status changed from ${prevStatus} to ${nextStatus}. Note: ${note}`,
    });

    return { success: true, order };
  }

  addPaymentAttempt(reference: string, attempt: PaymentAttempt): void {
    const order = this.orders.get(reference);
    if (order) {
      order.paymentAttempts.push(attempt);
      order.updatedAt = new Date().toISOString();
    }
  }

  // ---- Settings, Discounts & Shipping Methods ----

  getSettings(): StoreSettings {
    return { ...this.settings };
  }

  getShippingMethods(): ShippingMethod[] {
    return [...this.shippingMethods];
  }

  getCoupon(code: string): CouponDiscount | undefined {
    return this.coupons.get(code.toUpperCase());
  }

  getActiveCoupons(): CouponDiscount[] {
    return Array.from(this.coupons.values()).filter((c) => c.isActive);
  }

  // ---- System Activity & Security Audit Trail ----

  public recordAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }
  ): AuditLogEntry {
    let category = entry.category;
    let severity = entry.severity || 'info';

    if (!category) {
      if (
        entry.action.includes('LOGIN') ||
        entry.action.includes('AUTH') ||
        entry.action.includes('REGISTER') ||
        entry.action.includes('SESSION')
      ) {
        category = 'auth';
      } else if (
        entry.action.includes('PAYMENT') ||
        entry.action.includes('TRANSACTION') ||
        entry.action.includes('SIGNATURE') ||
        entry.action.includes('AMOUNT')
      ) {
        category = 'payment_failure';
      } else if (
        entry.action.includes('STATUS') ||
        entry.action.includes('CUSTOMER') ||
        entry.action.includes('MERCHANDISING') ||
        entry.action.includes('POLICY') ||
        entry.action.includes('ROLE') ||
        entry.action.includes('SETTINGS')
      ) {
        category = 'account_management';
      } else {
        category = 'system';
      }
    }

    if (
      entry.action.includes('FAIL') ||
      entry.action.includes('RESTRICT') ||
      entry.action.includes('WARNING') ||
      entry.action.includes('DECLINED')
    ) {
      if (severity === 'info') severity = 'warning';
    }
    if (
      entry.action.includes('BLOCK') ||
      entry.action.includes('TAMPER') ||
      entry.action.includes('FRAUD') ||
      entry.action.includes('UNAUTHORIZED') ||
      entry.action.includes('MISMATCH')
    ) {
      severity = 'critical';
    }

    const log: AuditLogEntry = {
      ...entry,
      category,
      severity,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return log;
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].slice(0, 150);
  }

  private seedSystemActivityLogs() {
    const pastMinutes = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
    const pastHours = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    const initialLogs: AuditLogEntry[] = [
      {
        id: 'act_log_001',
        actor: 'blacquebeat@gmail.com',
        role: 'customer',
        action: 'USER_SOCIAL_LOGIN_SUCCESS',
        targetType: 'AUTH',
        targetId: 'cust_blacquebeat',
        category: 'auth',
        severity: 'info',
        ipAddress: '197.89.24.112',
        details: 'Customer authenticated via GOOGLE single-sign-on (OAuth 2.0 PKCE handshake)',
        timestamp: pastMinutes(14),
      },
      {
        id: 'act_log_002',
        actor: 'Paystack Gateway Webhook',
        role: 'system',
        action: 'PAYMENT_ATTEMPT_FAILED',
        targetType: 'PAYMENT',
        targetId: 'MEV-2026-78119',
        category: 'payment_failure',
        severity: 'warning',
        ipAddress: '52.31.139.228',
        details: 'Payment attempt failed for order MEV-2026-78119 on Paystack (Code: 51 - Insufficient funds on card ending 4012). Amount: R 38,999.00',
        timestamp: pastMinutes(48),
      },
      {
        id: 'act_log_003',
        actor: 'Mevo Executive Admin',
        role: 'owner',
        action: 'CUSTOMER_STATUS_BLOCKED',
        targetType: 'CUSTOMER',
        targetId: 'cust_blocked_card_abuser',
        category: 'account_management',
        severity: 'critical',
        ipAddress: '105.187.32.9',
        details: 'Account status updated from ACTIVE to BLOCKED for fraud-flagged@suspicious.net. Policy reason: Multiple card velocity triggers and automated BIN attacks detected.',
        timestamp: pastHours(2),
      },
      {
        id: 'act_log_004',
        actor: 'fraud-flagged@suspicious.net',
        role: 'customer',
        action: 'USER_LOGIN_BLOCKED',
        targetType: 'AUTH',
        targetId: 'cust_blocked_card_abuser',
        category: 'auth',
        severity: 'critical',
        ipAddress: '185.220.101.5',
        details: 'Suspended account attempted login via email/password. Access blocked by security filter. Contact compliance@mevotech.co.za.',
        timestamp: pastHours(3),
      },
      {
        id: 'act_log_005',
        actor: 'PayFast Sandbox Gateway',
        role: 'system',
        action: 'PAYMENT_ATTEMPT_FAILED',
        targetType: 'PAYMENT',
        targetId: 'MEV-2026-92144',
        category: 'payment_failure',
        severity: 'warning',
        ipAddress: '196.33.226.11',
        details: 'Card 3D Secure authentication timeout after 180s. Customer abandoned Nedbank OTP screen. Order MEV-2026-92144 kept in PENDING_PAYMENT.',
        timestamp: pastHours(5),
      },
      {
        id: 'act_log_006',
        actor: 'Mevo Executive Admin',
        role: 'owner',
        action: 'CUSTOMER_STATUS_RESTRICTED',
        targetType: 'CUSTOMER',
        targetId: 'cust_restricted_chargeback',
        category: 'account_management',
        severity: 'warning',
        ipAddress: '105.187.32.9',
        details: 'Account status updated from ACTIVE to RESTRICTED for disputed-shopper@risk.co.za. Policy reason: Pending chargeback dispute investigation and FICA verification hold.',
        timestamp: pastHours(7),
      },
      {
        id: 'act_log_007',
        actor: 'disputed-shopper@risk.co.za',
        role: 'customer',
        action: 'PAYMENT_RESTRICTED_ATTEMPT',
        targetType: 'PAYMENT',
        targetId: 'cust_restricted_chargeback',
        category: 'payment_failure',
        severity: 'warning',
        ipAddress: '41.13.12.98',
        details: 'Restricted account attempted checkout for order MEV-2026-44021. Order creation halted by security policy.',
        timestamp: pastHours(8),
      },
      {
        id: 'act_log_008',
        actor: 'Untrusted Client Webhook',
        role: 'system',
        action: 'PAYMENT_SIGNATURE_TAMPERED',
        targetType: 'PAYMENT',
        targetId: 'paystack',
        category: 'payment_failure',
        severity: 'critical',
        ipAddress: '45.133.1.20',
        details: 'Security alert: Forged or corrupted HMAC-SHA512 webhook signature detected on /api/payments/paystack/webhook. Request rejected with HTTP 400.',
        timestamp: pastHours(11),
      },
      {
        id: 'act_log_009',
        actor: 'guest_attacker',
        role: 'guest',
        action: 'USER_LOGIN_FAILED',
        targetType: 'AUTH',
        targetId: 'finance@mevotech.co.za',
        category: 'auth',
        severity: 'warning',
        ipAddress: '102.165.34.19',
        details: 'Failed customer login: Incorrect password entered for target finance@mevotech.co.za (Attempt 3 of 5 before IP throttle).',
        timestamp: pastHours(14),
      },
      {
        id: 'act_log_010',
        actor: 'owner@mevotech.co.za',
        role: 'owner',
        action: 'ADMIN_LOGIN_SUCCESS',
        targetType: 'AUTH',
        targetId: 'usr_owner',
        category: 'auth',
        severity: 'info',
        ipAddress: '105.187.32.9',
        details: 'Administrator Mevo Executive Admin signed in to Sandton Operations Console (role: owner, MFA verified).',
        timestamp: pastHours(16),
      },
      {
        id: 'act_log_011',
        actor: 'Mevo Executive Admin',
        role: 'owner',
        action: 'MERCHANDISING_SLOT_CHANGE',
        targetType: 'MERCHANDISING',
        targetId: 'prod_studiobook_16',
        category: 'account_management',
        severity: 'info',
        ipAddress: '105.187.32.9',
        details: 'Assigned "Mevo StudioBook Pro 16" to Hero Spotlight placement slot with priority 1 (Pinned to Top: true).',
        timestamp: pastHours(20),
      },
      {
        id: 'act_log_012',
        actor: 'shopper@mevotech.co.za',
        role: 'customer',
        action: 'USER_LOGIN_SUCCESS',
        targetType: 'AUTH',
        targetId: 'cust_shopper_demo',
        category: 'auth',
        severity: 'info',
        ipAddress: '196.25.1.1',
        details: 'Customer Valued SA Shopper authenticated via email/password.',
        timestamp: pastHours(24),
      },
    ];

    this.auditLogs = [...initialLogs];
  }

  // ---- Promotional Banners & Seasonal Sales ----

  getActivePromotionalBanners(): PromotionalBanner[] {
    const now = new Date();
    return Array.from(this.promotionalBanners.values()).filter((b) => {
      if (!b.isActive) return false;
      if (!b.endsAt) return true;
      return new Date(b.endsAt).getTime() > now.getTime();
    });
  }


  // ---- Customer Accounts & Authentication ----

  registerCustomer(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: any;
  }): {
    success: boolean;
    requiresEmailVerification?: boolean;
    verificationCode?: string;
    customer?: CustomerAccount;
    token?: string;
    error?: string;
    message?: string;
  } {
    const cleanEmail = params.email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        };
      }
    }

    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newCustomer: CustomerAccount = {
      id,
      name: params.name.trim(),
      email: cleanEmail,
      phone: params.phone?.trim() || '+27 82 000 0000',
      role: 'customer',
      authProvider: 'local',
      status: 'active',
      emailVerified: false,
      emailVerificationCode: verificationCode,
      lastLoginAt: new Date().toISOString(),
      favourites: [],
      defaultAddress: params.address,
      createdAt: new Date().toISOString(),
    };

    // Store salted bcrypt password hash
    const passwordHash = hashPassword(params.password);
    this.customers.set(id, {
      account: newCustomer,
      passwordHash,
      verificationCode,
      verificationExpires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    this.recordAuditLog({
      actor: newCustomer.email,
      role: 'customer',
      action: 'CUSTOMER_REGISTER',
      targetType: 'CUSTOMER',
      targetId: id,
      details: `Customer registered. 6-digit confirmation code generated for ${cleanEmail}. Awaiting email verification.`,
    });

    return {
      success: true,
      requiresEmailVerification: true,
      verificationCode,
      customer: newCustomer,
      message: 'Account registered. Please enter the 6-digit confirmation code to confirm your email and proceed.',
    };
  }

  verifyCustomerEmail(
    email: string,
    code: string
  ): { success: boolean; customer?: CustomerAccount; token?: string; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        // Enforce strict code match
        const isValidCode = Boolean(record.verificationCode && record.verificationCode === cleanCode);

        // Check expiration if set
        const isExpired = Boolean(
          record.verificationExpires && Date.now() > new Date(record.verificationExpires).getTime()
        );

        if (!isValidCode || isExpired) {
          this.recordAuditLog({
            actor: cleanEmail,
            role: 'customer',
            action: 'EMAIL_VERIFICATION_FAILED',
            targetType: 'CUSTOMER',
            targetId: record.account.id,
            details: `Failed email verification attempt for ${cleanEmail}: Invalid 6-digit code.`,
          });
          return {
            success: false,
            error: isExpired
              ? 'Verification code has expired. Please request a new code.'
              : 'Invalid confirmation code. Please enter the 6-digit code sent to your email.',
          };
        }

        record.account.emailVerified = true;
        record.account.emailVerificationCode = undefined;
        record.verificationCode = undefined;
        record.account.lastLoginAt = new Date().toISOString();

        const token = signCustomerToken(record.account.id, record.account.email);

        this.recordAuditLog({
          actor: cleanEmail,
          role: 'customer',
          action: 'CUSTOMER_EMAIL_CONFIRMED',
          targetType: 'CUSTOMER',
          targetId: record.account.id,
          details: `Email address successfully verified for ${cleanEmail}. Account activated for checkout.`,
        });

        return {
          success: true,
          customer: record.account,
          token,
        };
      }
    }

    return { success: false, error: 'No account registered with this email address.' };
  }

  resendVerificationCode(email: string): { success: boolean; verificationCode?: string; message: string; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        record.verificationCode = newCode;
        record.account.emailVerificationCode = newCode;
        record.verificationExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        this.recordAuditLog({
          actor: cleanEmail,
          role: 'customer',
          action: 'VERIFICATION_CODE_RESENT',
          targetType: 'CUSTOMER',
          targetId: record.account.id,
          details: `Resent 6-digit verification code to ${cleanEmail}.`,
        });

        return {
          success: true,
          verificationCode: newCode,
          message: `A new 6-digit verification code has been generated for ${cleanEmail}.`,
        };
      }
    }

    return { success: false, message: '', error: 'Account not found with this email.' };
  }

  authenticateCustomer(
    email: string,
    passwordAttempt: string
  ): { success: boolean; customer?: CustomerAccount; token?: string; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        // Enforce account blocking
        if (record.account.status === 'blocked') {
          this.recordAuditLog({
            actor: cleanEmail,
            role: 'customer',
            action: 'USER_LOGIN_BLOCKED',
            targetType: 'AUTH',
            targetId: record.account.id,
            category: 'auth',
            severity: 'critical',
            details: `Blocked account attempted login. Status: blocked. Reason: ${record.account.restrictionReason || 'Administrative suspension'}`,
          });
          return {
            success: false,
            error: `Your account has been suspended by administration. Reason: ${record.account.restrictionReason || 'Security policy violation. Please contact support@mevotech.co.za.'}`,
          };
        }

        const isValid = verifyPassword(passwordAttempt.trim(), record.passwordHash);
        if (isValid) {
          // If stored hash was legacy, upgrade to bcrypt on successful login
          if (!record.passwordHash.startsWith('$2a$') && !record.passwordHash.startsWith('$2b$')) {
            record.passwordHash = hashPassword(passwordAttempt.trim());
          }

          record.account.lastLoginAt = new Date().toISOString();
          const token = signCustomerToken(record.account.id, record.account.email);

          this.recordAuditLog({
            actor: cleanEmail,
            role: 'customer',
            action: 'USER_LOGIN_SUCCESS',
            targetType: 'AUTH',
            targetId: record.account.id,
            category: 'auth',
            severity: 'info',
            details: `Customer ${record.account.name} successfully authenticated via email/password`,
          });

          return { success: true, customer: record.account, token };
        }

        this.recordAuditLog({
          actor: cleanEmail,
          role: 'guest',
          action: 'USER_LOGIN_FAILED',
          targetType: 'AUTH',
          targetId: cleanEmail,
          category: 'auth',
          severity: 'warning',
          details: `Failed customer login: Incorrect password provided for ${cleanEmail}`,
        });

        return { success: false, error: 'Incorrect password entered' };
      }
    }

    this.recordAuditLog({
      actor: cleanEmail,
      role: 'guest',
      action: 'USER_LOGIN_FAILED',
      targetType: 'AUTH',
      targetId: cleanEmail,
      category: 'auth',
      severity: 'warning',
      details: `Failed customer login: No account registered under ${cleanEmail}`,
    });

    return { success: false, error: 'No customer account found with this email' };
  }

  socialLoginCustomer(params: {
    provider: CustomerAuthProvider;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
  }): { success: boolean; customer?: CustomerAccount; token?: string; error?: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        if (record.account.status === 'blocked') {
          this.recordAuditLog({
            actor: cleanEmail,
            role: 'customer',
            action: 'USER_SOCIAL_LOGIN_BLOCKED',
            targetType: 'AUTH',
            targetId: record.account.id,
            category: 'auth',
            severity: 'critical',
            details: `Blocked account attempted login via ${params.provider.toUpperCase()} single-sign-on. Reason: ${record.account.restrictionReason || 'Administrative suspension'}`,
          });
          return {
            success: false,
            error: `Your account has been suspended by administration. Reason: ${record.account.restrictionReason || 'Security policy violation. Please contact support@mevotech.co.za.'}`,
          };
        }

        // Update profile with social provider details
        record.account.lastLoginAt = new Date().toISOString();
        record.account.authProvider = params.provider;
        if (params.avatar) record.account.avatar = params.avatar;
        if (params.name && !record.account.name) record.account.name = params.name;

        const token = signCustomerToken(record.account.id, record.account.email);

        this.recordAuditLog({
          actor: cleanEmail,
          role: 'customer',
          action: 'USER_SOCIAL_LOGIN_SUCCESS',
          targetType: 'CUSTOMER',
          targetId: record.account.id,
          category: 'auth',
          severity: 'info',
          details: `Customer ${record.account.name} authenticated via ${params.provider.toUpperCase()} single-sign-on`,
        });

        return { success: true, customer: record.account, token };
      }
    }

    // New social registration
    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: CustomerAccount = {
      id,
      name: params.name.trim() || (params.provider === 'google' ? 'Google Customer' : 'Facebook Customer'),
      email: cleanEmail,
      phone: params.phone?.trim() || '+27 82 000 0000',
      role: 'customer',
      authProvider: params.provider,
      status: 'active',
      avatar: params.avatar || (params.provider === 'google' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' : undefined),
      lastLoginAt: new Date().toISOString(),
      favourites: [],
      createdAt: new Date().toISOString(),
    };

    const dummyPasswordHash = hashPassword(`social_${Date.now()}_${Math.random()}`);
    this.customers.set(id, {
      account: newCustomer,
      passwordHash: dummyPasswordHash,
    });

    const token = signCustomerToken(newCustomer.id, newCustomer.email);

    this.recordAuditLog({
      actor: newCustomer.email,
      role: 'customer',
      action: 'CUSTOMER_SOCIAL_REGISTER',
      targetType: 'CUSTOMER',
      targetId: id,
      details: `Customer registered and authenticated via ${params.provider.toUpperCase()} single-sign-on`,
    });

    return { success: true, customer: newCustomer, token };
  }

  // ---- POPIA Compliance Data Operations ----

  exportCustomerData(customerId: string): {
    success: boolean;
    data?: {
      account: CustomerAccount;
      orders: Order[];
      reviewsWritten: ProductReview[];
      exportedAt: string;
      popiaComplianceStatement: string;
    };
    error?: string;
  } {
    const record = this.customers.get(customerId);
    if (!record) {
      return { success: false, error: 'Customer record not found for export' };
    }

    const customerOrders = this.getCustomerOrders(customerId);
    const customerReviews: ProductReview[] = [];
    for (const revList of this.reviews.values()) {
      for (const rev of revList) {
        if (rev.userId === customerId || rev.authorName.toLowerCase() === record.account.name.toLowerCase()) {
          customerReviews.push(rev);
        }
      }
    }

    return {
      success: true,
      data: {
        account: record.account,
        orders: customerOrders,
        reviewsWritten: customerReviews,
        exportedAt: new Date().toISOString(),
        popiaComplianceStatement:
          'This data archive contains all Personal Identifiable Information (PII) stored by MEVO TECH (Pty) Ltd in compliance with South Africa Protection of Personal Information Act (POPIA) 2013.',
      },
    };
  }

  deleteCustomerAccount(customerId: string): { success: boolean; message: string; error?: string } {
    const record = this.customers.get(customerId);
    if (!record) {
      return { success: false, message: '', error: 'Customer account not found' };
    }

    const customerName = record.account.name;
    const customerEmail = record.account.email;

    // Remove customer credentials and profile
    this.customers.delete(customerId);

    // Anonymize personal identifiable information in orders to comply with SARS tax retention while wiping PII
    for (const order of this.orders.values()) {
      if (order.customerId === customerId || order.customerEmail.toLowerCase() === customerEmail.toLowerCase()) {
        order.customerName = '[Deleted User / POPIA Purge]';
        order.customerEmail = 'anonymized@mevotech.co.za';
        order.customerPhone = '+27 00 000 0000';
        if (order.shippingAddress) {
          order.shippingAddress.streetAddress = '[Redacted POPIA Request]';
          order.shippingAddress.fullName = '[Redacted]';
          order.shippingAddress.phone = '+27 00 000 0000';
        }
      }
    }

    this.recordAuditLog({
      actor: customerEmail,
      role: 'customer',
      action: 'CUSTOMER_POPIA_FORGOTTEN',
      targetType: 'CUSTOMER',
      targetId: customerId,
      details: `Customer requested full POPIA Section 14 account erasure. PII purged and order references anonymized for SARS compliance.`,
    });

    return {
      success: true,
      message: `Account for ${customerName} has been permanently deleted and PII purged pursuant to POPIA.`,
    };
  }

  getCustomerById(id: string): CustomerAccount | undefined {
    return this.customers.get(id)?.account;
  }

  getCustomerByEmail(email: string): CustomerAccount | undefined {
    const clean = email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === clean) {
        return record.account;
      }
    }
    return undefined;
  }

  updateCustomerProfile(
    id: string,
    updates: Partial<CustomerAccount>
  ): { success: boolean; customer?: CustomerAccount; error?: string } {
    const record = this.customers.get(id);
    if (!record) {
      return { success: false, error: 'Customer not found' };
    }

    // Principle 2: Never trust role or isPro from browser
    const sanitizedUpdates = sanitizeCustomerProfileUpdates(updates);

    const updatedAccount: CustomerAccount = {
      ...record.account,
      ...sanitizedUpdates,
      id: record.account.id,
      role: 'customer',
      email: record.account.email,
    };

    record.account = updatedAccount;
    return { success: true, customer: updatedAccount };
  }


  toggleCustomerFavourite(customerId: string, productId: string): string[] {
    const record = this.customers.get(customerId);
    if (!record) return [];

    const existing = new Set(record.account.favourites || []);
    if (existing.has(productId)) {
      existing.delete(productId);
    } else {
      existing.add(productId);
    }

    record.account.favourites = Array.from(existing);
    return record.account.favourites;
  }

  getCustomerOrders(emailOrId: string): Order[] {
    const clean = emailOrId.trim().toLowerCase();
    const orders = Array.from(this.orders.values());
    return orders
      .filter(
        (o) =>
          o.customerId === emailOrId ||
          o.customerEmail.toLowerCase() === clean ||
          (o.shippingAddress && o.shippingAddress.email.toLowerCase() === clean)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  isProductBoughtByCustomer(productId: string, emailOrId: string): boolean {
    const customerOrders = this.getCustomerOrders(emailOrId);
    return customerOrders.some(
      (order) =>
        (order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') &&
        order.items.some((item) => item.productId === productId)
    );
  }

  // ---- Product Reviews ----

  getReviewsForProduct(productId: string): ProductReview[] {
    return this.reviews.get(productId) || [];
  }

  addReview(params: {
    productId: string;
    userId?: string;
    authorName: string;
    rating: number;
    title: string;
    comment: string;
    customerEmail?: string;
  }): { success: boolean; review: ProductReview } {
    const existingReviews = this.reviews.get(params.productId) || [];

    let isVerified = false;
    if (params.customerEmail || params.userId) {
      isVerified = this.isProductBoughtByCustomer(
        params.productId,
        params.userId || params.customerEmail || ''
      );
    }

    const newReview: ProductReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: params.productId,
      userId: params.userId,
      authorName: params.authorName.trim(),
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      title: params.title.trim(),
      comment: params.comment.trim(),
      isVerifiedPurchase: isVerified,
      createdAt: new Date().toISOString(),
    };

    existingReviews.unshift(newReview);
    this.reviews.set(params.productId, existingReviews);

    return { success: true, review: newReview };
  }

  // ---- Price Drop Alerts ----

  createPriceAlert(params: {
    productId: string;
    email: string;
    targetType: PriceAlertTargetType;
    customTargetPriceCents?: number;
    customerId?: string;
  }): { success: boolean; alert: PriceAlert } {
    const product = this.products.get(params.productId);
    if (!product) {
      throw new Error(`Product not found: ${params.productId}`);
    }

    if (!validatePriceAlertEmail(params.email)) {
      throw new Error('A valid email address is required.');
    }

    const currentPrice = product.promotionalPriceCents || product.priceCents;
    const targetPrice = calculateTargetPriceCents(
      currentPrice,
      params.targetType,
      params.customTargetPriceCents
    );

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAlert: PriceAlert = {
      id: alertId,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.primaryImage,
      email: params.email.trim().toLowerCase(),
      customerId: params.customerId,
      initialPriceCents: currentPrice,
      targetPriceCents: targetPrice,
      targetType: params.targetType,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.priceAlerts.set(alertId, newAlert);

    this.recordAuditLog({
      actor: params.email.trim().toLowerCase(),
      role: 'customer',
      action: 'PRICE_ALERT_CREATED',
      targetType: 'PRODUCT',
      targetId: product.id,
      category: 'system',
      severity: 'info',
      details: `Customer subscribed to price drop alert for "${product.name}" (Threshold target: R ${(targetPrice / 100).toFixed(2)})`,
    });

    return { success: true, alert: newAlert };
  }

  getPriceAlertsByEmail(email: string): PriceAlert[] {
    const clean = email.trim().toLowerCase();
    return Array.from(this.priceAlerts.values())
      .filter((a) => a.email.toLowerCase() === clean && a.status === 'ACTIVE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllPriceAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  cancelPriceAlert(id: string, email?: string): boolean {
    const alert = this.priceAlerts.get(id);
    if (!alert) return false;

    if (email && alert.email.toLowerCase() !== email.trim().toLowerCase()) {
      return false;
    }

    alert.status = 'CANCELLED';
    this.priceAlerts.set(id, alert);
    return true;
  }

  simulatePriceDrop(
    productId: string,
    newPriceCents: number
  ): { success: boolean; triggeredCount: number; message: string; updatedProduct: Product } {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const prevPrice = product.promotionalPriceCents || product.priceCents;
    product.promotionalPriceCents = newPriceCents;
    product.updatedAt = new Date().toISOString();
    this.products.set(productId, product);

    let triggeredCount = 0;
    const now = new Date().toISOString();

    for (const alert of this.priceAlerts.values()) {
      if (alert.productId === productId && alert.status === 'ACTIVE') {
        const triggers = shouldTriggerPriceAlert(
          alert.initialPriceCents,
          newPriceCents,
          alert.targetPriceCents
        );

        if (triggers) {
          alert.status = 'TRIGGERED';
          alert.triggeredAt = now;
          alert.lastNotifiedPriceCents = newPriceCents;
          this.priceAlerts.set(alert.id, alert);
          triggeredCount++;

          this.recordAuditLog({
            actor: 'Automated Price Drop Daemon',
            role: 'system',
            action: 'PRICE_ALERT_TRIGGERED',
            targetType: 'PRODUCT',
            targetId: productId,
            category: 'system',
            severity: 'info',
            details: `Automated notification sent to ${alert.email}: "${product.name}" dropped from R ${(alert.initialPriceCents / 100).toFixed(2)} to R ${(newPriceCents / 100).toFixed(2)}`,
          });
        }
      }
    }

    return {
      success: true,
      triggeredCount,
      message: `Price dropped to R ${(newPriceCents / 100).toFixed(2)}. ${triggeredCount} automated notification(s) dispatched.`,
      updatedProduct: product,
    };
  }

  // ---- Abandoned Cart Tracking, Sweeping & Recovery Engine ----

  private seedAbandonedCarts() {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const expiresAt = new Date(Date.now() + DEFAULT_CART_EXPIRY_MS).toISOString();

    const sampleCart: AbandonedCart = {
      id: 'acart_seed_blacque_1',
      sessionId: 'sess_seed_blacque_mobile_1',
      customerId: 'cust_blacquebeat',
      customerEmail: 'blacquebeat@gmail.com',
      customerName: 'Blacque Beat',
      customerPhone: '+27 83 456 7890',
      items: [
        {
          productId: 'prod_terasync_4tb_nvme',
          sku: 'MEV-SSD-4TBG5',
          name: 'TeraSync Gen5 4TB NVMe M.2 SSD',
          brand: 'TeraSync',
          image: '/src/assets/images/category_storage_ssd_1793214066602.jpg',
          unitPriceCents: 899900,
          quantity: 1,
          lineTotalCents: 899900,
          availableStock: 15,
        },
        {
          productId: 'prod_keychron_pro',
          sku: 'MEV-KB-NOVAPRO',
          name: 'Nova Pro CNC Wireless Mechanical Keyboard',
          brand: 'Nova Gear',
          image: '/src/assets/images/hero_tech_showcase_1793053698167.jpg',
          unitPriceCents: 329900,
          quantity: 1,
          lineTotalCents: 329900,
          availableStock: 18,
        },
      ],
      itemCount: 2,
      subtotalCents: 1229800,
      discountCents: 0,
      estimatedTotalCents: 1229800,
      currency: 'ZAR',
      status: 'ABANDONED',
      recoveryToken: 'rec_mevo_blacque_2026',
      recoveryIncentiveCode: 'MEVOSUPER',
      reminderCount: 1,
      reminderHistory: [
        {
          reminderNumber: 1,
          channel: 'email',
          sentToEmail: 'blacquebeat@gmail.com',
          incentiveCode: 'MEVOSUPER',
          sentAt: threeHoursAgo,
        },
      ],
      lastActivityAt: fourHoursAgo,
      abandonedAt: threeHoursAgo,
      lastReminderSentAt: threeHoursAgo,
      expiresAt,
      createdAt: fourHoursAgo,
      updatedAt: threeHoursAgo,
    };

    this.abandonedCarts.set(sampleCart.id, sampleCart);
  }

  private resolveAbandonedCartItems(rawItems: RawCartSyncItem[]): AbandonedCartItem[] {
    const resolved: AbandonedCartItem[] = [];
    for (const raw of rawItems) {
      const product = this.products.get(raw.productId);
      if (!product || !product.isActive) continue;

      let sku = product.sku;
      let unitPriceCents = product.promotionalPriceCents || product.priceCents;
      let availableStock = Math.max(0, product.onHandQuantity - product.reservedQuantity);
      let variantTitle: string | undefined;

      if (raw.variantId) {
        const variant = product.variants.find((v) => v.id === raw.variantId);
        if (variant) {
          sku = variant.sku;
          unitPriceCents = variant.promotionalPriceCents || variant.priceCents;
          availableStock = Math.max(0, variant.onHandQuantity - variant.reservedQuantity);
          variantTitle = variant.title;
        } else if (product.variants.length === 0 && raw.variantId === `var_${product.id}_pro`) {
          const basePrice = product.promotionalPriceCents || product.priceCents;
          sku = `${product.sku}-PRO`;
          unitPriceCents = Math.round(basePrice * 1.12);
          availableStock = Math.max(1, product.onHandQuantity - 2);
          variantTitle = 'Creator Pro Bundle (+ 3Yr MevoCare)';
        } else if (product.variants.length === 0 && raw.variantId === `var_${product.id}_std`) {
          variantTitle = 'Standard Workstation Edition';
        }
      }

      const quantity = availableStock > 0 ? Math.min(raw.quantity, availableStock) : raw.quantity;
      resolved.push({
        productId: product.id,
        variantId: raw.variantId,
        sku,
        name: product.name,
        brand: product.brand,
        variantTitle,
        image: product.primaryImage,
        unitPriceCents,
        quantity,
        lineTotalCents: unitPriceCents * quantity,
        availableStock,
      });
    }
    return resolved;
  }

  syncCartSession(params: {
    sessionId: string;
    items: unknown;
    discountCode?: string;
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    nowMs?: number;
  }): { success: boolean; cart: AbandonedCart | null } {
    const sessionId = (params.sessionId || '').trim();
    if (!sessionId) {
      throw new Error('sessionId is required to sync cart');
    }

    const nowMs = params.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresIso = new Date(nowMs + DEFAULT_CART_EXPIRY_MS).toISOString();
    const sanitized = sanitizeCartSyncItems(params.items);

    // Find an existing open cart for this session
    let existingCart: AbandonedCart | undefined;
    for (const c of this.abandonedCarts.values()) {
      if (c.sessionId === sessionId && (c.status === 'ACTIVE' || c.status === 'ABANDONED')) {
        existingCart = c;
        break;
      }
    }

    if (sanitized.length === 0) {
      if (existingCart && existingCart.status === 'ACTIVE') {
        this.abandonedCarts.delete(existingCart.id);
      }
      return { success: true, cart: null };
    }

    const resolvedItems = this.resolveAbandonedCartItems(sanitized);
    if (resolvedItems.length === 0) {
      if (existingCart && existingCart.status === 'ACTIVE') {
        this.abandonedCarts.delete(existingCart.id);
      }
      return { success: true, cart: null };
    }

    const cleanCouponCode = params.discountCode ? params.discountCode.trim().toUpperCase() : undefined;
    const coupon = cleanCouponCode ? this.getCoupon(cleanCouponCode) : null;
    const totals = evaluateAbandonedCartTotals({
      items: resolvedItems,
      coupon,
      freeShippingThresholdCents: this.settings.freeShippingThresholdCents,
    });

    // Resolve authoritative customer details if customerId provided
    const customerRecord = params.customerId ? this.customers.get(params.customerId)?.account : undefined;
    const customerId = customerRecord?.id || existingCart?.customerId;
    const customerEmail =
      customerRecord?.email ||
      (params.customerEmail && params.customerEmail.includes('@') ? params.customerEmail.trim().toLowerCase() : existingCart?.customerEmail);
    const customerName = customerRecord?.name || (params.customerName?.trim() || existingCart?.customerName);
    const customerPhone = customerRecord?.phone || (params.customerPhone?.trim() || existingCart?.customerPhone);

    if (existingCart) {
      existingCart.items = resolvedItems;
      existingCart.itemCount = totals.itemCount;
      existingCart.subtotalCents = totals.subtotalCents;
      existingCart.discountCode = coupon && coupon.isActive ? coupon.code : undefined;
      existingCart.discountCents = totals.discountCents;
      existingCart.estimatedTotalCents = totals.estimatedTotalCents;
      existingCart.customerId = customerId;
      existingCart.customerEmail = customerEmail;
      existingCart.customerName = customerName;
      existingCart.customerPhone = customerPhone;
      existingCart.status = 'ACTIVE';
      existingCart.abandonedAt = undefined;
      existingCart.recoveryIncentiveCode = suggestRecoveryIncentiveCode(totals.subtotalCents);
      existingCart.lastActivityAt = nowIso;
      existingCart.expiresAt = expiresIso;
      existingCart.updatedAt = nowIso;
      this.abandonedCarts.set(existingCart.id, existingCart);
      return { success: true, cart: existingCart };
    }

    const newId = `acart_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const recoveryToken = `rec_${crypto.randomBytes(20).toString('hex')}`;
    const cart: AbandonedCart = {
      id: newId,
      sessionId,
      customerId,
      customerEmail,
      customerName,
      customerPhone,
      items: resolvedItems,
      itemCount: totals.itemCount,
      subtotalCents: totals.subtotalCents,
      discountCode: coupon && coupon.isActive ? coupon.code : undefined,
      discountCents: totals.discountCents,
      estimatedTotalCents: totals.estimatedTotalCents,
      currency: 'ZAR',
      status: 'ACTIVE',
      recoveryToken,
      recoveryIncentiveCode: suggestRecoveryIncentiveCode(totals.subtotalCents),
      reminderCount: 0,
      reminderHistory: [],
      lastActivityAt: nowIso,
      expiresAt: expiresIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.abandonedCarts.set(newId, cart);
    return { success: true, cart };
  }

  markCartAbandonedNow(params: {
    sessionId?: string;
    customerId?: string;
    customerEmail?: string;
    reason?: string;
    nowMs?: number;
  }): { success: boolean; cart: AbandonedCart | null } {
    const nowMs = params.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();

    let target: AbandonedCart | undefined;
    for (const cart of this.abandonedCarts.values()) {
      if (cart.status !== 'ACTIVE' || cart.items.length === 0) continue;
      if (params.sessionId && cart.sessionId === params.sessionId.trim()) {
        target = cart;
        break;
      }
      if (params.customerId && cart.customerId === params.customerId) {
        target = cart;
        break;
      }
      if (
        params.customerEmail &&
        cart.customerEmail &&
        cart.customerEmail.toLowerCase() === params.customerEmail.trim().toLowerCase()
      ) {
        target = cart;
        break;
      }
    }

    if (!target) {
      return { success: false, cart: null };
    }

    target.status = 'ABANDONED';
    target.abandonedAt = nowIso;
    target.recoveryIncentiveCode = suggestRecoveryIncentiveCode(target.subtotalCents);
    target.updatedAt = nowIso;
    this.abandonedCarts.set(target.id, target);

    this.recordAuditLog({
      actor: target.customerEmail || target.sessionId,
      role: target.customerId ? 'customer' : 'guest',
      action: 'ABANDONED_CART_DETECTED',
      targetType: 'ABANDONED_CART',
      targetId: target.id,
      category: 'system',
      severity: 'info',
      details: `Captured abandoned cart ${target.id} (${target.itemCount} items, R ${(target.subtotalCents / 100).toFixed(2)}). Reason: ${params.reason || 'Checkout exited prior to completion'}.`,
    });

    return { success: true, cart: target };
  }

  sweepAbandonedCarts(
    thresholdMs: number = DEFAULT_ABANDONMENT_THRESHOLD_MS,
    nowMs: number = Date.now()
  ): { abandonedCount: number; expiredCount: number; remindersQueued: number } {
    let abandonedCount = 0;
    let expiredCount = 0;
    let remindersQueued = 0;
    const nowIso = new Date(nowMs).toISOString();

    for (const cart of this.abandonedCarts.values()) {
      if (isCartExpired(cart, nowMs)) {
        cart.status = 'EXPIRED';
        cart.updatedAt = nowIso;
        this.abandonedCarts.set(cart.id, cart);
        expiredCount++;
        continue;
      }

      if (isCartEligibleForAbandonment(cart, nowMs, thresholdMs)) {
        cart.status = 'ABANDONED';
        cart.abandonedAt = nowIso;
        cart.recoveryIncentiveCode = suggestRecoveryIncentiveCode(cart.subtotalCents);
        cart.updatedAt = nowIso;
        abandonedCount++;

        this.recordAuditLog({
          actor: 'Abandoned Cart Sweeper',
          role: 'system',
          action: 'ABANDONED_CART_DETECTED',
          targetType: 'ABANDONED_CART',
          targetId: cart.id,
          category: 'system',
          severity: 'info',
          details: `Cart ${cart.id} transitioned to ABANDONED after inactivity window (${cart.itemCount} items, R ${(cart.subtotalCents / 100).toFixed(2)})`,
        });

        if (
          shouldSendRecoveryReminder(cart, nowMs, DEFAULT_REMINDER_COOLDOWN_MS, DEFAULT_MAX_REMINDERS) &&
          cart.reminderCount === 0 &&
          cart.customerEmail
        ) {
          cart.reminderCount += 1;
          cart.lastReminderSentAt = nowIso;
          cart.reminderHistory.push({
            reminderNumber: cart.reminderCount,
            channel: 'email',
            sentToEmail: cart.customerEmail,
            incentiveCode: cart.recoveryIncentiveCode,
            sentAt: nowIso,
          });
          remindersQueued++;

          this.recordAuditLog({
            actor: 'Abandoned Cart Recovery Daemon',
            role: 'system',
            action: 'ABANDONED_CART_REMINDER_SENT',
            targetType: 'ABANDONED_CART',
            targetId: cart.id,
            category: 'system',
            severity: 'info',
            details: `Queued automated cart recovery email #${cart.reminderCount} to ${cart.customerEmail} (Token: ${cart.recoveryToken})`,
          });
        }

        this.abandonedCarts.set(cart.id, cart);
      }
    }

    return { abandonedCount, expiredCount, remindersQueued };
  }

  markCartRecovered(params: {
    cartId?: string;
    sessionId?: string;
    customerId?: string;
    customerEmail?: string;
    orderReference: string;
    nowMs?: number;
  }): number {
    const nowIso = new Date(params.nowMs ?? Date.now()).toISOString();
    let recoveredCount = 0;

    for (const cart of this.abandonedCarts.values()) {
      if (cart.status !== 'ACTIVE' && cart.status !== 'ABANDONED') continue;

      const matchesCartId = Boolean(params.cartId && cart.id === params.cartId);
      const matchesSession = Boolean(params.sessionId && cart.sessionId === params.sessionId.trim());
      const matchesCustId = Boolean(params.customerId && cart.customerId === params.customerId);
      const matchesEmail = Boolean(
        params.customerEmail &&
          cart.customerEmail &&
          cart.customerEmail.toLowerCase() === params.customerEmail.trim().toLowerCase()
      );

      if (matchesCartId || matchesSession || matchesCustId || matchesEmail) {
        const wasAbandoned = cart.status === 'ABANDONED';
        cart.status = 'RECOVERED';
        cart.recoveredAt = nowIso;
        cart.recoveredOrderReference = params.orderReference;
        cart.updatedAt = nowIso;
        this.abandonedCarts.set(cart.id, cart);
        recoveredCount++;

        if (wasAbandoned) {
          this.recordAuditLog({
            actor: cart.customerEmail || cart.sessionId,
            role: 'customer',
            action: 'ABANDONED_CART_RECOVERED',
            targetType: 'ABANDONED_CART',
            targetId: cart.id,
            category: 'system',
            severity: 'info',
            details: `Abandoned cart ${cart.id} converted to order ${params.orderReference} (R ${(cart.subtotalCents / 100).toFixed(2)})`,
          });
        }
      }
    }

    return recoveredCount;
  }

  getAbandonedCartsForOwner(params: {
    customerId?: string;
    email?: string;
    sessionId?: string;
    includeActive?: boolean;
  }): AbandonedCart[] {
    const results: AbandonedCart[] = [];
    for (const cart of this.abandonedCarts.values()) {
      if (cart.items.length === 0) continue;
      if (cart.status !== 'ABANDONED' && !(params.includeActive && cart.status === 'ACTIVE')) {
        continue;
      }

      const owned = verifyAbandonedCartOwnership(cart, {
        authenticatedCustomerId: params.customerId,
        authenticatedEmail: params.email,
        sessionId: params.sessionId,
      });

      if (owned) {
        results.push(cart);
      }
    }

    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getAbandonedCartById(cartId: string): AbandonedCart | undefined {
    return this.abandonedCarts.get(cartId);
  }

  getAbandonedCartByRecoveryToken(
    token: string
  ): { success: boolean; data?: RecoveredCartResponse; error?: string } {
    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      return { success: false, error: 'Recovery token is required' };
    }

    let found: AbandonedCart | undefined;
    for (const cart of this.abandonedCarts.values()) {
      if (cart.recoveryToken === cleanToken) {
        found = cart;
        break;
      }
    }

    if (!found) {
      return { success: false, error: 'Cart recovery link is invalid or does not exist.' };
    }

    if (found.status === 'EXPIRED') {
      return { success: false, error: 'This saved cart link has expired after 30 days.' };
    }

    if (found.status === 'RECOVERED') {
      return {
        success: false,
        error: `This cart was already completed as order ${found.recoveredOrderReference || ''}.`,
      };
    }

    let hasStockChanges = false;
    const restoredItems: CartItem[] = [];

    for (const item of found.items) {
      const product = this.products.get(item.productId);
      if (!product || !product.isActive) {
        hasStockChanges = true;
        continue;
      }

      let priceCents = product.promotionalPriceCents || product.priceCents;
      let availableStock = Math.max(0, product.onHandQuantity - product.reservedQuantity);
      let variantTitle = item.variantTitle;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          hasStockChanges = true;
          continue;
        }
        priceCents = variant.promotionalPriceCents || variant.priceCents;
        availableStock = Math.max(0, variant.onHandQuantity - variant.reservedQuantity);
        variantTitle = variant.title;
      }

      if (availableStock <= 0) {
        hasStockChanges = true;
        continue;
      }

      const quantity = Math.min(item.quantity, availableStock);
      if (quantity < item.quantity) {
        hasStockChanges = true;
      }

      restoredItems.push({
        productId: product.id,
        variantId: item.variantId,
        sku: item.sku,
        name: product.name,
        brand: product.brand,
        variantTitle,
        image: product.primaryImage,
        priceCents,
        quantity,
        availableStock,
      });
    }

    const couponCode = found.discountCode || found.recoveryIncentiveCode;
    const coupon = couponCode ? this.getCoupon(couponCode) || null : null;
    const activeSuggestedCoupon = coupon && coupon.isActive ? coupon : null;

    return {
      success: true,
      data: {
        cart: found,
        items: restoredItems,
        suggestedCoupon: activeSuggestedCoupon,
        hasStockChanges,
      },
    };
  }

  sendRecoveryReminder(params: {
    cartId: string;
    authenticatedCustomerId?: string;
    authenticatedEmail?: string;
    sessionId?: string;
    overrideEmail?: string;
    nowMs?: number;
  }): {
    success: boolean;
    statusCode?: number;
    cart?: AbandonedCart;
    recoveryUrl?: string;
    message?: string;
    error?: string;
  } {
    const cart = this.abandonedCarts.get(params.cartId);
    if (!cart) {
      return { success: false, statusCode: 404, error: 'Abandoned cart not found' };
    }

    if (
      !verifyAbandonedCartOwnership(cart, {
        authenticatedCustomerId: params.authenticatedCustomerId,
        authenticatedEmail: params.authenticatedEmail,
        sessionId: params.sessionId,
      })
    ) {
      return {
        success: false,
        statusCode: 403,
        error: 'Access denied: You can only request reminders for your own cart (Ownership check enforced).',
      };
    }

    if (cart.status === 'RECOVERED' || cart.status === 'EXPIRED') {
      return {
        success: false,
        statusCode: 400,
        error: `Cannot send reminder for cart in status ${cart.status}`,
      };
    }

    const nowMs = params.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (params.overrideEmail && params.overrideEmail.includes('@')) {
      cart.customerEmail = params.overrideEmail.trim().toLowerCase();
    }

    if (!cart.customerEmail || !cart.customerEmail.includes('@')) {
      return {
        success: false,
        statusCode: 400,
        error: 'A valid customer email address is required to send a cart recovery reminder.',
      };
    }

    if (cart.status === 'ACTIVE') {
      cart.status = 'ABANDONED';
      cart.abandonedAt = nowIso;
    }

    cart.recoveryIncentiveCode = cart.recoveryIncentiveCode || suggestRecoveryIncentiveCode(cart.subtotalCents);

    if (cart.reminderCount >= DEFAULT_MAX_REMINDERS) {
      return {
        success: false,
        statusCode: 429,
        error: `Maximum recovery reminders (${DEFAULT_MAX_REMINDERS}) already sent for this cart.`,
      };
    }

    if (!shouldSendRecoveryReminder(cart, nowMs, DEFAULT_REMINDER_COOLDOWN_MS, DEFAULT_MAX_REMINDERS)) {
      return {
        success: false,
        statusCode: 429,
        error: 'A recovery reminder was recently sent for this cart. Please wait before sending another.',
      };
    }

    cart.reminderCount += 1;
    cart.lastReminderSentAt = nowIso;
    cart.updatedAt = nowIso;
    cart.reminderHistory.push({
      reminderNumber: cart.reminderCount,
      channel: 'email',
      sentToEmail: cart.customerEmail,
      incentiveCode: cart.recoveryIncentiveCode,
      sentAt: nowIso,
    });
    this.abandonedCarts.set(cart.id, cart);

    this.recordAuditLog({
      actor: cart.customerEmail,
      role: cart.customerId ? 'customer' : 'guest',
      action: 'ABANDONED_CART_REMINDER_SENT',
      targetType: 'ABANDONED_CART',
      targetId: cart.id,
      category: 'system',
      severity: 'info',
      details: `Sent cart recovery reminder #${cart.reminderCount} to ${cart.customerEmail} with token ${cart.recoveryToken}`,
    });

    return {
      success: true,
      cart,
      recoveryUrl: `/?recover_cart=${cart.recoveryToken}`,
      message: `Recovery link emailed to ${cart.customerEmail}${cart.recoveryIncentiveCode ? ` with bonus code ${cart.recoveryIncentiveCode}` : ''}.`,
    };
  }

  dismissAbandonedCart(params: {
    cartId: string;
    authenticatedCustomerId?: string;
    authenticatedEmail?: string;
    sessionId?: string;
  }): { success: boolean; statusCode?: number; error?: string } {
    const cart = this.abandonedCarts.get(params.cartId);
    if (!cart) {
      return { success: false, statusCode: 404, error: 'Saved cart not found' };
    }

    if (
      !verifyAbandonedCartOwnership(cart, {
        authenticatedCustomerId: params.authenticatedCustomerId,
        authenticatedEmail: params.authenticatedEmail,
        sessionId: params.sessionId,
      })
    ) {
      return {
        success: false,
        statusCode: 403,
        error: 'Access denied: You can only dismiss your own saved carts.',
      };
    }

    this.abandonedCarts.delete(params.cartId);
    return { success: true };
  }
}

export const db = new Database();

