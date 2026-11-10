import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAddToCompare,
  areValuesDifferent,
  extractSpecGroups,
  extractKeyAttributes,
  MAX_COMPARE_PRODUCTS,
} from './comparison';
import { Product } from '../types';

const mockProductA: Product = {
  id: 'prod_1',
  slug: 'laptop-pro',
  name: 'Mevo StudioBook Pro 16',
  sku: 'MEV-NB-16PRO',
  brand: 'Mevo Precision',
  category: 'Laptops & Notebooks',
  tagline: 'High-power 16-inch creator laptop',
  description: 'Fast laptop',
  priceCents: 3899900,
  promotionalPriceCents: 3499900,
  costPriceCents: 2700000,
  primaryImage: '/test1.jpg',
  images: ['/test1.jpg'],
  specifications: [
    { group: 'Processor', name: 'CPU', value: 'Intel Core Ultra 9' },
    { group: 'Display', name: 'Panel', value: '16.0" 3.2K OLED 120Hz' },
    { group: 'Memory & Storage', name: 'RAM', value: '32GB LPDDR5X' },
  ],
  variants: [],
  onHandQuantity: 10,
  reservedQuantity: 2,
  lowStockThreshold: 3,
  isActive: true,
  warrantyPeriodMonths: 24,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockProductB: Product = {
  ...mockProductA,
  id: 'prod_2',
  slug: 'laptop-aero',
  name: 'Mevo AeroBook Ultra 14',
  sku: 'MEV-NB-14AERO',
  priceCents: 2499900,
  promotionalPriceCents: undefined,
  specifications: [
    { group: 'Processor', name: 'CPU', value: 'Intel Core Ultra 7' },
    { group: 'Display', name: 'Panel', value: '14.0" 2.8K OLED 120Hz' },
    { group: 'Memory & Storage', name: 'RAM', value: '32GB LPDDR5X' }, // Identical to A
  ],
  warrantyPeriodMonths: 24,
};

const mockProductC: Product = {
  ...mockProductA,
  id: 'prod_3',
  slug: 'monitor-oled',
  name: 'Lumina 34" Curved OLED',
  sku: 'MEV-MON-34OLED',
  category: 'Monitors & Displays',
  specifications: [
    { group: 'Display', name: 'Panel', value: '34" QD-OLED UWQHD 175Hz' },
  ],
};

const mockProductD: Product = {
  ...mockProductA,
  id: 'prod_4',
  name: 'Apex Workstation',
};

test('canAddToCompare: enforces maximum of 3 products', () => {
  const current: Product[] = [mockProductA, mockProductB];
  
  // Adding 3rd product is allowed
  const thirdCheck = canAddToCompare(current, mockProductC, MAX_COMPARE_PRODUCTS);
  assert.equal(thirdCheck.allowed, true);

  // Trying to add 4th product when 3 are already in comparison fails
  const fullList = [mockProductA, mockProductB, mockProductC];
  const fourthCheck = canAddToCompare(fullList, mockProductD, MAX_COMPARE_PRODUCTS);
  assert.equal(fourthCheck.allowed, false);
  assert.equal(fourthCheck.reason, 'MAX_LIMIT_REACHED');
});

test('canAddToCompare: prevents adding duplicate products', () => {
  const current: Product[] = [mockProductA];
  const duplicateCheck = canAddToCompare(current, mockProductA);
  assert.equal(duplicateCheck.allowed, false);
  assert.equal(duplicateCheck.reason, 'ALREADY_EXISTS');
});

test('areValuesDifferent: correctly detects differences', () => {
  assert.equal(areValuesDifferent(['32GB', '32GB']), false);
  assert.equal(areValuesDifferent(['32gb ', ' 32GB']), false);
  assert.equal(areValuesDifferent(['32GB', '16GB']), true);
  assert.equal(areValuesDifferent(['32GB', '—']), true);
  assert.equal(areValuesDifferent(['OnlyOne']), false);
});

test('extractSpecGroups: accurately groups and flags differences across products', () => {
  const groups = extractSpecGroups([mockProductA, mockProductB]);

  // RAM is identical (32GB vs 32GB), CPU is different (Ultra 9 vs Ultra 7)
  const procGroup = groups.find((g) => g.groupName === 'Processor');
  assert.ok(procGroup);
  const cpuRow = procGroup.rows.find((r) => r.name === 'CPU');
  assert.ok(cpuRow);
  assert.equal(cpuRow.isDifferent, true);
  assert.equal(cpuRow.values['prod_1'], 'Intel Core Ultra 9');
  assert.equal(cpuRow.values['prod_2'], 'Intel Core Ultra 7');

  const memGroup = groups.find((g) => g.groupName === 'Memory & Storage');
  assert.ok(memGroup);
  const ramRow = memGroup.rows.find((r) => r.name === 'RAM');
  assert.ok(ramRow);
  assert.equal(ramRow.isDifferent, false); // Identical values
});

test('extractSpecGroups: handles missing specs with fallback placeholder', () => {
  // Product C has no Processor group
  const groups = extractSpecGroups([mockProductA, mockProductC]);
  const procGroup = groups.find((g) => g.groupName === 'Processor');
  assert.ok(procGroup);
  const cpuRow = procGroup.rows.find((r) => r.name === 'CPU');
  assert.ok(cpuRow);
  assert.equal(cpuRow.values['prod_1'], 'Intel Core Ultra 9');
  assert.equal(cpuRow.values['prod_3'], '—');
  assert.equal(cpuRow.isDifferent, true);
});

test('extractKeyAttributes: formats general product attributes', () => {
  const fakeFormat = (cents: number) => `R ${(cents / 100).toFixed(2)}`;
  const attrs = extractKeyAttributes([mockProductA, mockProductB], fakeFormat);

  const priceAttr = attrs.find((a) => a.key === 'price');
  assert.ok(priceAttr);
  assert.equal(priceAttr.values['prod_1'], 'R 34999.00'); // promotional price
  assert.equal(priceAttr.values['prod_2'], 'R 24999.00');
  assert.equal(priceAttr.isDifferent, true);

  const warrantyAttr = attrs.find((a) => a.key === 'warranty');
  assert.ok(warrantyAttr);
  assert.equal(warrantyAttr.isDifferent, false); // Both 24 months
});
