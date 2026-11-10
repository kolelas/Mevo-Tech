import { Order, Product } from '../types';

export interface MonthlySalesPoint {
  month: string;      // e.g. "Jan", "Feb"
  monthIndex: number; // 0-11
  incomeCents: number;
  expenseCents: number;
  orderCount: number;
}

export interface ProductSalesStat {
  id: string;
  name: string;
  image: string;
  category: string;
  unitsSold: number;
  revenueCents: number;
  revenueUSD: number;
  stockStatus: string;
  locationName: string;
}

export interface LocationSalesStat {
  location: string;
  percentage: number;
  revenueCents: number;
  orderCount: number;
}

export interface SalesAnalyticsSummary {
  totalSalesCents: number;
  totalSalesUSD: number;
  totalOrdersCount: number;
  returnsCount: number;
  returnsCents: number;
  monthlyBreakdown: MonthlySalesPoint[];
  topProducts: ProductSalesStat[];
  salesByLocation: LocationSalesStat[];
  hasRealSales: boolean;
}

export const ZAR_TO_USD_RATE = 18.25;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Filters orders by specified timeframe: '12 Months', '30 days', '7 days', '24 hours'
 */
export function filterOrdersByTimeframe(orders: Order[], timeframe: string = '12 Months', now: Date = new Date()): Order[] {
  const nowMs = now.getTime();
  let windowMs: number;

  switch (timeframe) {
    case '24 hours':
      windowMs = 24 * 60 * 60 * 1000;
      break;
    case '7 days':
      windowMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case '30 days':
      windowMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case '12 Months':
    default:
      windowMs = 365 * 24 * 60 * 60 * 1000;
      break;
  }

  return orders.filter((order) => {
    const orderTime = new Date(order.createdAt).getTime();
    return !isNaN(orderTime) && nowMs - orderTime <= windowMs;
  });
}

/**
 * Computes authoritative sales overview analytics from actual store orders and products.
 * If there are no sales or orders are empty, all figures reset strictly to 0.
 */
export function computeSalesAnalytics(
  allOrders: Order[],
  allProducts: Product[],
  timeframe: string = '12 Months',
  now: Date = new Date()
): SalesAnalyticsSummary {
  const filteredOrders = filterOrdersByTimeframe(allOrders, timeframe, now);

  // Initialize monthly dual-bar points (Jan - Dec)
  const monthlyMap = new Map<number, { income: number; expense: number; count: number }>();
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(i, { income: 0, expense: 0, count: 0 });
  }

  let totalSalesCents = 0;
  let returnsCount = 0;
  let returnsCents = 0;
  let validOrderCount = 0;

  // Track product stats: productId -> { unitsSold, revenueCents }
  const productStatsMap = new Map<string, { unitsSold: number; revenueCents: number }>();

  // Track location stats: location -> { revenueCents, count }
  const locationStatsMap = new Map<string, { revenueCents: number; count: number }>();

  for (const order of filteredOrders) {
    const isPaid = order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED';
    const isReturned = order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED' || order.status === 'REFUND_PENDING';

    if (isReturned) {
      returnsCount += 1;
      returnsCents += order.totalCents || 0;
    }

    if (isPaid) {
      validOrderCount += 1;
      totalSalesCents += order.totalCents || 0;

      // Group by month
      const orderDate = new Date(order.createdAt);
      const monthIdx = orderDate.getMonth();
      const currentMonth = monthlyMap.get(monthIdx) || { income: 0, expense: 0, count: 0 };
      currentMonth.income += order.totalCents || 0;
      // Estimate operating/fulfilment costs as ~35% of total
      currentMonth.expense += Math.round((order.totalCents || 0) * 0.35);
      currentMonth.count += 1;
      monthlyMap.set(monthIdx, currentMonth);

      // Track product sales from order items
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const prev = productStatsMap.get(item.productId) || { unitsSold: 0, revenueCents: 0 };
          prev.unitsSold += item.quantity || 1;
          prev.revenueCents += item.totalCents || (item.unitPriceCents * item.quantity);
          productStatsMap.set(item.productId, prev);
        }
      }

      // Group by delivery / store location
      const province = order.shippingAddress?.province || order.shippingAddress?.city || 'Gauteng';
      const cleanLoc = province.trim();
      const prevLoc = locationStatsMap.get(cleanLoc) || { revenueCents: 0, count: 0 };
      prevLoc.revenueCents += order.totalCents || 0;
      prevLoc.count += 1;
      locationStatsMap.set(cleanLoc, prevLoc);
    }
  }

  // Monthly breakdown array
  const monthlyBreakdown: MonthlySalesPoint[] = MONTH_NAMES.map((month, idx) => {
    const data = monthlyMap.get(idx) || { income: 0, expense: 0, count: 0 };
    return {
      month,
      monthIndex: idx,
      incomeCents: data.income,
      expenseCents: data.expense,
      orderCount: data.count,
    };
  });

  // Top products list mapped to actual store catalog
  const topProducts: ProductSalesStat[] = allProducts.map((p) => {
    const stat = productStatsMap.get(p.id) || { unitsSold: 0, revenueCents: 0 };
    return {
      id: p.id,
      name: p.name,
      image: p.primaryImage || '/src/assets/images/hero_tech_showcase_1793053698167.jpg',
      category: p.category,
      unitsSold: stat.unitsSold,
      revenueCents: stat.revenueCents,
      revenueUSD: Number((stat.revenueCents / 100 / ZAR_TO_USD_RATE).toFixed(2)),
      stockStatus: p.onHandQuantity > p.lowStockThreshold ? 'In Stock' : (p.onHandQuantity > 0 ? 'Low Stock' : 'Out of Stock'),
      locationName: 'Sandton Tech Hub',
    };
  });

  // Sort by revenue desc
  topProducts.sort((a, b) => b.revenueCents - a.revenueCents);

  // Locations breakdown
  const salesByLocation: LocationSalesStat[] = [];
  if (totalSalesCents > 0) {
    locationStatsMap.forEach((val, loc) => {
      const percentage = Math.round((val.revenueCents / totalSalesCents) * 100);
      salesByLocation.push({
        location: loc,
        percentage,
        revenueCents: val.revenueCents,
        orderCount: val.count,
      });
    });
    salesByLocation.sort((a, b) => b.revenueCents - a.revenueCents);
  }

  const totalSalesUSD = Number((totalSalesCents / 100 / ZAR_TO_USD_RATE).toFixed(2));

  return {
    totalSalesCents,
    totalSalesUSD,
    totalOrdersCount: validOrderCount,
    returnsCount,
    returnsCents,
    monthlyBreakdown,
    topProducts,
    salesByLocation,
    hasRealSales: totalSalesCents > 0,
  };
}
