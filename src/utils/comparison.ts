import { Product, ProductSpecification } from '../types';

export const MAX_COMPARE_PRODUCTS = 3;

export interface SpecRow {
  name: string;
  values: Record<string, string>; // productId -> formatted spec value or "—"
  isDifferent: boolean;
}

export interface SpecGroupComparison {
  groupName: string;
  rows: SpecRow[];
  hasAnyDifference: boolean;
}

export interface GeneralAttributeRow {
  key: string;
  label: string;
  values: Record<string, string>;
  isDifferent: boolean;
}

/**
 * Checks if a product can be added to the current comparison list.
 */
export function canAddToCompare(
  currentProducts: Product[],
  candidate: Product,
  maxItems: number = MAX_COMPARE_PRODUCTS
): { allowed: boolean; reason?: 'ALREADY_EXISTS' | 'MAX_LIMIT_REACHED' } {
  if (currentProducts.some((p) => p.id === candidate.id)) {
    return { allowed: false, reason: 'ALREADY_EXISTS' };
  }
  if (currentProducts.length >= maxItems) {
    return { allowed: false, reason: 'MAX_LIMIT_REACHED' };
  }
  return { allowed: true };
}

/**
 * Determines whether the given array of strings contains more than one distinct non-empty value.
 */
export function areValuesDifferent(values: string[]): boolean {
  if (values.length <= 1) return false;
  const first = values[0].trim().toLowerCase();
  return values.some((v) => v.trim().toLowerCase() !== first);
}

/**
 * Normalizes and groups technical specifications from up to 3 products into a clean matrix.
 */
export function extractSpecGroups(products: Product[]): SpecGroupComparison[] {
  if (!products || products.length === 0) return [];

  // Group order priority
  const groupPriorityOrder = [
    'Processor',
    'Display',
    'Graphics & Video',
    'Memory & Storage',
    'RAM',
    'Storage',
    'Connectivity',
    'Battery & Power',
    'Battery',
    'Build & Dimensions',
    'Switches & Keys',
    'Performance & Speed',
    'General & Warranty',
  ];

  // 1. Collect all distinct groups preserving order
  const discoveredGroups: string[] = [];
  products.forEach((p) => {
    (p.specifications || []).forEach((spec) => {
      const g = spec.group ? spec.group.trim() : 'General';
      if (!discoveredGroups.includes(g)) {
        discoveredGroups.push(g);
      }
    });
  });

  // Sort groups by priority order, then alphabetically for unknowns
  discoveredGroups.sort((a, b) => {
    const idxA = groupPriorityOrder.indexOf(a);
    const idxB = groupPriorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // 2. Build rows for each group
  return discoveredGroups
    .map((groupName) => {
      // Find all unique spec names in this group across all products
      const specNames: string[] = [];
      products.forEach((p) => {
        (p.specifications || []).forEach((spec) => {
          const g = spec.group ? spec.group.trim() : 'General';
          if (g.toLowerCase() === groupName.toLowerCase()) {
            const name = spec.name.trim();
            if (!specNames.includes(name)) {
              specNames.push(name);
            }
          }
        });
      });

      const rows: SpecRow[] = specNames.map((name) => {
        const values: Record<string, string> = {};
        const rawValues: string[] = [];

        products.forEach((p) => {
          const match = (p.specifications || []).find(
            (s) =>
              (s.group ? s.group.trim().toLowerCase() : 'general') === groupName.toLowerCase() &&
              s.name.trim().toLowerCase() === name.toLowerCase()
          );
          const val = match && match.value ? match.value.trim() : '—';
          values[p.id] = val;
          rawValues.push(val);
        });

        const isDifferent = areValuesDifferent(rawValues);

        return {
          name,
          values,
          isDifferent,
        };
      });

      const hasAnyDifference = rows.some((r) => r.isDifferent);

      return {
        groupName,
        rows,
        hasAnyDifference,
      };
    })
    .filter((group) => group.rows.length > 0);
}

/**
 * Extracts top-level key comparative product attributes (Brand, Category, Price, Warranty, Stock).
 */
export function extractKeyAttributes(
  products: Product[],
  formatPrice: (cents: number) => string
): GeneralAttributeRow[] {
  if (!products || products.length === 0) return [];

  const attributes = [
    {
      key: 'brand',
      label: 'Brand & Line',
      getValue: (p: Product) => p.brand || 'Mevo',
    },
    {
      key: 'category',
      label: 'Category',
      getValue: (p: Product) => (p.subCategory ? `${p.category} › ${p.subCategory}` : p.category),
    },
    {
      key: 'price',
      label: 'Current Selling Price',
      getValue: (p: Product) => formatPrice(p.promotionalPriceCents || p.priceCents),
    },
    {
      key: 'warranty',
      label: 'South African Warranty',
      getValue: (p: Product) =>
        p.warrantyPeriodMonths
          ? `${p.warrantyPeriodMonths} Months On-Site (Sandton Depot)`
          : '12 Months Standard Depot',
    },
    {
      key: 'stock',
      label: 'Availability',
      getValue: (p: Product) => {
        const available = p.onHandQuantity - (p.reservedQuantity || 0);
        if (available <= 0) return 'Out of Stock';
        if (available <= (p.lowStockThreshold || 3)) return `Low Stock (${available} units left)`;
        return `In Stock (${available} units available)`;
      },
    },
  ];

  return attributes.map((attr) => {
    const values: Record<string, string> = {};
    const rawValues: string[] = [];

    products.forEach((p) => {
      const val = attr.getValue(p);
      values[p.id] = val;
      rawValues.push(val);
    });

    return {
      key: attr.key,
      label: attr.label,
      values,
      isDifferent: areValuesDifferent(rawValues),
    };
  });
}
