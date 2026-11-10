import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSalesAnalytics, filterOrdersByTimeframe } from './salesAnalytics';
import { Order, Product } from '../types';

const dummyProducts: Product[] = [
  {
    id: 'prod_1',
    slug: 'laptop-1',
    name: 'Mevo StudioBook Pro 16',
    sku: 'MEV-1',
    brand: 'Mevo',
    category: 'Laptops',
    tagline: 'Pro laptop',
    description: 'Pro laptop desc',
    priceCents: 3499900,
    costPriceCents: 2500000,
    primaryImage: '/img1.jpg',
    images: [],
    specifications: [],
    variants: [],
    onHandQuantity: 10,
    reservedQuantity: 0,
    lowStockThreshold: 2,
    isActive: true,
    warrantyPeriodMonths: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    slug: 'monitor-1',
    name: 'Lumina 34 QD-OLED',
    sku: 'MEV-2',
    brand: 'Lumina',
    category: 'Monitors',
    tagline: 'OLED Monitor',
    description: 'OLED Monitor desc',
    priceCents: 2199900,
    costPriceCents: 1600000,
    primaryImage: '/img2.jpg',
    images: [],
    specifications: [],
    variants: [],
    onHandQuantity: 5,
    reservedQuantity: 0,
    lowStockThreshold: 2,
    isActive: true,
    warrantyPeriodMonths: 36,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

test('Sales Analytics: resets strictly to 0 when no sales exist', () => {
  const analytics = computeSalesAnalytics([], dummyProducts, '12 Months');

  assert.equal(analytics.totalSalesCents, 0);
  assert.equal(analytics.totalSalesUSD, 0);
  assert.equal(analytics.totalOrdersCount, 0);
  assert.equal(analytics.returnsCount, 0);
  assert.equal(analytics.returnsCents, 0);
  assert.equal(analytics.hasRealSales, false);
  assert.equal(analytics.salesByLocation.length, 0);

  // All 12 monthly bars must be zero
  assert.equal(analytics.monthlyBreakdown.length, 12);
  for (const month of analytics.monthlyBreakdown) {
    assert.equal(month.incomeCents, 0);
    assert.equal(month.expenseCents, 0);
    assert.equal(month.orderCount, 0);
  }

  // Real products exist but units sold must be 0
  assert.equal(analytics.topProducts.length, 2);
  assert.equal(analytics.topProducts[0].unitsSold, 0);
  assert.equal(analytics.topProducts[0].revenueCents, 0);
  assert.equal(analytics.topProducts[0].revenueUSD, 0);
});

test('Sales Analytics: correctly aggregates real store orders and products', () => {
  const now = new Date('2026-05-15T12:00:00Z');
  const sampleOrders: Order[] = [
    {
      id: 'ord_1',
      reference: 'MEV-2026-001',
      customerEmail: 'customer1@test.co.za',
      customerName: 'Sipho Zulu',
      customerPhone: '+27 82 123 4567',
      status: 'PAID',
      items: [
        {
          productId: 'prod_1',
          sku: 'MEV-1',
          name: 'Mevo StudioBook Pro 16',
          brand: 'Mevo',
          unitPriceCents: 3499900,
          quantity: 2,
          totalCents: 6999800,
          taxCents: 913017,
        },
      ],
      subtotalCents: 6999800,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 913017,
      totalCents: 6999800,
      currency: 'ZAR',
      shippingAddress: {
        fullName: 'Sipho Zulu',
        phone: '+27 82 123 4567',
        email: 'customer1@test.co.za',
        streetAddress: '15 West Street',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
      },
      shippingMethod: { id: 'standard', name: 'Standard', description: '', priceCents: 0, estimatedDelivery: '2 days' },
      paymentMethod: 'payfast',
      paymentAttempts: [],
      statusHistory: [],
      createdAt: '2026-05-10T10:00:00Z',
      updatedAt: '2026-05-10T10:05:00Z',
    },
    {
      id: 'ord_2',
      reference: 'MEV-2026-002',
      customerEmail: 'customer2@test.co.za',
      customerName: 'Nadia Botha',
      customerPhone: '+27 83 987 6543',
      status: 'REFUNDED',
      items: [],
      subtotalCents: 2199900,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 286943,
      totalCents: 2199900,
      currency: 'ZAR',
      shippingAddress: {
        fullName: 'Nadia Botha',
        phone: '+27 83 987 6543',
        email: 'customer2@test.co.za',
        streetAddress: '4 Kloof Road',
        suburb: 'Camps Bay',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8005',
      },
      shippingMethod: { id: 'standard', name: 'Standard', description: '', priceCents: 0, estimatedDelivery: '2 days' },
      paymentMethod: 'ozow',
      paymentAttempts: [],
      statusHistory: [],
      createdAt: '2026-05-12T14:00:00Z',
      updatedAt: '2026-05-12T15:00:00Z',
    },
  ];

  const analytics = computeSalesAnalytics(sampleOrders, dummyProducts, '12 Months', now);

  assert.equal(analytics.totalSalesCents, 6999800);
  assert.equal(analytics.totalOrdersCount, 1);
  assert.equal(analytics.returnsCount, 1);
  assert.equal(analytics.returnsCents, 2199900);
  assert.equal(analytics.hasRealSales, true);

  // May is month index 4
  const mayData = analytics.monthlyBreakdown[4];
  assert.equal(mayData.incomeCents, 6999800);
  assert.equal(mayData.orderCount, 1);

  // Top products
  assert.equal(analytics.topProducts[0].id, 'prod_1');
  assert.equal(analytics.topProducts[0].unitsSold, 2);
  assert.equal(analytics.topProducts[0].revenueCents, 6999800);

  // Location
  assert.equal(analytics.salesByLocation.length, 1);
  assert.equal(analytics.salesByLocation[0].location, 'Gauteng');
  assert.equal(analytics.salesByLocation[0].percentage, 100);
});

test('Sales Analytics: time filtering correctly filters orders within window', () => {
  const now = new Date('2026-05-20T12:00:00Z');
  const recentOrder: any = { createdAt: '2026-05-20T02:00:00Z' }; // 10 hours ago (within 24 hours)
  const olderOrder: any = { createdAt: '2026-05-01T10:00:00Z' }; // 19 days ago

  const orders = [recentOrder, olderOrder];

  const in24h = filterOrdersByTimeframe(orders, '24 hours', now);
  assert.equal(in24h.length, 1);


  const in7d = filterOrdersByTimeframe(orders, '7 days', now);
  assert.equal(in7d.length, 1);

  const in30d = filterOrdersByTimeframe(orders, '30 days', now);
  assert.equal(in30d.length, 2);
});
