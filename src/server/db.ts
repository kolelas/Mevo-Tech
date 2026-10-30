import {
  AuditLogEntry,
  CouponDiscount,
  CustomerAccount,
  Order,
  OrderStatus,
  PaymentAttempt,
  Product,
  ProductReview,
  PromotionalBanner,
  ShippingMethod,
  StockMovement,
  StockReservation,
  StoreSettings,
  User,
} from '../types';
import { canTransitionOrderStatus } from '../utils/calculations';

// Global in-memory transactional database state with automatic reservation expiry check
class Database {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private reservations: Map<string, StockReservation> = new Map();
  private stockMovements: StockMovement[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private users: Map<string, User> = new Map();
  private customers: Map<string, { account: CustomerAccount; password: string }> = new Map();
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

    this.seedUsers();
    this.seedCoupons();
    this.seedPromotions();
    this.seedProducts();
    this.seedCustomers();
    this.seedReviews();
    this.seedCustomerOrders();

    // Start background reservation expiration cleanup every 30 seconds
    setInterval(() => this.reapExpiredReservations(), 30000);
  }

  private seedUsers() {
    const defaultUsers: User[] = [
      {
        id: 'usr_owner',
        email: 'owner@mevotech.co.za',
        name: 'Mevo Executive Admin',
        role: 'owner',
        phone: '+27 82 555 0100',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_fulfilment',
        email: 'fulfilment@mevotech.co.za',
        name: 'Warehouse Operations',
        role: 'fulfilment_manager',
        phone: '+27 82 555 0101',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_customer',
        email: 'blacquebeat@gmail.com',
        name: 'Valued Customer',
        role: 'customer',
        phone: '+27 83 456 7890',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const u of defaultUsers) {
      this.users.set(u.id, u);
    }
  }

  private seedCustomers() {
    const defaultCustomer: CustomerAccount = {
      id: 'cust_blacquebeat',
      email: 'blacquebeat@gmail.com',
      name: 'Blacque Beat',
      phone: '+27 83 456 7890',
      role: 'customer',
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
      createdAt: '2026-01-15T08:00:00Z',
    };

    this.customers.set(defaultCustomer.id, {
      account: defaultCustomer,
      password: 'Password@2026',
    });

    const shopperDemo: CustomerAccount = {
      id: 'cust_shopper_demo',
      email: 'shopper@mevotech.co.za',
      name: 'Valued SA Shopper',
      phone: '+27 82 555 0100',
      role: 'customer',
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
      createdAt: '2026-02-01T08:00:00Z',
    };

    this.customers.set(shopperDemo.id, {
      account: shopperDemo,
      password: 'Password@2026',
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
        code: 'MEVOSPRING',
        type: 'PERCENTAGE',
        value: 10,
        minOrderCents: 100000, // R1,000 minimum
        description: '10% discount on tech orders over R1,000.00',
        isActive: true,
      },
      {
        code: 'FIRSTTECH',
        type: 'FIXED_CENTS',
        value: 25000, // R250.00 off
        minOrderCents: 200000, // R2,000 minimum
        description: 'R250.00 off orders over R2,000.00',
        isActive: true,
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

  createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, performedBy: string): Product {
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const product: Product = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(id, product);

    this.recordAuditLog({
      actor: performedBy,
      role: 'admin',
      action: 'CREATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: id,
      details: `Created product "${product.name}" with SKU ${product.sku} and initial stock ${product.onHandQuantity}`,
    });

    if (product.onHandQuantity > 0) {
      this.stockMovements.push({
        id: `mov_${Date.now()}`,
        productId: id,
        sku: product.sku,
        type: 'RECEIPT',
        quantityChange: product.onHandQuantity,
        previousOnHand: 0,
        newOnHand: product.onHandQuantity,
        reason: 'Product creation initial stock',
        performedBy,
        timestamp: now,
      });
    }

    return product;
  }

  updateProduct(id: string, updates: Partial<Product>, performedBy: string): Product {
    const existing = this.products.get(id);
    if (!existing) {
      throw new Error(`Product not found: ${id}`);
    }

    const updated: Product = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, updated);

    this.recordAuditLog({
      actor: performedBy,
      role: 'admin',
      action: 'UPDATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: id,
      details: `Updated product properties for "${updated.name}" (${updated.sku})`,
    });

    return updated;
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

  /**
   * Manual inventory adjustment with mandatory audit logging.
   */
  adjustInventory(params: {
    productId: string;
    variantId?: string;
    quantityChange: number;
    reason: string;
    performedBy: string;
  }): { success: boolean; newOnHand: number } {
    const product = this.products.get(params.productId);
    if (!product) throw new Error('Product not found');

    const prevOnHand = product.onHandQuantity;
    const newOnHand = Math.max(0, prevOnHand + params.quantityChange);
    product.onHandQuantity = newOnHand;

    if (params.variantId) {
      const variant = product.variants.find((v) => v.id === params.variantId);
      if (variant) {
        variant.onHandQuantity = Math.max(0, variant.onHandQuantity + params.quantityChange);
      }
    }

    const now = new Date().toISOString();
    this.stockMovements.push({
      id: `mov_adj_${Date.now()}`,
      productId: product.id,
      variantId: params.variantId,
      sku: product.sku,
      type: 'ADJUSTMENT',
      quantityChange: params.quantityChange,
      previousOnHand: prevOnHand,
      newOnHand,
      reason: params.reason,
      performedBy: params.performedBy,
      timestamp: now,
    });

    this.recordAuditLog({
      actor: params.performedBy,
      role: 'inventory_manager',
      action: 'STOCK_ADJUSTMENT',
      targetType: 'PRODUCT',
      targetId: product.id,
      details: `Stock adjusted by ${params.quantityChange > 0 ? '+' : ''}${params.quantityChange}. New on-hand: ${newOnHand}. Reason: ${params.reason}`,
    });

    return { success: true, newOnHand };
  }

  getStockMovements(productId?: string): StockMovement[] {
    if (productId) {
      return this.stockMovements.filter((m) => m.productId === productId);
    }
    return [...this.stockMovements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ---- Orders & Fulfilment ----

  createOrder(order: Order): Order {
    this.orders.set(order.reference, order);
    this.recordAuditLog({
      actor: order.customerEmail,
      role: 'customer',
      action: 'CREATE_ORDER',
      targetType: 'ORDER',
      targetId: order.reference,
      details: `Created order ${order.reference} totaling R ${(order.totalCents / 100).toFixed(2)} with payment method ${order.paymentMethod}`,
    });
    return order;
  }

  getOrderByReference(reference: string): Order | undefined {
    return this.orders.get(reference);
  }

  getOrders(filters?: { status?: OrderStatus; search?: string }): Order[] {
    let list = Array.from(this.orders.values());
    if (filters?.status) {
      list = list.filter((o) => o.status === filters.status);
    }
    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.reference.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    }

    this.recordAuditLog({
      actor: updatedBy,
      role: 'admin',
      action: 'ORDER_STATUS_UPDATE',
      targetType: 'ORDER',
      targetId: reference,
      details: `Order status changed from ${prevStatus} to ${nextStatus}. Note: ${note}`,
    });

    return { success: true, order };
  }

  updateOrderTracking(params: {
    reference: string;
    courierName: string;
    trackingNumber: string;
    trackingUrl?: string;
    performedBy: string;
  }): { success: boolean; order?: Order; error?: string } {
    const order = this.orders.get(params.reference);
    if (!order) return { success: false, error: 'Order not found' };

    order.courierName = params.courierName;
    order.trackingNumber = params.trackingNumber;
    order.trackingUrl = params.trackingUrl || `https://thecourierguy.co.za/tracking?waybill=${params.trackingNumber}`;
    order.dispatchedAt = new Date().toISOString();
    order.updatedAt = order.dispatchedAt;

    if (order.status === 'PROCESSING' || order.status === 'PAID') {
      this.updateOrderStatus(
        params.reference,
        'SHIPPED',
        `Dispatched via ${params.courierName} (Waybill: ${params.trackingNumber})`,
        params.performedBy
      );
    }

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

  updateSettings(updates: Partial<StoreSettings>, performedBy: string): StoreSettings {
    this.settings = { ...this.settings, ...updates };
    this.recordAuditLog({
      actor: performedBy,
      role: 'owner',
      action: 'UPDATE_SETTINGS',
      targetType: 'SETTINGS',
      targetId: 'GLOBAL',
      details: 'Updated store configuration parameters',
    });
    return { ...this.settings };
  }

  getShippingMethods(): ShippingMethod[] {
    return [...this.shippingMethods];
  }

  getCoupon(code: string): CouponDiscount | undefined {
    return this.coupons.get(code.toUpperCase());
  }

  // ---- Audit Trail ----

  private recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    this.auditLogs.unshift({
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    });
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].slice(0, 100);
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

  getAllPromotionalBanners(): PromotionalBanner[] {
    return Array.from(this.promotionalBanners.values());
  }

  createPromotionalBanner(data: Omit<PromotionalBanner, 'id'>, performedBy: string): PromotionalBanner {
    const id = `promo_${Date.now()}`;
    const banner: PromotionalBanner = { ...data, id };
    this.promotionalBanners.set(id, banner);

    this.recordAuditLog({
      actor: performedBy,
      role: 'admin',
      action: 'CREATE_PROMOTION',
      targetType: 'PROMOTION',
      targetId: id,
      details: `Created promotional banner "${banner.title}" (Ends: ${banner.endsAt})`,
    });

    return banner;
  }

  updatePromotionalBanner(id: string, updates: Partial<PromotionalBanner>, performedBy: string): PromotionalBanner {
    const existing = this.promotionalBanners.get(id);
    if (!existing) throw new Error(`Promotion not found: ${id}`);

    const updated = { ...existing, ...updates };
    this.promotionalBanners.set(id, updated);

    this.recordAuditLog({
      actor: performedBy,
      role: 'admin',
      action: 'UPDATE_PROMOTION',
      targetType: 'PROMOTION',
      targetId: id,
      details: `Updated promotional banner "${updated.title}"`,
    });

    return updated;
  }

  // ---- Admin Dashboard Metrics ----

  getDashboardMetrics(): {
    totalSalesCents: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
    averageOrderValueCents: number;
    lowStockCount: number;
    totalProductsCount: number;
    recentOrders: Order[];
  } {
    const orders = Array.from(this.orders.values());
    const paidOrders = orders.filter((o) => o.status === 'PAID' || o.status === 'PROCESSING' || o.status === 'SHIPPED' || o.status === 'DELIVERED');
    const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT');

    const totalSalesCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
    const paidOrdersCount = paidOrders.length;
    const averageOrderValueCents = paidOrdersCount > 0 ? Math.round(totalSalesCents / paidOrdersCount) : 0;

    const allProducts = Array.from(this.products.values());
    const lowStockCount = allProducts.filter((p) => p.onHandQuantity - p.reservedQuantity <= p.lowStockThreshold).length;

    return {
      totalSalesCents,
      paidOrdersCount,
      pendingOrdersCount: pendingOrders.length,
      averageOrderValueCents,
      lowStockCount,
      totalProductsCount: allProducts.length,
      recentOrders: orders.slice(0, 8),
    };
  }

  // ---- Customer Accounts & Authentication ----

  registerCustomer(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: any;
  }): { success: boolean; customer?: CustomerAccount; error?: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        return { success: false, error: 'An account with this email address already exists' };
      }
    }

    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: CustomerAccount = {
      id,
      name: params.name.trim(),
      email: cleanEmail,
      phone: params.phone?.trim() || '+27 82 000 0000',
      role: 'customer',
      favourites: [],
      defaultAddress: params.address,
      createdAt: new Date().toISOString(),
    };

    this.customers.set(id, {
      account: newCustomer,
      password: params.password,
    });

    return { success: true, customer: newCustomer };
  }

  authenticateCustomer(
    email: string,
    passwordAttempt: string
  ): { success: boolean; customer?: CustomerAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    for (const record of this.customers.values()) {
      if (record.account.email.toLowerCase() === cleanEmail) {
        if (record.password === passwordAttempt.trim()) {
          return { success: true, customer: record.account };
        }
        return { success: false, error: 'Incorrect password entered' };
      }
    }

    return { success: false, error: 'No customer account found with this email' };
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

    const updatedAccount: CustomerAccount = {
      ...record.account,
      ...updates,
      id: record.account.id,
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
}

export const db = new Database();
